# Realtime analysis metrics reference

This document explains the columns produced by
`export_realtime_metrics_csv.py` and `export_all_realtime_metrics_csv.py`.
The measurements describe execution time and Gemini token usage for each
cumulative realtime-analysis checkpoint. They do not measure the clinical
quality or correctness of the generated guidance.

## What one CSV row represents

One row is one call to the realtime `analyze_segment` pipeline.

The `step` value is the number of normalized conversation turns included in
that call. The input is cumulative. For example:

- step 1 analyzes turn 1;
- step 2 analyzes turns 1–2;
- step 100 analyzes turns 1–100.

Therefore, token counts are the usage for the complete request at that step,
not the additional tokens introduced since the preceding step. With
`--checkpoint-every-turns 1`, every turn has a row. With a larger checkpoint
stride, `step` remains the cumulative turn number and may jump between rows.

For the 50-dialogue experiment, the selected dialogues contain 981 normalized
turns, so each completed pathway should have 981 rows.

## Pipeline timing model

A simplified single-attempt request looks like this:

```text
request starts
  ├─ request parsing, transcript formatting, and safety scanning
  ├─ RAG prefetch
  ├─ prompt assembly
  ├─ Gemini request
  │    ├─ prompt processing, queueing, and model thinking → first text token
  │    └─ streamed completion after the first text token
  └─ JSON parsing and response serialization
request ends
```

The backend can make more than one Gemini attempt when it retries or uses its
fallback prompt. Consequently, the stage values are not always additive.

All latency values are wall-clock durations in milliseconds, measured with a
monotonic high-resolution clock and rounded to the nearest millisecond.

## CSV columns

| Column | Meaning | Calculation |
|---|---|---|
| `step` | Cumulative number of transcript turns sent to the pipeline. | The final turn index of the checkpoint. |
| `request_latency_ms` | Total time observed by the experiment runner for the analysis call. | `client response received − client request started`. In service mode this includes local HTTP encoding, transport, server work, and response decoding. In-process mode uses Flask's local test boundary and has no real network hop. |
| `rag_prefetch_latency_ms` | Time spent in the backend's complete RAG-prefetch operation. | `prefetch returned − prefetch started`. This includes cache checks and concurrent datastore searches. It is not the sum of individual datastore durations. Available only with in-process instrumentation. |
| `prompt_assembly_latency_ms` | Local interval between RAG completion and the first Gemini model call. | `first model call started − RAG prefetch ended`. It mainly covers construction of RAG/prompt text and Gemini request objects. Available only in-process. |
| `prompt_processing_and_thinking_latency_ms` | Time to first text token (TTFT) for the first observed Gemini attempt. | `first text-bearing stream chunk received − model request started`. It combines API/network latency, service queueing, prompt ingestion, and any hidden or explicit model thinking before visible output. These components cannot be separated with the current API. |
| `completion_latency_ms` | Observable generation time after the first text token for the first observed Gemini attempt. | `model stream ended − first text-bearing stream chunk received`. Blank when no text token was observed. |
| `model_latency_ms` | Total observed Gemini model time for the step. | Sum of `model request ended − model request started` across all captured attempts. This includes fallback/retry attempts in instrumented mode. In service mode, only the single model diagnostic attached to the selected backend response is available. |
| `prompt_tokens` | Tokens Gemini counted in the selected request input. | Gemini `prompt_token_count`. This includes the prompt template, cumulative transcript, injected RAG context, safety context, and previous-alert context—not only the transcript. |
| `completion_tokens` | Tokens in the model's candidate response. | Gemini `candidates_token_count`. This normally represents visible/generated response tokens and excludes thinking tokens. |
| `thinking_tokens` | Tokens used for internal model reasoning when reported. | Gemini `thoughts_token_count`. The realtime configuration does not request a fixed thinking budget, but the model can still report implicit thinking tokens. |
| `total_tokens` | Gemini's authoritative total usage for the selected attempt. | Gemini `total_token_count`. Use this value instead of assuming it always equals a simple sum of the other columns. |
| `cached_tokens` | Prompt tokens served from Gemini context caching when reported. | Gemini `cached_content_token_count`. Cached tokens are part of the prompt usage; they are not extra tokens to add to `total_tokens`. |

The combined `all_realtime_metrics.csv` has one additional column:

| Column | Meaning |
|---|---|
| `result` | Relative directory of the source report, such as `service` or `in_process`. It identifies which pathway produced the row. |

