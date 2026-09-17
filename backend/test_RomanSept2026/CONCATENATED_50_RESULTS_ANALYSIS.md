# Concatenated 50-dialogue latency and token analysis

## Executive summary

Both realtime-analysis pathways completed all **981 cumulative turn steps**
successfully. There were **no HTTP errors, failed steps, or timeouts**. The
largest request contained **31,907 prompt tokens**, only about **3.0%** of
Gemini 2.5 Flash's 1,048,576-token input limit.

There is no evidence of sustained latency collapse as the input grew from 944
to 31,907 prompt tokens. Mean latency rose modestly between the first and last
analysis windows, but prompt size explained only **0.3% of service latency
variance** and **2.1% of in-process latency variance**. The largest spikes
occurred at intermediate steps rather than at the maximum context size.

The main issue is instead the realtime **output-token configuration**. Roughly
**75% of requests ended with `MAX_TOKENS`**. On those requests, model thinking
used about 946 tokens on average and the visible completion used about 74,
bringing the combined output to exactly 1,020 tokens on average under the
backend's 1,024-token cap. Although the JSON repair logic reported successful
parsing, many of those repaired alerts lacked important fields such as title,
message, evidence, and recommendation.

The experiment also consumed about **17.1 million recorded tokens per
pathway**, even though the largest individual request used only about 33,000
total tokens. That is the expected cost pattern of resending an increasingly
cumulative transcript at every turn.

## Data analyzed

- Dataset selection: first 50 dialogues in `test → train → val` order. Because
  `test.csv` contains more than 50 dialogues, all selected dialogues came from
  the test split.
- Normalized conversation turns: **981**.
- Rendered transcript size at the final step: **126,744 characters / 21,953
  words**.
- Checkpoint strategy: every turn (`--checkpoint-every-turns 1`).
- Model: `gemini-2.5-flash`.
- Backend output cap: `max_output_tokens=1024`.
- Service results: `service/concatenated_realtime_report.json` and
  `service/metrics.csv`.
- In-process results: `in_process/concatenated_realtime_report.json` and
  `in_process/metrics.csv`.

The runs were separate and sequential, not simultaneous paired observations.
Service-versus-in-process differences therefore combine boundary overhead with
normal model variability, cache state, fallback behavior, and time-of-day load.

## Reliability and run completion

| Result | Service | In process |
|---|---:|---:|
| Steps | 981 | 981 |
| Successful steps | 981 (100%) | 981 (100%) |
| Failed steps | 0 | 0 |
| Timeouts | 0 | 0 |
| Alerts returned | 981 | 981 |
| Reported fallback steps | 2 | 4 |
| Captured model attempts | 981* | 985 |
| Approximate summed request time | 103.8 min | 106.0 min |

\* Service mode retains only the model diagnostic attached to each response;
it cannot enumerate every internal attempt. In-process instrumentation observed
four extra attempts, matching its four reported fallback steps.

The absence of failures shows that this backend, model, and service setup can
process a 31.9K-token realtime prompt reliably across a long sequential run. It
does not establish that much larger contexts or parallel request loads will be
equally reliable.

## End-to-end latency

| Metric | Service | In process |
|---|---:|---:|
| Mean request latency | 6,350 ms | 6,486 ms |
| Median request latency | 6,213 ms | 6,294 ms |
| p90 | 7,815 ms | 8,312 ms |
| p95 | 8,696 ms | 9,075 ms |
| p99 | 10,916 ms | 10,961 ms |
| Maximum | 16,683 ms | 20,329 ms |
| Mean TTFT | 5,569 ms | 5,610 ms |
| Mean completion after TTFT | 406 ms | 429 ms |
| Mean model latency | 5,975 ms | 6,063 ms |

The in-process mean was 137 ms (2.2%) slower, and its median was 81 ms (1.3%)
slower. This does **not** mean the local instrumentation intrinsically adds that
much latency. At the same step, the in-process request was slower 524 times and
the service request was slower 457 times. The median paired difference was only
103 ms, while the middle 80% of paired differences ranged from approximately
−1.93 to +2.11 seconds. Ordinary request-to-request variation is much larger
than the difference between the pathway averages.

The service run does include a real HTTP boundary, whereas in-process uses a
local Flask test client. However, because the requests were made at different
times and produced independently sampled model responses, this experiment does
not isolate the cost of that boundary.

## Latency as context grew

Five consecutive windows show the long-context trend:

