"""Realtime analysis experiment runner.

This module is deliberately kept outside the deployed backend.  It loads the
real Cloud Function locally, wraps its RAG and Gemini calls, and produces a
machine-readable report plus a readable conversation debrief.

Supported conversation inputs:

* HuggingFace IkeZhang format: ``[{"round", "user", "supporter"}]``
* Backend format: ``[{"speaker", "text", "timestamp"}]``
* Common chat format: ``[{"role": "user", "content": "..."}]``
* A plain string, treated as one patient turn

The public entry point is :func:`run_realtime_analysis`.  The CLI and the
optional HTTP API use that same entry point.
"""

from __future__ import annotations

import argparse
import csv
import html
import importlib.util
import json
import logging
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping, Protocol, Sequence


LOGGER = logging.getLogger(__name__)
HERE = Path(__file__).resolve().parent
DEFAULT_CSV = HERE / "huggingface_IkeZhang_MHDialog" / "test.csv"
DEFAULT_BACKEND = HERE.parent / "therapy-analysis-function" / "main.py"


@dataclass(frozen=True)
class ConversationTurn:
    """One normalized turn accepted by the backend."""

    speaker: str
    text: str
    timestamp: str = ""
    round_number: int | None = None

    def as_backend_turn(self) -> dict[str, str]:
        result = {"speaker": self.speaker, "text": self.text}
        if self.timestamp:
            result["timestamp"] = self.timestamp
        return result


@dataclass
class RetrievalObservation:
    datastore: str
    query: str
    duration_ms: int
    passages: list[str] = field(default_factory=list)
    source_titles: list[str] = field(default_factory=list)
    note: str = (
        "The production helper currently returns passage text and source titles "
        "separately; exact document-to-passage association is not exposed."
    )


@dataclass
class ModelAttemptObservation:
    prompt_name: str
    prompt: str | None
    request_started_at: float
    request_ended_at: float | None = None
    first_token_at: float | None = None
    response_chunks: int = 0

    @property
    def model_latency_ms(self) -> int | None:
        if self.request_ended_at is None:
            return None
        return round((self.request_ended_at - self.request_started_at) * 1000)

    @property
    def time_to_first_token_ms(self) -> int | None:
        if self.first_token_at is None:
            return None
        return round((self.first_token_at - self.request_started_at) * 1000)

    @property
    def completion_after_first_token_ms(self) -> int | None:
        if self.first_token_at is None or self.request_ended_at is None:
            return None
        return round((self.request_ended_at - self.first_token_at) * 1000)


@dataclass
class StepObservation:
    """All measurements for one cumulative conversation checkpoint."""

    step: int
    input_turns: list[dict[str, Any]]
    transcript_text: str
    request_latency_ms: int
    rag_prefetch_latency_ms: int | None
    prompt_assembly_latency_ms: int | None
    prompt_processing_and_thinking_latency_ms: int | None
    completion_latency_ms: int | None
    token_usage: dict[str, Any]
    rag: list[RetrievalObservation]
    model_attempts: list[ModelAttemptObservation]
    response: dict[str, Any]
    backend_status: int
    error: str | None = None


class AnalysisClient(Protocol):
    def analyze(self, payload: Mapping[str, Any]) -> tuple[int, dict[str, Any]]:
        """Send one analyze_segment request and return status and JSON result."""


class ConversationAdapter(Protocol):
    def adapt(self, value: Any) -> list[ConversationTurn]:
        """Convert an input value into normalized conversation turns."""


def _text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _speaker(value: Any, default: str = "Patient") -> str:
    role = _text(value).lower()
    if role in {"assistant", "supporter", "therapist", "counsellor", "counselor"}:
        return "Therapist"
    if role in {"user", "patient", "client", "human"}:
        return "Patient"
    return default


class FlexibleConversationAdapter:
    """Accept the known dataset/chat/backend representations."""

    def adapt(self, value: Any) -> list[ConversationTurn]:
        if isinstance(value, str):
            return [ConversationTurn("Patient", value)] if value.strip() else []

        if isinstance(value, Mapping):
            for key in ("conversation", "dialogue", "messages", "turns"):
                if key in value:
                    return self.adapt(value[key])
            raise ValueError("Conversation object must contain conversation, dialogue, messages, or turns")

        if not isinstance(value, Sequence) or isinstance(value, (bytes, bytearray)):
            raise ValueError("Conversation must be a string, object, or list")

        turns: list[ConversationTurn] = []
        for index, item in enumerate(value, start=1):
            if isinstance(item, str):
                turns.append(ConversationTurn("Patient", item, round_number=index))
                continue
            if not isinstance(item, Mapping):
                raise ValueError(f"Conversation item {index} must be an object or string")

            # HuggingFace IkeZhang_MHDialog: one object contains both speakers.
            if "user" in item or "supporter" in item:
                round_number = item.get("round", index)
                turns.extend(
                    [
                        ConversationTurn("Patient", _text(item.get("user")), round_number=round_number),
                        ConversationTurn("Therapist", _text(item.get("supporter")), round_number=round_number),
                    ]
                )
                continue

            if "text" in item:
                speaker = _speaker(item.get("speaker"), "Patient")
                text = _text(item.get("text"))
                if _text(item.get("speaker")).lower() == "conversation":
                    text = re.sub(r"^(?:therapist|patient|client|user|t|c|p):\s*", "", text, flags=re.IGNORECASE)
                turns.append(
                    ConversationTurn(
                        speaker,
                        text,
                        _text(item.get("timestamp")),
                        item.get("round"),
                    )
                )
                continue

            if "content" in item or "message" in item:
                speaker = _speaker(item.get("role", item.get("speaker")), "Patient")
                turns.append(
                    ConversationTurn(
                        speaker,
                        _text(item.get("content", item.get("message"))),
                        _text(item.get("timestamp")),
                        item.get("round"),
                    )
                )
                continue

            raise ValueError(f"Conversation item {index} is not a supported format: {sorted(item)}")

        return [turn for turn in turns if turn.text]


