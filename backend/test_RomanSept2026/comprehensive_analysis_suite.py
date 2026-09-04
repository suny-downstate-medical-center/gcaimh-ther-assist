"""Experiment runner for the production comprehensive analysis path.

This module sends ``is_realtime=False`` so the backend executes
``handle_comprehensive_analysis``. It supports the same conversation formats
as the realtime suite and records model prompts, timings, tokens, output, and
Gemini Vertex AI Search grounding metadata.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from realtime_analysis_suite import (  # noqa: E402
    DEFAULT_BACKEND,
    DEFAULT_CSV,
    BackendModuleLoader,
    FlexibleConversationAdapter,
    HttpBackendClient,
    LocalBackendClient,
    ModelAttemptObservation,
    RetrievalObservation,
    StepObservation,
    _attempt_from_backend_diagnostics,
    _chunk_has_text,
    _extract_prompt,
    _observed_models,
    load_csv_dialogues,
    load_first_csv_dialogue,
    summarize_steps,
    step_to_dict,
    write_report,
)
from run_all_realtime_tests import summarize_reports  # noqa: E402


def _datastore_from_path(value: Any) -> str:
    match = re.search(r"/dataStores/([^/]+)", str(value or ""))
    return match.group(1) if match else "Gemini Vertex AI Search"


class _ComprehensiveModels:
    """Capture prompts, stream timings, and inline grounding metadata."""

    def __init__(self, models: Any, attempts: list[ModelAttemptObservation], grounding_calls: list[dict[str, Any]]):
        self._models = models
        self._attempts = attempts
        self._grounding_calls = grounding_calls

    def generate_content_stream(self, *args: Any, **kwargs: Any) -> Iterable[Any]:
        prompt = _extract_prompt(kwargs.get("contents", args[1] if len(args) > 1 else ""))
        attempt = ModelAttemptObservation("COMPREHENSIVE_ANALYSIS_PROMPT", prompt, time.perf_counter())
        call_trace: dict[str, Any] = {"queries": [], "sources": []}
        self._attempts.append(attempt)
        self._grounding_calls.append(call_trace)
        seen_sources: set[tuple[Any, ...]] = set()
        try:
            stream = self._models.generate_content_stream(*args, **kwargs)
        except Exception:
            attempt.request_ended_at = time.perf_counter()
            raise
        try:
            for chunk in stream:
                attempt.response_chunks += 1
                if attempt.first_token_at is None and _chunk_has_text(chunk):
                    attempt.first_token_at = time.perf_counter()
                self._capture_grounding(chunk, call_trace, seen_sources)
                yield chunk
        finally:
            attempt.request_ended_at = time.perf_counter()

    @staticmethod
    def _capture_grounding(
        chunk: Any,
        call_trace: dict[str, Any],
        seen_sources: set[tuple[Any, ...]],
    ) -> None:
        for candidate in getattr(chunk, "candidates", None) or []:
            metadata = getattr(candidate, "grounding_metadata", None)
            if not metadata:
                continue
            for query in getattr(metadata, "retrieval_queries", None) or []:
                if query not in call_trace["queries"]:
                    call_trace["queries"].append(query)
            for grounding_chunk in getattr(metadata, "grounding_chunks", None) or []:
                context = getattr(grounding_chunk, "retrieved_context", None)
                if not context:
                    continue
                rag_chunk = getattr(context, "rag_chunk", None)
                text = getattr(context, "text", None) or getattr(rag_chunk, "text", None)
                document_name = getattr(context, "document_name", None)
                uri = getattr(context, "uri", None)
                title = getattr(context, "title", None) or "Unknown source"
                key = (document_name, uri, title, text)
                if key in seen_sources:
                    continue
                seen_sources.add(key)
                page_span = getattr(rag_chunk, "page_span", None) if rag_chunk else None
                call_trace["sources"].append(
                    {
                        "datastore": _datastore_from_path(document_name or uri),
                        "document_name": document_name,
                        "title": title,
                        "uri": uri,
                        "text": text,
                        "page_first": getattr(page_span, "first_page", None),
                        "page_last": getattr(page_span, "last_page", None),
                    }
                )

    def __getattr__(self, name: str) -> Any:
        return getattr(self._models, name)


class _ComprehensiveClient:
    def __init__(self, client: Any, attempts: list[ModelAttemptObservation], grounding_calls: list[dict[str, Any]]):
        self._client = client
        self.models = _ComprehensiveModels(client.models, attempts, grounding_calls)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


class ComprehensiveInstrumentation:
    """Install temporary instrumentation around the comprehensive model call."""

    def __init__(self, backend: Any):
        self.backend = backend
        self.models: list[ModelAttemptObservation] = []
        self.grounding_calls: list[dict[str, Any]] = []
        self._original_client: Any = None

    def __enter__(self) -> "ComprehensiveInstrumentation":
        self._original_client = self.backend.client
        self.backend.client = _ComprehensiveClient(
            self._original_client,
            self.models,
            self.grounding_calls,
        )
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        self.backend.client = self._original_client


def _inline_rag_observations(call_trace: Mapping[str, Any]) -> list[RetrievalObservation]:
    """Convert Gemini grounding metadata into report-compatible RAG cards."""
    sources = call_trace.get("sources", [])
    queries = [str(query) for query in call_trace.get("queries", [])]
    grouped: dict[str, list[Mapping[str, Any]]] = {}
    for source in sources:
        grouped.setdefault(str(source.get("datastore", "Gemini Vertex AI Search")), []).append(source)
    if not grouped and queries:
        grouped["Gemini Vertex AI Search"] = []

    observations: list[RetrievalObservation] = []
    query = " | ".join(queries) if queries else "Query not returned in grounding metadata"
    for datastore, datastore_sources in grouped.items():
        titles: list[str] = []
        passages: list[str] = []
        for source in datastore_sources:
            title = str(source.get("title") or "Unknown source")
            if title not in titles:
                titles.append(title)
            text = source.get("text")
            if text:
                passages.append(f"[Source: {title}] {text}")
        observations.append(
            RetrievalObservation(
                datastore=datastore,
                query=query,
                duration_ms=None,
                passages=passages,
                source_titles=titles,
                note=(
                    "Retrieval happened inline inside Gemini generate_content_stream; "
                    "a separate Discovery Engine latency is not exposed."
                ),
            )
        )
    return observations


def _response_rag_observations(response: Mapping[str, Any]) -> list[RetrievalObservation]:
    """Read grounding citations returned by the HTTP comprehensive endpoint."""
    grouped: dict[str, dict[str, Any]] = {}
    citations = response.get("citations", [])
    for citation in citations if isinstance(citations, list) else []:
        source = citation.get("source", {}) if isinstance(citation, Mapping) else {}
        if not isinstance(source, Mapping):
            continue
        datastore = _datastore_from_path(source.get("document_name") or source.get("uri"))
        group = grouped.setdefault(datastore, {"titles": [], "passages": []})
        title = str(source.get("title") or "Unknown source")
        if title not in group["titles"]:
            group["titles"].append(title)
        if source.get("excerpt"):
            group["passages"].append(f"[Source: {title}] {source['excerpt']}")
    return [
        RetrievalObservation(
            datastore=datastore,
            query="Query not returned by the HTTP response",
            duration_ms=None,
            passages=group["passages"],
            source_titles=group["titles"],
            note="Grounding citations returned by the comprehensive service; retrieval query text is not included in the response.",
        )
        for datastore, group in grouped.items()
    ]


class ComprehensiveConversationRunner:
    """Run one comprehensive request at each cumulative conversation checkpoint."""

    def __init__(self, client: Any, instrumentation: ComprehensiveInstrumentation | None = None):
        self.client = client
        self.instrumentation = instrumentation
        self.adapter = FlexibleConversationAdapter()

    def run(
        self,
        conversation: Any,
        *,
        session_context: Mapping[str, Any] | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        turns = self.adapter.adapt(conversation)
        if not turns:
            raise ValueError("Conversation contains no non-empty turns")

        steps: list[StepObservation] = []
        for step_number, _turn in enumerate(turns, start=1):
            cumulative = turns[:step_number]
            payload = {
                "action": "analyze_segment",
                "is_realtime": False,
                "transcript_segment": [turn.as_backend_turn() for turn in cumulative],
                "session_duration_minutes": 0,
                "session_context": dict(session_context or {"session_type": "CBT"}),
                "job_id": f"comprehensive-step-{step_number}",
            }
            started = time.perf_counter()
            model_start = len(self.instrumentation.models) if self.instrumentation else 0
            grounding_start = len(self.instrumentation.grounding_calls) if self.instrumentation else 0
            status, response = self.client.analyze(payload)
            ended = time.perf_counter()
            diagnostics = response.get("_diagnostics", {}) if isinstance(response, dict) else {}
            observed_models = _observed_models(self.client, model_start) if self.instrumentation else []
            if not observed_models:
                observed_models = _attempt_from_backend_diagnostics(diagnostics)
            first_attempt = observed_models[0] if observed_models else None

            if self.instrumentation:
                rag = [
                    observation
                    for call in self.instrumentation.grounding_calls[grounding_start:]
                    for observation in _inline_rag_observations(call)
                ]
            else:
                rag = _response_rag_observations(response)

            prompt_assembly = None
            if first_attempt and first_attempt.request_started_at:
                prompt_assembly = max(0, round((first_attempt.request_started_at - started) * 1000))
            steps.append(
                StepObservation(
                    step=step_number,
                    input_turns=[turn.as_backend_turn() for turn in cumulative],
                    transcript_text="\n".join(f"{turn.speaker}: {turn.text}" for turn in cumulative),
                    request_latency_ms=round((ended - started) * 1000),
                    rag_prefetch_latency_ms=None,
                    prompt_assembly_latency_ms=prompt_assembly,
                    prompt_processing_and_thinking_latency_ms=first_attempt.time_to_first_token_ms if first_attempt else None,
                    completion_latency_ms=first_attempt.completion_after_first_token_ms if first_attempt else None,
                    token_usage=dict(diagnostics.get("token_usage", {})),
                    rag=rag,
                    model_attempts=observed_models,
                    response=response,
                    backend_status=status,
                    error=response.get("error") if isinstance(response, dict) else "Invalid response",
                )
            )

        summary = summarize_steps(steps)
        summary["latency_note"] = (
            "Comprehensive analysis uses inline Gemini Vertex AI Search tools. "
            "TTFT combines server prompt processing and thinking; retrieval is included in model latency."
        )
        return {
            "schema_version": "1.0-comprehensive",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "analysis_type": "comprehensive",
            "metadata": dict(metadata or {}),
            "session_context": dict(session_context or {"session_type": "CBT"}),
            "backend_mode": getattr(self.client, "mode", "custom"),
            "conversation": [turn.__dict__ for turn in turns],
            "summary": summary,
            "steps": [step_to_dict(step) for step in steps],
        }


def run_comprehensive_analysis(
    conversation: Any,
    *,
    backend_path: str | Path = DEFAULT_BACKEND,
    session_context: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    backend = BackendModuleLoader(backend_path).load()
    instrumentation = ComprehensiveInstrumentation(backend)
    client = LocalBackendClient(backend)
    client.instrumentation = instrumentation
    with instrumentation:
        return ComprehensiveConversationRunner(client, instrumentation).run(
            conversation,
            session_context=session_context,
            metadata=metadata,
        )


def _summary_markdown(summary: Mapping[str, Any], output_dir: Path) -> str:
    return "\n".join(
        [
            "# Comprehensive analysis batch summary",
            "",
            f"Backend mode: `{summary['backend_mode']}`",
            f"Dialogues: **{summary['dialogues']}** | steps: **{summary['steps']}** | successful steps: **{summary['successful_steps']}**",
            f"Alerts: **{summary['alerts']}** | RAG calls: **{summary['rag_calls']}** | model attempts: **{summary['model_attempts']}**",
            f"Token totals: `{json.dumps(summary['token_totals'], sort_keys=True)}`",
            f"Average request latency: **{summary['average_request_latency_ms']} ms**",
            f"Reports directory: `{output_dir}`",
            "",
        ]
    )


def run_dataset(
    *,
    csv_path: str | Path = DEFAULT_CSV,
    output_dir: str | Path,
    endpoint_url: str | None = None,
    bearer_token: str | None = None,
    backend_path: str | Path = DEFAULT_BACKEND,
    session_type: str = "CBT",
    all_dialogues: bool = False,
    max_dialogues: int | None = None,
) -> dict[str, Any]:
    csv_file = Path(csv_path).resolve()
    datasets = load_csv_dialogues(csv_file) if all_dialogues else [load_first_csv_dialogue(csv_file)]
    if max_dialogues is not None:
        if max_dialogues < 1:
            raise ValueError("max_dialogues must be positive")
        datasets = datasets[:max_dialogues]

    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    reports: list[dict[str, Any]] = []
    mode = "http" if endpoint_url else "in_process"
    for index, dataset in enumerate(datasets, start=1):
        source_row = dataset["metadata"]["source_row"]
        print(f"[{index}/{len(datasets)}] CSV row {source_row}", flush=True)
        if endpoint_url:
            report = ComprehensiveConversationRunner(
                HttpBackendClient(endpoint_url, bearer_token=bearer_token)
            ).run(
                dataset["conversation"],
                session_context={"session_type": session_type},
                metadata=dataset["metadata"],
            )
        else:
            report = run_comprehensive_analysis(
                dataset["conversation"],
                backend_path=backend_path,
                session_context={"session_type": session_type},
                metadata=dataset["metadata"],
            )
        dialogue_dir = destination / f"dialogue_{source_row:04d}"
        write_report(report, dialogue_dir, name_prefix="comprehensive_analysis")
        reports.append(report)

    summary = summarize_reports(reports)
    summary["backend_mode"] = mode
    summary["csv_path"] = str(csv_file)
    (destination / "comprehensive_analysis_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (destination / "comprehensive_analysis_summary.md").write_text(
        _summary_markdown(summary, destination), encoding="utf-8"
    )
    return summary


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--output-dir", type=Path, default=HERE / "results" / "comprehensive")
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument("--endpoint-url")
    parser.add_argument("--bearer-token")
    parser.add_argument("--session-type", default="CBT")
    parser.add_argument("--all-dialogues", action="store_true", help="Run every non-empty row in the CSV")
    parser.add_argument("--max-dialogues", type=int, help="Optional limit for a smaller batch trial")
    args = parser.parse_args(argv)
    summary = run_dataset(
        csv_path=args.csv,
        output_dir=args.output_dir,
        endpoint_url=args.endpoint_url,
        bearer_token=args.bearer_token,
        backend_path=args.backend,
        session_type=args.session_type,
        all_dialogues=args.all_dialogues,
        max_dialogues=args.max_dialogues,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Reports: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