| Steps | Mean prompt tokens | Service request mean | Service TTFT mean | In-process request mean | In-process TTFT mean |
|---|---:|---:|---:|---:|---:|
| 1–200 | 4,175 | 6,148 ms | 5,267 ms | 5,841 ms | 5,032 ms |
| 201–400 | 10,720 | 6,427 ms | 5,588 ms | 6,751 ms | 5,783 ms |
| 401–600 | 16,812 | 6,293 ms | 5,591 ms | 6,487 ms | 5,724 ms |
| 601–800 | 22,813 | 6,390 ms | 5,677 ms | 6,765 ms | 5,847 ms |
| 801–981 | 28,994 | 6,505 ms | 5,738 ms | 6,599 ms | 5,667 ms |

From the first to last window:

- service mean request latency increased about **5.8%** and TTFT about **8.9%**;
- in-process mean request latency increased about **13.0%** and TTFT about
  **12.6%**.

The progression is not monotonic. Linear fits against prompt size were weak:

| Fit | Slope per 1K prompt tokens | R² |
|---|---:|---:|
| Service request latency | +8.5 ms | 0.003 |
| Service TTFT | +13.3 ms | 0.008 |
| In-process request latency | +24.7 ms | 0.021 |
| In-process TTFT | +20.8 ms | 0.016 |

Thus, prompt size was associated with a small upward tendency, but it explained
very little of the observed variability. The stress heuristic reached 2× its
early baseline on only five service steps and four in-process steps. At the end
of the run, the service tail was only 1.06× its request-latency baseline and the
in-process tail was 1.11×. There was no sustained 2× degradation.

The largest service spike was **16,683 ms at step 120** with only 4,832 prompt
tokens. The largest in-process spike was **20,329 ms at step 505** with 16,933
prompt tokens. Neither occurred at the largest context, which argues against a
hard context-size threshold as their cause.

## In-process stage attribution

Only in-process instrumentation exposes the internal RAG and prompt-assembly
stages.

| Stage | Mean | Median | p95 | Maximum |
|---|---:|---:|---:|---:|
| RAG prefetch | 413 ms | 148 ms | 2,127 ms | 2,787 ms |
| Prompt assembly | 0.7 ms | 1 ms | 1 ms | 2 ms |
| Gemini model | 6,063 ms | 5,998 ms | 7,817 ms | 20,199 ms |
| Other measured backend overhead | 9 ms | 10 ms | — | 67 ms |

The model dominated normal latency. RAG was usually quick but bimodal: **136
steps (13.9%)** took at least one second to prefetch RAG. Those steps averaged
8,125 ms total request time, compared with 6,222 ms when RAG stayed below one
second. The roughly 1.9-second request difference closely matches the RAG-stage
difference, making slow RAG prefetch a clear source of a subset of latency
spikes.

Prompt assembly itself is negligible. Optimizing string construction would not
materially change the result; model TTFT and occasional RAG searches are the
useful targets.

Service rows leave RAG and prompt-assembly fields blank because those internal
timers are not exported by the HTTP response. A blank service value is
“unobserved,” not zero.

## Token growth and cumulative experiment usage

| Metric | Service | In process |
|---|---:|---:|
| First-step prompt tokens | 944 | 944 |
| Final/max prompt tokens | 31,907 | 31,907 |
| Sum of recorded prompt tokens | 16,151,334 | 16,152,135 |
| Sum of recorded completion tokens | 115,160 | 117,070 |
| Sum of recorded thinking tokens | 836,307 | 839,400 |
| Sum of recorded total tokens | 17,102,801 | 17,108,605 |
| Sum of cached tokens reported | 10,097,047 | 9,121,274 |
| Steps reporting cached tokens | 605 (61.7%) | 542 (55.2%) |

The final prompt was about 33.8 times larger than the first prompt because each
step resent all preceding turns. Yet 31,907 input tokens are only about 3.0% of
the model's 1,048,576-token input limit. Input capacity was not close to being
exhausted.

The much larger 17.1-million-token totals describe repeated experiment usage,
not one request. They are the sum of 981 increasingly cumulative calls. They
may slightly undercount actual consumption because the response keeps token
diagnostics for one selected attempt, while discarded fallback attempts can
also consume tokens.

Gemini reported implicit cached tokens on more than half of the steps. A cache
report was associated with lower mean latency in both runs despite those rows
having larger prompts: about 207 ms lower in service mode and 343 ms lower
in-process. This is observational and confounded by step position and backend
load; it should not be treated as a controlled estimate of cache benefit.