## How the latency measurements relate

For a normal one-attempt in-process call, these relationships should be
approximately true:

```text
model_latency_ms
  ≈ prompt_processing_and_thinking_latency_ms + completion_latency_ms

request_latency_ms
  ≥ rag_prefetch_latency_ms + prompt_assembly_latency_ms + model_latency_ms
```

They will not match exactly because the total request also includes transcript
formatting, safety scanning, cache handling, JSON parsing, Flask/HTTP overhead,
response serialization, Python scheduling, and millisecond rounding.

If the backend makes a fallback attempt:

- `request_latency_ms` covers all work and all attempts;
- `model_latency_ms` is the sum of every captured model attempt in in-process
  mode;
- TTFT and completion latency currently describe the first observed attempt;
- the exported token counters come from the `_diagnostics` attached to the
  selected backend response and are not guaranteed to sum token use across
  discarded attempts.

Because of this retry behavior, do not calculate unmeasured retry token cost by
subtracting or combining the stage columns.

## Service versus in-process measurements

Both pathways execute the real therapy-analysis handler and make real Google
RAG/Gemini requests. `in_process` does not mean mocked or offline. The
difference is where the experiment runner crosses the backend boundary and how
much internal instrumentation it can observe.

### Service pathway

```text
experiment runner
  → JSON over HTTP
  → running Functions Framework / deployed service
  → therapy_analysis handler
  → Google RAG and Gemini
  → HTTP response
  → experiment runner
```

This pathway is the end-to-end integration test. It includes JSON encoding,
the socket/HTTP boundary, the running server, request routing, authentication,
response streaming/decoding, and any deployment or gateway behavior. It is the
right pathway for answering “what latency does a caller experience?” and for
detecting HTTP timeouts or service configuration failures.

The service response exposes model/token diagnostics but does not expose the
internal RAG timer, prompt-assembly timer, exact prompt, or retrieved passages.
Those CSV cells are therefore blank rather than inferred. The
`--timeout-seconds` option applies to this HTTP client pathway.

### In-process pathway

```text
experiment runner
  → Flask local test client
  → the same therapy_analysis handler loaded into the runner process
  → instrumented RAG and Gemini wrappers
  → Google RAG and Gemini
  → local handler response
```

This pathway is the diagnostic test. It removes the real socket, external HTTP
server, gateway, and deployment boundary, but it still invokes the actual
backend code and remote Google services. Temporary wrappers record RAG timing,
prompt assembly, model attempts, TTFT, completion time, prompts, and retrieved
passages. With `--compact-report`, timing remains instrumented but repeated
prompt/transcript bodies are not retained.

Instrumentation adds a small amount of local bookkeeping. There is no explicit
per-request timeout around the in-process call, so a blocked underlying request
can wait longer than the service test's configured HTTP timeout.

| Property | Service pathway | In-process pathway |
|---|---|---|
| Real HTTP boundary | Yes | No; local Flask test client |
| Total request latency | Available | Available |
| RAG-prefetch latency | Blank because the service response does not expose it | Available |
| Prompt-assembly latency | Blank because the service response does not expose it | Available |
| Model latency and TTFT | Based on diagnostics returned by the service | Directly observed around the Gemini stream |
| Exact prompts/RAG passages | Not exposed | Available in a normal report; intentionally omitted with `--compact-report` |
| Token usage | Available if Gemini returned usage metadata | Available if Gemini returned usage metadata |

The two pathways make separate Gemini requests. They do not observe the same
model execution. Even with temperature zero, their responses, fallback paths,
thinking usage, previous-alert context, implicit-cache hits, and latency can
differ. If the runs are executed sequentially, time-of-day load and cache state
also differ. A small difference between pathway averages should therefore not
be interpreted as pure HTTP overhead. Isolating HTTP overhead would require
repeated or interleaved trials under controlled cache and backend conditions.

`--compact-report` changes only report retention. It prevents the cumulative
transcript and exact prompt from being duplicated at every step. It does not
change the request sent to the backend or Gemini and therefore should not alter
the measured pipeline behavior.

## Interpreting token growth

Since every step resends the cumulative transcript, `prompt_tokens` should
generally rise as `step` rises. It may not rise perfectly monotonically because
the following prompt components can change independently:

- retrieved RAG passages;
- previous-alert context;
- safety-context injection;
- the selected prompt or fallback path;
- cache behavior and tokenizer boundaries.

