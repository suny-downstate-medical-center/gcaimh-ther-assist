# Realtime RAG retrieval error

## Symptom

The realtime test logs an error like:

```text
400 Cannot use enterprise edition features ... extractive answers/segments ...
in a standard edition search engine.
```

The warning is usually emitted once for each configured datastore, for
example `cbt-corpus`, `ba-corpus`, `ebt-corpus`, and `safety-crisis`.

## Cause

The realtime backend pre-fetches RAG context before calling Gemini. The code
is in `backend/therapy-analysis-function/main.py`:

```python
response = _search_client.search(search_request)
```

The request is built with an extractive content section:

```python
content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
    snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
        return_snippet=True,
        max_snippet_count=3,
    ),
    extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
        max_extractive_answer_count=2,
        max_extractive_segment_count=3,
    ),
)
```

`_search_client.search(...)` sends that request directly to Discovery Engine.
The configured search engine is Standard Edition, while
`extractive_content_spec` requests Enterprise-only functionality. Discovery
Engine therefore rejects the request with HTTP 400 before returning any
documents or passages.

This is not primarily an authentication problem. A successful authentication
request can still be rejected because the requested Discovery Engine feature
is not enabled for the configured engine.

## Why the analysis may continue

The production helper catches the exception:

```python
except Exception as e:
    logging.warning(f"[RAG PREFETCH] Failed to query {datastore_id}: {e}")
    return []
```

The realtime handler then receives an empty result and continues to Gemini.
The model can therefore return an analysis, but the prompt contains no
retrieved clinical evidence from the failed datastore calls.

In the realtime experiment reports this appears as:

- RAG datastore queries being recorded;
- zero retrieved chunks or source titles;
- no usable RAG evidence in the generated prompt;
- Gemini output and latency still being present.

Those results should be treated as a no-RAG run, not as evidence that the
datastores returned no relevant documents.

## Why comprehensive analysis can work

The comprehensive path uses a different retrieval mechanism. It gives Gemini
Vertex AI Search tools directly through `GenerateContentConfig`:

```python
types.Tool(
    retrieval=types.Retrieval(
        vertex_ai_search=types.VertexAISearch(datastore="...")
    )
)
```

Gemini performs the retrieval internally and returns grounding metadata such
as retrieval queries, grounding chunks, source titles, excerpts, and page
information. It does not send the same direct
`SearchRequest` containing `extractive_content_spec` from the realtime
prefetch helper.

Therefore, a successful comprehensive RAG test does not automatically mean
that the current realtime prefetch request is compatible with the same
datastore configuration. The two paths must be tested separately.

## Available fixes

### Option 1: Enable Enterprise Edition

Enable Enterprise Edition for the Discovery Engine app/engine serving the
datastores. This keeps the current realtime request and allows extractive
answers and segments.

This option preserves the intended retrieval detail, but may require Google
Cloud permissions, project configuration changes, and additional cost or
service availability review.

### Option 2: Use Standard-compatible retrieval

Remove `extractive_content_spec` from the realtime `SearchRequest` and keep
Standard-compatible search features such as snippets. The relevant code is
`_query_datastore()` in:

```text
backend/therapy-analysis-function/main.py
```

This should allow `_search_client.search(...)` to return ordinary search
results while preserving the realtime prefetch architecture. The tradeoff is
that the returned text may be shorter or less precisely selected than
Enterprise extractive answers/segments.

### Option 3: Use an engine-level serving configuration

The Discovery Engine error also indicates that Enterprise features may need a
serving-config path based on an engine/app rather than a datastore, such as:

```text
projects/{project}/locations/{location}/collections/{collection}/engines/{engine}/servingConfigs/{serving_config}
```

This requires knowing the correct engine and serving-config identifiers and
having the matching Enterprise configuration. It is not a drop-in replacement
for the current datastore path.

## Testing implications

Until the realtime retrieval request is corrected:

```bash
./backend/test_RomanSept2026/run_both_realtime_tests.sh
```

will still exercise the real realtime code, but its in-process RAG report will
show failed retrieval calls and empty chunks. The service-level run is subject
to the same backend behavior because it calls the same deployed function.

The comprehensive pathway is useful for validating the configured datastores
and Gemini grounding independently:

```bash
./backend/test_RomanSept2026/run_both_comprehensive_tests.sh
```

That comparison helps distinguish a datastore/authentication problem from the
specific Standard-versus-Enterprise request mismatch in realtime prefetch.