def load_first_csv_dialogue(csv_path: str | Path = DEFAULT_CSV) -> dict[str, Any]:
    """Load the first dialogue and its dataset metadata."""
    csv_file = Path(csv_path)
    with csv_file.open(newline="", encoding="utf-8") as handle:
        row = next(csv.DictReader(handle))
    return _csv_row_to_dialogue(row, 1, csv_file)


def _csv_row_to_dialogue(row: Mapping[str, str], row_number: int, csv_path: Path) -> dict[str, Any]:
    raw_dialogue = _text(row.get("Dialogue"))
    if not raw_dialogue:
        raise ValueError(f"CSV row {row_number} has an empty Dialogue field")
    try:
        dialogue = json.loads(raw_dialogue)
    except json.JSONDecodeError:
        # The dataset mixes JSON turn arrays with plain text dialogues. The
        # flexible adapter intentionally supports both representations.
        dialogue = raw_dialogue
    return {
        "conversation": dialogue,
        "metadata": {
            "dialog_intent": row.get("Dialog Intent", ""),
            "concern_type": row.get("Concern Type", ""),
            "level": row.get("Level", ""),
            "source_csv": str(csv_path),
            "source_row": row_number,
        },
    }


def load_csv_dialogues(csv_path: str | Path = DEFAULT_CSV) -> list[dict[str, Any]]:
    """Load every non-empty dialogue row and its dataset metadata."""
    dialogues: list[dict[str, Any]] = []
    with Path(csv_path).open(newline="", encoding="utf-8") as handle:
        for row_number, row in enumerate(csv.DictReader(handle), start=1):
            if not _text(row.get("Dialogue")):
                continue
            dialogues.append(_csv_row_to_dialogue(row, row_number, Path(csv_path)))
    if not dialogues:
        raise ValueError(f"No non-empty dialogues found in {csv_path}")
    return dialogues


def _extract_prompt(contents: Any) -> str:
    """Extract text from google.genai Content objects without depending on SDK internals."""
    parts: list[str] = []
    for content in contents if isinstance(contents, (list, tuple)) else [contents]:
        if isinstance(content, str):
            parts.append(content)
            continue
        for part in getattr(content, "parts", []) or []:
            text = getattr(part, "text", None)
            if text:
                parts.append(text)
    return "\n".join(parts)


def _extract_source_titles(passages: Iterable[str]) -> list[str]:
    titles: list[str] = []
    for passage in passages:
        match = re.search(r"\[Source:\s*(.*?)\]", passage)
        if match and match.group(1) not in titles:
            titles.append(match.group(1))
    return titles