Summing `total_tokens` down the CSV estimates the recorded usage across all
selected response attempts. It can undercount actual usage when an unselected
fallback/retry attempt also consumed tokens, because the backend response keeps
only one token-usage diagnostic.

## Context-window limits and current headroom

The realtime pipeline is configured to use `gemini-2.5-flash`. Google currently
documents the following limits for this model:

- maximum input: **1,048,576 tokens**;
- maximum model output: **65,536 tokens**.

Source: [Google Gemini 2.5 Flash model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash).

The backend imposes its own smaller realtime output cap of **1,024 tokens** via
`max_output_tokens=1024`. Therefore, the model's maximum output limit is not the
practical output constraint for this experiment.

In the completed 50-dialogue in-process experiment:

- analyzed conversation turns: **981**;
- largest reported `prompt_tokens`: **31,907**;
- largest reported `total_tokens`: **32,927**;
- fraction of the model input limit used: approximately **3.0%**;
- remaining input capacity at the largest step: approximately **1,016,669
  tokens**.

The hard limit applies to one request. It is the `prompt_tokens` value for an
individual row—not the sum of `prompt_tokens` across all experiment rows—that
should be compared with the input limit. The sum across rows instead describes
repeated experiment usage and approximate cost.

The full 1,000-dialogue dataset contains about 2.57 million rendered transcript
characters. A rough four-characters-per-token estimate places the transcript
near 644,000 tokens before allowing for the prompt template, RAG passages,
safety context, and previous-alert context. This suggests that the full dataset
may still fit inside the one-million-token input window, but it is an estimate,
not a guarantee. An actual Gemini token count or final request is authoritative.

The pipeline can encounter practical problems well before reaching the hard
context limit, including:

- increasing TTFT and total request latency;
- HTTP or service timeouts;
- quota and rate-limit errors;
- increasing inference cost;
- reduced attention to earlier transcript content;
- "lost in the middle" behavior;
- larger HTTP payloads and local memory requirements.

Consequently, this stress test should evaluate latency, reliability, and output
quality as the context grows rather than treating a successful request below
the token limit as proof that performance remained unchanged.

## Blank values and zero values

A blank cell means the measurement was unavailable or was not returned. It
does not mean zero. Common reasons include:

- service mode does not expose internal RAG/prompt-assembly timings;
- the request timed out before Gemini returned diagnostics;
- the stream ended without a text-bearing chunk;
- the Gemini response did not contain that usage field;
- cached tokens were not used or were not reported.

A numeric `0` means the value was actually observed and rounded to zero
milliseconds or reported as zero tokens.

## Useful derived metrics

These calculations can be made from the CSV when their inputs are present.

### Output generation rate

```text
completion_tokens_per_second
  = completion_tokens / (completion_latency_ms / 1000)
```

Use only when `completion_latency_ms > 0`. This measures generation after the
first token and does not include TTFT.

### TTFT fraction of model time

```text
ttft_fraction
  = prompt_processing_and_thinking_latency_ms / model_latency_ms
```

A rising fraction suggests more of the model time is being spent before visible
output, but it does not distinguish prompt ingestion from thinking or service
queueing.

### Approximate non-model overhead

For in-process rows with one model attempt:

```text
approximate_non_model_overhead_ms
  = request_latency_ms − rag_prefetch_latency_ms − model_latency_ms
```

This includes prompt assembly and all other backend overhead. It is only an
approximation and should not be used for fallback/multi-attempt rows without
additional diagnostics.

### Long-context degradation comparison

To screen for latency degradation, compare later checkpoints with an early
baseline rather than comparing adjacent noisy requests:

```text
latency_ratio
  = later_request_latency_ms / median(first three successful request latencies)
```

The stress summary flags a ratio of 2× by default. This is a diagnostic signal,
not proof that model-output quality degraded. Network load, RAG cache misses,
rate limiting, retries, and backend contention can also increase latency.

## Important interpretation limits

- These are pipeline measurements, not isolated model benchmarks.
- Service and in-process request latency are not directly interchangeable
  because only the service pathway includes a real HTTP transport boundary.
- TTFT does not isolate thinking time.
- Token counts describe the prompt actually sent to Gemini, including injected
  context, rather than the raw transcript alone.
- A successful, fast request can still return poor guidance; output quality
  requires a separate evaluation.
- Repeated cumulative testing consumes substantially more tokens than analyzing
  the final transcript once.