## Primary issue: output cap consumed by thinking

The backend sets `max_output_tokens=1024`. Gemini 2.5 Flash's reported thinking
tokens count against that generation budget in these results.

| Finish reason | Service | In process |
|---|---:|---:|
| `STOP` | 246 (25.1%) | 244 (24.9%) |
| `MAX_TOKENS` | 735 (74.9%) | 737 (75.1%) |

For `MAX_TOKENS` requests:

| Metric | Service mean | In-process mean |
|---|---:|---:|
| Thinking tokens | 946.1 | 945.5 |
| Visible completion tokens | 73.9 | 74.5 |
| Thinking + completion | 1,020.0 | 1,020.0 |
| Request latency | 6,591 ms | 6,727 ms |
| TTFT | 5,983 ms | 6,030 ms |

For normally stopped requests, thinking plus completion averaged only 820
tokens in service mode and 839 in-process. The `MAX_TOKENS` pattern is therefore
direct evidence that the configured generation ceiling—not the input context
window—is being reached.

All 981 rows reported successful JSON parsing and returned an `alert` object,
but parsing success is not the same as complete output. The backend can repair
truncated JSON by closing incomplete structures. Field completeness makes the
effect visible:

| In-process alert field | `STOP` present | `MAX_TOKENS` present |
|---|---:|---:|
| Title | 100.0% | 55.6% |
| Message | 100.0% | 24.8% |
| Evidence | 100.0% | 21.3% |
| Recommendation | 99.6% | 15.7% |

Service results show nearly the same pattern: among `MAX_TOKENS` rows, title
was present in 56.7%, message in 23.0%, evidence in 19.6%, and recommendation
in 14.7%. Optional safety fields should not be expected on every alert, but
title, message, and recommendation are effectively complete in `STOP` rows and
frequently absent in capped rows. This is a substantive output-completeness
problem hidden by the 100% “successful step” and JSON-parse rates.

## Conclusions

1. **Reliability was strong at this input size.** Both pathways completed all
   981 steps without timeout or backend failure.
2. **There was no hard input-context pressure.** The maximum prompt used about
   3% of Gemini's input capacity.
3. **Latency showed only weak context-size dependence.** Later windows were
   modestly slower, but request noise, RAG variability, model variability, and
   caching dominated the relationship.
4. **TTFT dominates perceived latency.** Roughly 5.6 seconds of a 6.3–6.5
   second mean request elapsed before the first visible token.
5. **Slow RAG calls explain a subset of in-process spikes.** About 14% of RAG
   prefetches took at least one second.
6. **The output limit is the urgent token issue.** Three quarters of responses
   reached `MAX_TOKENS`, largely because thinking consumed most of the
   1,024-token budget, and repaired outputs often omitted important guidance.
7. **Cumulative step-by-step testing is expensive.** Each pathway recorded
   about 17.1 million total tokens for a final context of only 31.9K prompt
   tokens.
8. **Service and in-process behavior broadly agree.** Their means differ by
   only about 2%, but separate sequential runs cannot isolate HTTP overhead.

## Recommended next actions

1. **Fix output-budget pressure before increasing the input size.** Test either
   a higher realtime output cap, an explicit minimal/disabled thinking setting,
   or a smaller response schema. Measure both latency and clinical-field
   completeness after the change.
2. **Treat `MAX_TOKENS` as incomplete.** Do not count a repaired JSON object as
   fully successful unless required alert fields are present. Record a separate
   `complete_response` metric.
3. **Preserve diagnostics for every retry.** Sum token usage across attempts and
   identify which attempt supplied the final response.
4. **Expose internal stage diagnostics in service mode.** Returning RAG and
   prompt-assembly durations would make service/in-process comparisons more
   informative.
5. **Investigate slow RAG prefetches.** Record cache-hit state and individual
   datastore timings in a compact metrics export, focusing on the 136 calls
   above one second.
6. **Use sampled checkpoints for larger context-limit tests.** Geometric or
   fixed-interval checkpoints can test 100K–1M-token contexts without paying
   for every cumulative intermediate request.
7. **Use repeated/interleaved trials to measure pathway overhead.** Alternate
   service and in-process checkpoints or repeat both runs, then compare matched
   distributions with controlled cache state.
8. **Add an output-quality evaluation.** Latency and parse success cannot show
   whether early transcript information remains clinically represented as the
   context grows.