class BackendModuleLoader:
    """Load the actual Cloud Function module from its hyphenated directory."""

    def __init__(self, path: str | Path = DEFAULT_BACKEND):
        self.path = Path(path).resolve()

    def load(self) -> Any:
        backend_dir = str(self.path.parent)
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        try:
            from dotenv import load_dotenv

            load_dotenv(self.path.parent / ".env", override=False)
        except ImportError:
            LOGGER.debug("python-dotenv is unavailable; relying on existing environment")
        spec = importlib.util.spec_from_file_location("therassist_realtime_backend", self.path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load backend module from {self.path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module


class _InstrumentedModels:
    def __init__(self, models: Any, observations: list[ModelAttemptObservation]):
        self._models = models
        self._observations = observations

    def generate_content_stream(self, *args: Any, **kwargs: Any) -> Iterable[Any]:
        prompt = _extract_prompt(kwargs.get("contents", args[1] if len(args) > 1 else ""))
        prompt_name = "unknown"
        if "for CRITICAL guidance only" in prompt:
            prompt_name = "REALTIME_ANALYSIS_PROMPT_STRICT"
        elif "for real-time guidance" in prompt:
            prompt_name = "REALTIME_ANALYSIS_PROMPT"
        observation = ModelAttemptObservation(prompt_name, prompt, time.perf_counter())
        self._observations.append(observation)
        try:
            stream = self._models.generate_content_stream(*args, **kwargs)
        except Exception:
            observation.request_ended_at = time.perf_counter()
            raise
        try:
            for chunk in stream:
                observation.response_chunks += 1
                if observation.first_token_at is None and _chunk_has_text(chunk):
                    observation.first_token_at = time.perf_counter()
                yield chunk
        finally:
            observation.request_ended_at = time.perf_counter()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._models, name)


class _InstrumentedClient:
    def __init__(self, client: Any, observations: list[ModelAttemptObservation]):
        self._client = client
        self.models = _InstrumentedModels(client.models, observations)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


def _chunk_has_text(chunk: Any) -> bool:
    try:
        candidate = chunk.candidates[0]
        return bool(candidate.content and candidate.content.parts and any(getattr(p, "text", None) for p in candidate.content.parts))
    except (AttributeError, IndexError, TypeError):
        return False


class LocalBackendClient:
    """Call the real function through Flask's local HTTP boundary."""

    mode = "in_process"

    def __init__(self, backend: Any):
        from flask import Flask, request

        self.backend = backend
        self.app = Flask("realtime-analysis-suite")
        # functions_framework.http wraps the function for the Cloud Functions
        # runtime. Flask's local test client already supplies the request, so
        # call the original function when the wrapper exposes it.
        handler = getattr(backend.therapy_analysis, "__wrapped__", backend.therapy_analysis)

        def route() -> Any:
            return handler(request)

        self.app.add_url_rule("/", view_func=route, methods=["GET", "POST", "OPTIONS"])

    def analyze(self, payload: Mapping[str, Any]) -> tuple[int, dict[str, Any]]:
        with self.app.test_client() as client:
            response = client.post("/", json=dict(payload))
            body = response.get_data(as_text=True).strip()
        # The function streams one JSON line for realtime analysis.
        line = body.splitlines()[-1] if body else "{}"
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            parsed = {"error": "Backend returned non-JSON output", "raw_response": body[:1000]}
        return response.status_code, parsed


class HttpBackendClient:
    """Call a locally deployed or online therapy-analysis HTTP service.

    The production service currently exposes aggregate diagnostics but not its
    internal prompt or prefetch passages. Those fields remain available in
    full when this suite runs in ``in-process`` mode.
    """

    mode = "http"

    def __init__(self, endpoint_url: str, bearer_token: str | None = None, timeout_seconds: int = 300):
        self.endpoint_url = endpoint_url.rstrip("/")
        self.bearer_token = bearer_token
        self.timeout_seconds = timeout_seconds

    def analyze(self, payload: Mapping[str, Any]) -> tuple[int, dict[str, Any]]:
        headers = {"Content-Type": "application/json"}
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        request = urllib.request.Request(
            self.endpoint_url,
            data=json.dumps(dict(payload), ensure_ascii=False).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                status = response.status
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            status = error.code
            body = error.read().decode("utf-8", errors="replace")
        except urllib.error.URLError as error:
            return 503, {"error": f"Could not reach analysis endpoint: {error.reason}"}

        line = body.strip().splitlines()[-1] if body.strip() else "{}"
        try:
            return status, json.loads(line)
        except json.JSONDecodeError:
            return status, {"error": "Analysis endpoint returned non-JSON output", "raw_response": body[:1000]}


class BackendInstrumentation:
    """Install temporary wrappers around the backend's RAG and model calls."""

    def __init__(self, backend: Any):
        self.backend = backend
        self.rag: list[RetrievalObservation] = []
        self.models: list[ModelAttemptObservation] = []
        self._original_query = None
        self._original_prefetch = None
        self._original_client = None
        self.last_rag_ended_at: float | None = None
        self.last_rag_started_at: float | None = None

    def __enter__(self) -> "BackendInstrumentation":
        self._original_query = self.backend._query_datastore
        self._original_prefetch = self.backend.prefetch_rag_context
        self._original_client = self.backend.client

        def query(datastore: str, query_text: str, max_results: int = 3) -> list[str]:
            started = time.perf_counter()
            passages = self._original_query(datastore, query_text, max_results)
            self.rag.append(
                RetrievalObservation(
                    datastore=datastore,
                    query=query_text,
                    duration_ms=round((time.perf_counter() - started) * 1000),
                    passages=list(passages),
                    source_titles=_extract_source_titles(passages),
                )
            )
            return passages

        def prefetch(session_context: Mapping[str, Any] | None, transcript_text: str) -> str:
            self.last_rag_started_at = time.perf_counter()
            result = self._original_prefetch(session_context, transcript_text)
            self.last_rag_ended_at = time.perf_counter()
            return result

        self.backend._query_datastore = query
        self.backend.prefetch_rag_context = prefetch
        self.backend.client = _InstrumentedClient(self._original_client, self.models)
        return self

    def __exit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        self.backend._query_datastore = self._original_query
        self.backend.prefetch_rag_context = self._original_prefetch
        self.backend.client = self._original_client


class RealtimeConversationRunner:
    """Run one analysis request at each cumulative conversation checkpoint."""

    def __init__(self, client: AnalysisClient, adapter: ConversationAdapter | None = None):
        self.client = client
        self.adapter = adapter or FlexibleConversationAdapter()

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
        previous_alert: dict[str, Any] | None = None
        for step_number, _turn in enumerate(turns, start=1):
            cumulative = turns[:step_number]
            payload = {
                "action": "analyze_segment",
                "is_realtime": True,
                "transcript_segment": [turn.as_backend_turn() for turn in cumulative],
                "session_duration_minutes": 0,
                "session_context": dict(session_context or {"session_type": "CBT"}),
            }
            if previous_alert:
                payload["previous_alert"] = previous_alert

            started = time.perf_counter()
            instrumentation = getattr(self.client, "instrumentation", None)
            rag_start = len(getattr(instrumentation, "rag", []))
            model_start = len(getattr(instrumentation, "models", []))
            status, response = self.client.analyze(payload)
            ended = time.perf_counter()
            diagnostics = response.get("_diagnostics", {}) if isinstance(response, dict) else {}
            observed_models = _observed_models(self.client, model_start)
            if not observed_models:
                observed_models = _attempt_from_backend_diagnostics(diagnostics)
            first_attempt = observed_models[0] if observed_models else None
            steps.append(
                StepObservation(
                    step=step_number,
                    input_turns=[turn.as_backend_turn() for turn in cumulative],
                    transcript_text="\n".join(f"{turn.speaker}: {turn.text}" for turn in cumulative),
                    request_latency_ms=round((ended - started) * 1000),
                    rag_prefetch_latency_ms=_rag_prefetch_latency(self.client),
                    prompt_assembly_latency_ms=_prompt_assembly_latency(self.client, model_start),
                    prompt_processing_and_thinking_latency_ms=first_attempt.time_to_first_token_ms if first_attempt else None,
                    completion_latency_ms=first_attempt.completion_after_first_token_ms if first_attempt else None,
                    token_usage=dict(diagnostics.get("token_usage", {})),
                    rag=_observed_rag(self.client, rag_start),
                    model_attempts=observed_models,
                    response=response,
                    backend_status=status,
                    error=response.get("error") if isinstance(response, dict) else "Invalid response",
                )
            )
            alert = response.get("alert") if isinstance(response, dict) else None
            previous_alert = alert if isinstance(alert, dict) else previous_alert

        return {
            "schema_version": "1.0",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": dict(metadata or {}),
            "session_context": dict(session_context or {"session_type": "CBT"}),
            "backend_mode": getattr(self.client, "mode", "custom"),
            "conversation": [asdict(turn) for turn in turns],
            "summary": summarize_steps(steps),
            "steps": [step_to_dict(step) for step in steps],
        }


def _observed_rag(client: AnalysisClient, start: int = 0) -> list[RetrievalObservation]:
    instrumentation = getattr(client, "instrumentation", None)
    return list(getattr(instrumentation, "rag", [])[start:]) if instrumentation else []


def _observed_models(client: AnalysisClient, start: int = 0) -> list[ModelAttemptObservation]:
    instrumentation = getattr(client, "instrumentation", None)
    return list(getattr(instrumentation, "models", [])[start:]) if instrumentation else []


def _attempt_from_backend_diagnostics(diagnostics: Mapping[str, Any]) -> list[ModelAttemptObservation]:
    """Create one aggregate attempt from diagnostics returned over HTTP."""
    latency_ms = diagnostics.get("latency_ms")
    ttft_ms = diagnostics.get("ttft_ms")
    if not isinstance(latency_ms, (int, float)):
        return []
    return [
        ModelAttemptObservation(
            prompt_name=str(diagnostics.get("prompt_used", "unknown")),
            prompt=None,
            request_started_at=0.0,
            request_ended_at=float(latency_ms) / 1000,
            first_token_at=float(ttft_ms) / 1000 if isinstance(ttft_ms, (int, float)) else None,
        )
    ]


def _prompt_assembly_latency(client: AnalysisClient, model_start: int) -> int | None:
    """Return the interval between RAG completion and the first model call when available."""
    instrumentation = getattr(client, "instrumentation", None)
    if not instrumentation or len(instrumentation.models) <= model_start:
        return None
    model_started_at = instrumentation.models[model_start].request_started_at
    rag_ended = getattr(instrumentation, "last_rag_ended_at", None)
    if rag_ended is None:
        return None
    return max(0, round((model_started_at - rag_ended) * 1000))


def _rag_prefetch_latency(client: AnalysisClient) -> int | None:
    instrumentation = getattr(client, "instrumentation", None)
    started = getattr(instrumentation, "last_rag_started_at", None)
    ended = getattr(instrumentation, "last_rag_ended_at", None)
    if started is None or ended is None:
        return None
    return round((ended - started) * 1000)


def summarize_steps(steps: Sequence[StepObservation]) -> dict[str, Any]:
    model_attempts = [attempt for step in steps for attempt in step.model_attempts]
    rag_calls = [call for step in steps for call in step.rag]
    token_totals: dict[str, int] = {}
    for step in steps:
        usage = step.response.get("_diagnostics", {}).get("token_usage", {})
        for key, value in usage.items():
            if isinstance(value, int):
                token_totals[key] = token_totals.get(key, 0) + value
    return {
        "steps": len(steps),
        "successful_steps": sum(1 for step in steps if step.backend_status == 200 and not step.error),
        "alerts": sum(1 for step in steps if step.response.get("alert")),
        "rag_calls": len(rag_calls),
        "unique_datastores": sorted({call.datastore for call in rag_calls}),
        "model_attempts": len(model_attempts),
        "fallback_attempts": sum(1 for step in steps if step.response.get("_diagnostics", {}).get("used_fallback")),
        "token_totals": token_totals,
        "average_request_latency_ms": _average([step.request_latency_ms for step in steps]),
        "average_ttft_ms": _average([a.time_to_first_token_ms for a in model_attempts]),
        "average_completion_after_first_token_ms": _average([a.completion_after_first_token_ms for a in model_attempts]),
        "thinking_tokens_reported": token_totals.get("thinking_tokens"),
        "latency_note": (
            "The realtime backend disables an explicit thinking configuration. "
            "TTFT combines server prompt processing and any hidden thinking; "
            "completion_after_first_token is the observable generation interval."
        ),
    }


def _average(values: Iterable[int | None]) -> float | None:
    numbers = [value for value in values if value is not None]
    return round(sum(numbers) / len(numbers), 2) if numbers else None


def model_attempt_to_dict(attempt: ModelAttemptObservation) -> dict[str, Any]:
    result = asdict(attempt)
    result.update(
        {
            "model_latency_ms": attempt.model_latency_ms,
            "time_to_first_token_ms": attempt.time_to_first_token_ms,
            "completion_after_first_token_ms": attempt.completion_after_first_token_ms,
        }
    )
    return result


def step_to_dict(step: StepObservation) -> dict[str, Any]:
    result = asdict(step)
    result["model_attempts"] = [model_attempt_to_dict(attempt) for attempt in step.model_attempts]
    return result


def report_markdown(report: Mapping[str, Any]) -> str:
    """Render the JSON report as a step-by-step debrief."""
    summary = report["summary"]
    lines = [
        "# Realtime analysis debrief",
        "",
        f"Steps: {summary['steps']} | alerts: {summary['alerts']} | model attempts: {summary['model_attempts']}",
        f"RAG calls: {summary['rag_calls']} | datastores: {', '.join(summary['unique_datastores']) or 'none'}",
        f"Token totals: `{json.dumps(summary['token_totals'], sort_keys=True)}`",
        "",
        f"> {summary['latency_note']}",
        "",
    ]
    for step in report["steps"]:
        lines.extend([
            f"## Step {step['step']}",
            "",
            f"**Transcript checkpoint** ({len(step['input_turns'])} turns):",
            "",
            "```text",
            step["transcript_text"],
            "```",
            "",
            (
                f"Latency — request: **{step['request_latency_ms']} ms**; RAG prefetch: "
                f"**{step['rag_prefetch_latency_ms']} ms**; prompt assembly: "
                f"**{step['prompt_assembly_latency_ms']} ms**; prompt processing/thinking "
                f"(TTFT): **{step['prompt_processing_and_thinking_latency_ms']} ms**; "
                f"completion after TTFT: **{step['completion_latency_ms']} ms**"
            ),
            f"Token usage: `{json.dumps(step['token_usage'], ensure_ascii=False)}`",
            "",
            "### RAG",
            "",
        ])
        if not step["rag"]:
            lines.append("No RAG observations captured (the backend may have failed before retrieval or instrumentation was not installed).")
        for retrieval in step["rag"]:
            lines.extend([
                f"- **{retrieval['datastore']}** — {retrieval['duration_ms']} ms",
                f"  - Trigger query: `{retrieval['query']}`",
                f"  - Source titles: {', '.join(retrieval['source_titles']) or 'not returned'}",
            ])
            for index, passage in enumerate(retrieval["passages"], start=1):
                lines.append(f"  - Chunk {index}: {passage}")
        lines.extend(["", "### Model attempts", ""])
        for attempt in step["model_attempts"]:
            lines.extend([
                f"- **{attempt['prompt_name']}** — total {attempt['model_latency_ms']} ms; TTFT {attempt['time_to_first_token_ms']} ms; completion after TTFT {attempt['completion_after_first_token_ms']} ms",
                "  - Prompt sent:",
                "",
                "    ```text",
                "    " + (attempt["prompt"] or "[Prompt is not exposed by the HTTP service]").replace("\n", "\n    "),
                "    ```",
            ])
        diagnostics = step["response"].get("_diagnostics", {})
        lines.extend([
            "",
            f"Result: `{json.dumps(step['response'], ensure_ascii=False)}`",
            f"Diagnostics: `{json.dumps(diagnostics, ensure_ascii=False)}`",
            "",
        ])
    return "\n".join(lines)


def _html_text(value: Any) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def _chart_svg(
    title: str,
    series: Sequence[tuple[str, Sequence[int | float | None], str]],
    y_label: str,
) -> str:
    """Render a dependency-free grouped bar chart as inline SVG."""
    width, height = 960, 340
    left, right, top, bottom = 64, 24, 28, 58
    plot_width = width - left - right
    plot_height = height - top - bottom
    step_count = max((len(values) for _, values, _ in series), default=0)
    values = [value for _, data, _ in series for value in data if isinstance(value, (int, float))]
    if not values or not step_count:
        return (
            '<div class="empty-chart">'
            f'<h3>{_html_text(title)}</h3>'
            '<p>No measurements were returned for this chart.</p>'
            '</div>'
        )

    maximum = max(values)
    y_max = max(1, maximum * 1.15)
    group_width = plot_width / step_count
    bar_width = max(4, min(28, group_width / max(len(series), 1) - 5))
    parts = [
        f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" aria-label="{_html_text(title)}">',
        f'<text class="chart-title" x="{width / 2:.1f}" y="16" text-anchor="middle">{_html_text(title)}</text>',
    ]
    for tick in range(5):
        value = y_max * tick / 4
        y = top + plot_height - (plot_height * tick / 4)
        parts.append(f'<line class="grid" x1="{left}" y1="{y:.1f}" x2="{width - right}" y2="{y:.1f}" />')
        parts.append(f'<text class="axis-label" x="{left - 8}" y="{y + 4:.1f}" text-anchor="end">{value:.0f}</text>')
    parts.append(f'<text class="axis-name" x="14" y="{top + plot_height / 2:.1f}" transform="rotate(-90 14 {top + plot_height / 2:.1f})" text-anchor="middle">{_html_text(y_label)}</text>')

    for step_index in range(step_count):
        center = left + group_width * (step_index + 0.5)
        parts.append(f'<text class="axis-label" x="{center:.1f}" y="{height - 34}" text-anchor="middle">{step_index + 1}</text>')
        for series_index, (label, data, color) in enumerate(series):
            value = data[step_index] if step_index < len(data) else None
            if not isinstance(value, (int, float)):
                continue
            x = center + (series_index - (len(series) - 1) / 2) * (bar_width + 4) - bar_width / 2
            bar_height = plot_height * value / y_max
            y = top + plot_height - bar_height
            parts.append(
                f'<rect class="bar" x="{x:.1f}" y="{y:.1f}" width="{bar_width:.1f}" height="{bar_height:.1f}" fill="{color}">'
                f'<title>Step {step_index + 1}, {_html_text(label)}: {value:g}</title></rect>'
            )

    legend_x = left
    for label, _, color in series:
        parts.append(f'<rect x="{legend_x}" y="{height - 20}" width="12" height="12" fill="{color}" />')
        parts.append(f'<text class="legend" x="{legend_x + 17}" y="{height - 10}">{_html_text(label)}</text>')
        legend_x += max(110, len(label) * 7 + 34)
    parts.append("</svg>")
    return "".join(parts)


def _step_token_value(step: Mapping[str, Any], names: Sequence[str]) -> int | float | None:
    usage = step.get("token_usage", {})
    if not isinstance(usage, Mapping):
        return None
    for name in names:
        value = usage.get(name)
        if isinstance(value, (int, float)):
            return value
    return None


def report_html(report: Mapping[str, Any]) -> str:
    """Render a self-contained HTML report with charts and RAG debrief."""
    summary = report["summary"]
    steps = report.get("steps", [])
    request_latency = [step.get("request_latency_ms") for step in steps]
    latency_series = [
        ("Request", request_latency, "#2563eb"),
        ("RAG prefetch", [step.get("rag_prefetch_latency_ms") for step in steps], "#059669"),
        ("Prompt assembly", [step.get("prompt_assembly_latency_ms") for step in steps], "#d97706"),
        ("Prompt/thinking (TTFT)", [step.get("prompt_processing_and_thinking_latency_ms") for step in steps], "#7c3aed"),
        ("Completion", [step.get("completion_latency_ms") for step in steps], "#dc2626"),
    ]
    token_series = [
        ("Prompt", [_step_token_value(step, ("prompt_tokens", "input_tokens", "prompt_token_count")) for step in steps], "#2563eb"),
        ("Completion", [_step_token_value(step, ("completion_tokens", "output_tokens", "completion_token_count")) for step in steps], "#059669"),
        ("Thinking", [_step_token_value(step, ("thinking_tokens", "thoughts_tokens", "thinking_token_count")) for step in steps], "#7c3aed"),
    ]

    summary_cards = "".join(
        f'<div class="summary-card"><span>{_html_text(label)}</span><strong>{_html_text(value)}</strong></div>'
        for label, value in (
            ("Steps", summary.get("steps", 0)),
            ("Successful", summary.get("successful_steps", 0)),
            ("Alerts", summary.get("alerts", 0)),
            ("RAG calls", summary.get("rag_calls", 0)),
            ("Model attempts", summary.get("model_attempts", 0)),
            ("Avg request latency", f"{summary.get('average_request_latency_ms', 'n/a')} ms"),
        )
    )

    step_sections: list[str] = []
    for step in steps:
        rag_sections: list[str] = []
        for retrieval in step.get("rag", []):
            titles = ", ".join(retrieval.get("source_titles", [])) or "Not returned"
            chunks = retrieval.get("passages", [])
            chunk_html = "".join(
                f'<details class="chunk"><summary>Chunk {index}</summary><pre>{_html_text(passage)}</pre></details>'
                for index, passage in enumerate(chunks, start=1)
            )
            chunk_content = chunk_html or '<p class="muted">No chunks returned.</p>'
            rag_sections.append(
                '<article class="rag-card">'
                f'<h4>{_html_text(retrieval.get("datastore", "Unknown datastore"))} '
                f'<span class="muted">{_html_text(retrieval.get("duration_ms", "n/a"))} ms</span></h4>'
                f'<p><strong>RAG trigger query</strong></p><pre>{_html_text(retrieval.get("query", ""))}</pre>'
                f'<p><strong>Documents/source titles:</strong> {_html_text(titles)}</p>'
                f'{chunk_content}'
                '</article>'
            )
        if not rag_sections:
            rag_sections.append('<p class="muted">No RAG observations captured.</p>')

        attempts: list[str] = []
        for attempt in step.get("model_attempts", []):
            prompt = attempt.get("prompt") or "[Prompt is not exposed by the HTTP service]"
            attempts.append(
                '<article class="attempt">'
                f'<h4>{_html_text(attempt.get("prompt_name", "Unknown prompt"))}</h4>'
                f'<p>Total: {_html_text(attempt.get("model_latency_ms", "n/a"))} ms; '
                f'TTFT: {_html_text(attempt.get("time_to_first_token_ms", "n/a"))} ms; '
                f'completion after TTFT: {_html_text(attempt.get("completion_after_first_token_ms", "n/a"))} ms</p>'
                f'<details><summary>Exact prompt</summary><pre>{_html_text(prompt)}</pre></details>'
                '</article>'
            )
        if not attempts:
            attempts.append('<p class="muted">No model attempts captured.</p>')

        diagnostics = step.get("response", {}).get("_diagnostics", {})
        step_sections.append(
            '<details class="step" open>'
            f'<summary>Step {step.get("step", "?")} — request {_html_text(step.get("request_latency_ms", "n/a"))} ms; '
            f'{len(step.get("rag", []))} RAG calls</summary>'
            f'<h3>Conversation checkpoint</h3><pre>{_html_text(step.get("transcript_text", ""))}</pre>'
            '<div class="metric-row">'
            f'<div><b>Request</b><br>{_html_text(step.get("request_latency_ms", "n/a"))} ms</div>'
            f'<div><b>RAG prefetch</b><br>{_html_text(step.get("rag_prefetch_latency_ms", "n/a"))} ms</div>'
            f'<div><b>Prompt assembly</b><br>{_html_text(step.get("prompt_assembly_latency_ms", "n/a"))} ms</div>'
            f'<div><b>Prompt/thinking</b><br>{_html_text(step.get("prompt_processing_and_thinking_latency_ms", "n/a"))} ms</div>'
            f'<div><b>Completion</b><br>{_html_text(step.get("completion_latency_ms", "n/a"))} ms</div>'
            f'<div><b>Tokens</b><br>{_html_text(json.dumps(step.get("token_usage", {}), ensure_ascii=False))}</div>'
            '</div>'
            '<h3>RAG step-by-step</h3>'
            '<p class="muted">Each card is one datastore query. Source titles are the document metadata returned by the backend; exact document-to-chunk association is not exposed by the production helper.</p>'
            + "".join(rag_sections)
            + '<h3>Model attempts</h3>'
            + "".join(attempts)
            + f'<h3>Backend result</h3><pre>{_html_text(json.dumps(step.get("response", {}), indent=2, ensure_ascii=False))}</pre>'
            + f'<details><summary>Diagnostics</summary><pre>{_html_text(json.dumps(diagnostics, indent=2, ensure_ascii=False))}</pre></details>'
            + '</details>'
        )

    metadata = report.get("metadata", {})
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Realtime analysis report</title>
<style>
:root {{ color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f4f6fa; }}
body {{ margin: 0; }}
main {{ max-width: 1200px; margin: auto; padding: 28px; }}
h1 {{ margin-bottom: 6px; }}
h2 {{ margin-top: 30px; }}
.muted {{ color: #64748b; }}
.meta {{ color: #475569; margin-bottom: 22px; }}
.summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 12px; }}
.summary-card, .chart-card, .step, .rag-card, .attempt {{ background: white; border: 1px solid #dbe2ec; border-radius: 10px; box-shadow: 0 2px 8px #1720330d; }}
.summary-card {{ padding: 14px; }}
.summary-card span {{ display: block; color: #64748b; font-size: 0.85rem; }}
.summary-card strong {{ display: block; font-size: 1.3rem; margin-top: 6px; }}
.charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 16px; }}
.chart-card {{ padding: 12px; overflow-x: auto; }}
.chart {{ width: 100%; min-width: 440px; height: auto; }}
.chart-title {{ fill: #172033; font-weight: 600; font-size: 14px; }}
.grid {{ stroke: #e2e8f0; stroke-width: 1; }}
.axis-label, .legend {{ fill: #64748b; font-size: 11px; }}
.axis-name {{ fill: #64748b; font-size: 11px; }}
.bar {{ opacity: .88; }}
.empty-chart {{ color: #64748b; min-height: 130px; padding: 30px; text-align: center; }}
.step {{ margin: 14px 0; padding: 0 18px 18px; }}
.step > summary {{ cursor: pointer; font-weight: 600; padding: 17px 0; }}
.metric-row {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin: 12px 0 22px; }}
.metric-row > div {{ background: #f8fafc; border-radius: 7px; padding: 10px; font-size: .9rem; overflow-wrap: anywhere; }}
.rag-card, .attempt {{ padding: 14px; margin: 12px 0; box-shadow: none; }}
.rag-card h4, .attempt h4 {{ margin: 0 0 8px; }}
.rag-card pre, .attempt pre, pre {{ white-space: pre-wrap; overflow-wrap: anywhere; background: #f8fafc; border-radius: 6px; padding: 10px; }}
.chunk {{ margin: 8px 0; }}
.chunk summary, .attempt details summary, .step details summary {{ cursor: pointer; color: #334155; }}
</style>
</head>
<body>
<main>
<h1>Realtime analysis report</h1>
<p class="meta">Backend mode: <b>{_html_text(report.get("backend_mode", "unknown"))}</b> · Generated: {_html_text(report.get("generated_at", ""))} · Metadata: {_html_text(json.dumps(metadata, ensure_ascii=False))}</p>
<div class="summary">{summary_cards}</div>
<p class="muted">{_html_text(summary.get("latency_note", ""))}</p>
<h2>Figures</h2>
<div class="charts">
<div class="chart-card">{_chart_svg("Latency by cumulative conversation step", latency_series, "milliseconds")}</div>
<div class="chart-card">{_chart_svg("Token usage by cumulative conversation step", token_series, "tokens")}</div>
</div>
<h2>Step-by-step conversation and RAG</h2>
<p class="muted">Steps are cumulative checkpoints. Expand each step to inspect the transcript, RAG trigger query, source documents, retrieved chunks, prompts, and backend result.</p>
{"".join(step_sections)}
</main>
</body>
</html>
'''


def run_realtime_analysis(
    conversation: Any,
    *,
    backend_path: str | Path = DEFAULT_BACKEND,
    session_context: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a real local backend experiment for any supported conversation format."""
    backend = BackendModuleLoader(backend_path).load()
    instrumentation = BackendInstrumentation(backend)
    client = LocalBackendClient(backend)
    client.instrumentation = instrumentation
    with instrumentation:
        return RealtimeConversationRunner(client).run(
            conversation,
            session_context=session_context,
            metadata=metadata,
        )


def write_report(report: Mapping[str, Any], output_dir: str | Path) -> tuple[Path, Path, Path]:
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    json_path = destination / "realtime_analysis_report.json"
    markdown_path = destination / "realtime_analysis_debrief.md"
    html_path = destination / "realtime_analysis_report.html"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    markdown_path.write_text(report_markdown(report), encoding="utf-8")
    html_path.write_text(report_html(report), encoding="utf-8")
    return json_path, markdown_path, html_path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="CSV containing the dialogue")
    parser.add_argument("--output-dir", type=Path, default=HERE / "results")
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument(
        "--endpoint-url",
        help="Use a local or online HTTP service instead of in-process instrumentation",
    )
    parser.add_argument("--bearer-token", help="Optional bearer token for an authenticated HTTP endpoint")
    parser.add_argument("--session-type", default="CBT")
    args = parser.parse_args(argv)

    dataset = load_first_csv_dialogue(args.csv)
    if args.endpoint_url:
        client = HttpBackendClient(args.endpoint_url, bearer_token=args.bearer_token)
        report = RealtimeConversationRunner(client).run(
            dataset["conversation"],
            session_context={"session_type": args.session_type},
            metadata=dataset["metadata"],
        )
    else:
        report = run_realtime_analysis(
            dataset["conversation"],
            backend_path=args.backend,
            session_context={"session_type": args.session_type},
            metadata=dataset["metadata"],
        )
    json_path, markdown_path, html_path = write_report(report, args.output_dir)
    print(json.dumps(report["summary"], indent=2))
    print(f"JSON report: {json_path}")
    print(f"Debrief: {markdown_path}")
    print(f"HTML report: {html_path}")
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(main())
