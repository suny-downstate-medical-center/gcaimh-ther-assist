# Realtime analysis experiment suite

This suite exercises the real realtime path in
`backend/therapy-analysis-function/main.py` against a conversation and
creates a step-by-step debrief. It does not add instrumentation to the
deployed function.

## Two testing pathways

The suite supports two complementary ways to run the first dialogue from
`huggingface_IkeZhang_MHDialog/test.csv`:

1. **Service-level mode** — pass `--endpoint-url` to send requests through
   the service started by `START-Mac.command` (or a deployed Cloud Run URL).
   This tests the real HTTP boundary, authentication, running process, and
   end-to-end latency. It can report only the diagnostics that the service
   returns; exact internal prompts and retrieved RAG chunks are not currently
   exposed by the production response.
2. **In-process mode** — omit `--endpoint-url`. This invokes the backend
   locally with instrumentation around RAG and Gemini. It provides the full
   prompt, RAG query, retrieved chunks/documents, model attempts, timings,
   and token diagnostics. This is the default and is the best path for
   debugging and detailed RAG analysis.

`run_hybrid_realtime.py` combines both pathways for the same cumulative
conversation checkpoints: it sends one run through `START-Mac.command` and a
second, instrumented shadow run in-process, then compares the results. The
two runs make separate model requests, so their generated responses can
differ.

For each cumulative conversation checkpoint it records:

- request and per-datastore RAG latency;
- the exact RAG query (the final 200 words used by the backend);
- retrieved passage/chunk text and source titles returned by the backend;
- every Gemini attempt, exact prompt, model latency, TTFT, and observable
  completion latency;
- prompt/completion/thinking token counts from Gemini `_diagnostics`;
- retry/fallback behavior and the backend response.

Gemini does not provide a separate realtime duration for prompt processing and
thinking here. The report therefore labels TTFT as the combined server-side
prompt-processing/thinking interval and reports `thinking_tokens` separately.
The realtime backend also uses pre-fetched RAG, so the RAG trigger is the
backend's search query rather than an inline Gemini tool call.

## Run the first test dialogue

Use the requested conda environment:

```bash
conda run -n TherAssist python backend/test_RomanSept2026/realtime_analysis_suite.py
```

Outputs are written to `backend/test_RomanSept2026/results/`:

- `realtime_analysis_report.json` — data for aggregation across `test.csv`;
- `realtime_analysis_debrief.md` — readable step-by-step conversation/RAG debrief;
- `realtime_analysis_report.html` — self-contained report with token and
  latency figures plus expandable conversation/RAG details.

The HTML report contains inline SVG charts, so it works without an internet
connection or a JavaScript/charting dependency. The charts show the measured
latency stages and prompt/completion/thinking tokens for each cumulative
conversation step. Expand a step to inspect its transcript, each RAG datastore
query, source titles, retrieved chunks, model prompts, model output, and
recommendation. The model-output section includes the alert message, evidence,
recommended actions, immediate actions, contraindications, and crisis resources
when returned by the backend.
Unavailable measurements (for example, internal prompts in HTTP mode) are
shown as unavailable rather than inferred.

## Test through the locally deployed service

The old project’s local setup runs the therapy analysis function with
Functions Framework. The equivalent launcher here uses port 8080 by default:

```bash
bash backend/test_RomanSept2026/run_local_therapy_analysis.sh
```

The launcher defaults to the stable non-reloader server. Set
`THERASSIST_DEBUG=1` if Flask debug/reload behavior is desired.

Keep it running, then use a second terminal:

```bash
conda run -n TherAssist python backend/test_RomanSept2026/realtime_analysis_suite.py \
  --endpoint-url http://127.0.0.1:8080/therapy_analysis
```

For the service started by `START-Mac.command`, use its therapy-analysis port
instead:

```bash
conda run -n TherAssist python backend/test_RomanSept2026/realtime_analysis_suite.py \
  --endpoint-url http://127.0.0.1:8090/therapy_analysis
```

The same switch works later with a Cloud Run URL, for example
`https://<therapy-analysis-service>/therapy_analysis`; add `--bearer-token`
if authentication is enabled. The conversation adapters and report format do
not change between local and online runs.

## Run all dialogues

The batch runner loops over every non-empty row in `test.csv` (currently 150
dialogues) and writes a separate set of JSON, Markdown, and HTML reports for
each one:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/run_all_realtime_tests.py \
  --output-dir backend/test_RomanSept2026/results/all/in_process
```

Each report is stored under `dialogue_0001/`, `dialogue_0002/`, and so on.
The batch also writes `all_dialogues_summary.json` and
`all_dialogues_summary.md` with aggregate latency, token, RAG, alert, and
success statistics. Use `--max-dialogues 2` for a small trial run.

To run the complete dataset against the connected service, add its endpoint:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/run_all_realtime_tests.py \
  --endpoint-url http://127.0.0.1:8090/therapy_analysis \
  --output-dir backend/test_RomanSept2026/results/all/service
```

## Run both pathways with one Bash script

The normal `realtime_analysis_suite.py` command runs only the in-process
pathway. To run both the in-process and service-level tests, first start the
application with `START-Mac.command`, then run:

```bash
bash backend/test_RomanSept2026/run_both_realtime_tests.sh
```

The script uses the `TherAssist` conda environment and loops over every
dialogue, writing separate JSON,
Markdown, and HTML reports to:

- `backend/test_RomanSept2026/results/both/in_process/`
- `backend/test_RomanSept2026/results/both/service/`

Each pathway directory contains one subdirectory per CSV row and an aggregate
`all_dialogues_summary.json` / `all_dialogues_summary.md`.

An alternative endpoint can be supplied as the first argument, and a custom
output directory as the second:

```bash
bash backend/test_RomanSept2026/run_both_realtime_tests.sh \
  https://<service-url>/therapy_analysis \
  backend/test_RomanSept2026/results/online
```

For an authenticated endpoint, set `THERASSIST_BEARER_TOKEN` before running
the script. The service-level run requires the endpoint to already be running;
the script does not start `START-Mac.command` itself.

HTTP mode measures end-to-end request latency and consumes token/model
diagnostics returned by the service. The current realtime response does not
export the exact assembled prompt or pre-fetched RAG passages, so those fields
are marked unavailable in HTTP reports. Use the default in-process mode, or
the in-process half of the hybrid run, when full prompt/query/passage
instrumentation is needed.

## Comprehensive analysis pathway

`comprehensive_analysis_suite.py` exercises
`handle_comprehensive_analysis()` by sending `is_realtime=false`. Unlike the
realtime pathway, comprehensive analysis uses Gemini's inline Vertex AI Search
tools. The runner captures the comprehensive prompt, model timings and token
usage, structured analysis output, and grounding queries/documents/chunks when
they are returned by Gemini.

Run the first dialogue in-process:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/comprehensive_analysis_suite.py
```

Run every dialogue in-process:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/comprehensive_analysis_suite.py \
  --all-dialogues \
  --output-dir backend/test_RomanSept2026/results/comprehensive/in_process
```

For the connected service, start `START-Mac.command` first and use:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/comprehensive_analysis_suite.py \
  --all-dialogues \
  --endpoint-url http://127.0.0.1:8090/therapy_analysis \
  --output-dir backend/test_RomanSept2026/results/comprehensive/service
```

To run both comprehensive pathways with one Bash command:

```bash
./backend/test_RomanSept2026/run_both_comprehensive_tests.sh
```

This writes one JSON, Markdown, and HTML report per dialogue under separate
`in_process/` and `service/` directories, plus aggregate summaries. Set
`THERASSIST_MAX_DIALOGUES=2` for a small trial. The service must already be
running; the Bash script does not start `START-Mac.command`.

## Run realtime and comprehensive analyses for all dialogues

To run both analysis families across every non-empty row in `test.csv`, first
start the connected service with `START-Mac.command`, then run:

```bash
bash backend/test_RomanSept2026/run_all_analysis_tests.sh
```

This runs, in order:

- realtime analysis in-process and through the service;
- comprehensive analysis in-process and through the service.

Reports are separated by analysis family and backend mode:

```text
backend/test_RomanSept2026/results/all_analysis/
├── realtime/
│   ├── in_process/
│   └── service/
└── comprehensive/
    ├── in_process/
    └── service/
```

Each mode contains one JSON, Markdown, and HTML report per dialogue, plus an
aggregate summary. Use `THERASSIST_MAX_DIALOGUES=3` for a short trial. An
alternative endpoint and output directory can be supplied as the first and
second arguments:

```bash
bash backend/test_RomanSept2026/run_all_analysis_tests.sh \
  https://<service-url>/therapy_analysis \
  backend/test_RomanSept2026/results/online_all_analysis
```

Set `THERASSIST_BEARER_TOKEN` when the service endpoint requires authentication.

## Hybrid test: START-Mac service plus full visibility

To exercise both paths for the same conversation checkpoints, first start the
application with `START-Mac.command`. It runs therapy analysis on port 8090.
Then run:

```bash
conda run -n TherAssist python \
  backend/test_RomanSept2026/run_hybrid_realtime.py
```

The hybrid runner sends each checkpoint through the authenticated service and
through an instrumented in-process shadow run. It compares status, request
latency, alert category, tokens, and checkpoint alignment, while retaining
exact prompts and RAG observations from the shadow run. Results are written to
`backend/test_RomanSept2026/results/hybrid/`, including HTML reports inside
the `service/` and `in_process/` subdirectories.

This is the recommended bridge until the production service exports structured
prompt/RAG tracing. It validates the real runtime and gives full internal
visibility, but the two model calls are separate and may produce different
outputs. The same command can target a deployed service with
`--endpoint-url https://<service-url>/therapy_analysis`.

## Python and HTTP APIs

The main API is:

```python
from realtime_analysis_suite import run_realtime_analysis

report = run_realtime_analysis(conversation, session_context={"session_type": "CBT"})
```

`conversation` may be a HuggingFace list with `user`/`supporter`, a backend
list with `speaker`/`text`, a chat list with `role`/`content`, or a plain text
string.

An optional local HTTP API accepts the same formats:

```bash
conda run -n TherAssist python backend/test_RomanSept2026/realtime_analysis_api.py
```

```bash
curl -X POST http://127.0.0.1:8787/run \
  -H 'Content-Type: application/json' \
  -d '{"conversation":[{"user":"I feel overwhelmed","supporter":"I hear you."}]}'
```

This is a live GCP/Gemini experiment: credentials, the Discovery Engine
dependency, network access, and configured datastores are required. The
offline unit tests do not call GCP.
