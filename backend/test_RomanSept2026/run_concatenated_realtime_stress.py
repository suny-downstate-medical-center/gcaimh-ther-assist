"""Stress the realtime pipeline with test + train + validation as one transcript.

The input sent at each checkpoint is cumulative.  By default, one request is
made after every 50 source dialogues and the final request therefore contains
the complete concatenation of all three CSV files.  Use a stride of 1 to test
every source-dialogue boundary.
"""

from __future__ import annotations

import argparse
import bisect
import json
import statistics
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from realtime_analysis_suite import (  # noqa: E402
    DEFAULT_BACKEND,
    FlexibleConversationAdapter,
    HttpBackendClient,
    RealtimeConversationRunner,
    StepObservation,
    load_csv_dialogues,
    run_realtime_analysis,
    write_report,
)


DEFAULT_DATASET_DIR = HERE / "huggingface_IkeZhang_MHDialog"
DEFAULT_CSVS = tuple(DEFAULT_DATASET_DIR / name for name in ("test.csv", "train.csv", "val.csv"))


@dataclass(frozen=True)
class DialogueBoundary:
    dialogue_number: int
    split: str
    source_csv: str
    source_row: int
    first_turn: int
    last_turn: int
    cumulative_characters: int
    cumulative_words: int


@dataclass
class ConcatenatedDataset:
    turns: list[dict[str, str]]
    boundaries: list[DialogueBoundary]
    csv_files: list[str]
    split_dialogue_counts: dict[str, int]
    split_turn_counts: dict[str, int]
    cumulative_characters_by_turn: list[int]
    cumulative_words_by_turn: list[int]

    @property
    def total_characters(self) -> int:
        return self.boundaries[-1].cumulative_characters

    @property
    def total_words(self) -> int:
        return self.boundaries[-1].cumulative_words


def load_concatenated_dataset(
    csv_paths: Sequence[str | Path],
    *,
    max_dialogues_per_split: int | None = None,
    max_dialogues: int | None = None,
) -> ConcatenatedDataset:
    """Normalize and concatenate non-empty dialogues in the supplied order."""
    if not csv_paths:
        raise ValueError("At least one CSV file is required")
    if max_dialogues_per_split is not None and max_dialogues_per_split < 1:
        raise ValueError("max_dialogues_per_split must be positive")
    if max_dialogues is not None and max_dialogues < 1:
        raise ValueError("max_dialogues must be positive")

    adapter = FlexibleConversationAdapter()
    turns: list[dict[str, str]] = []
    boundaries: list[DialogueBoundary] = []
    split_dialogue_counts: dict[str, int] = {}
    split_turn_counts: dict[str, int] = {}
    cumulative_characters = 0
    cumulative_words = 0
    cumulative_characters_by_turn: list[int] = []
    cumulative_words_by_turn: list[int] = []
    resolved_paths: list[str] = []

    for csv_path in csv_paths:
        path = Path(csv_path).resolve()
        resolved_paths.append(str(path))
        split = path.stem
        split_dialogue_counts[split] = 0
        split_turn_counts[split] = 0
        if max_dialogues is not None and len(boundaries) >= max_dialogues:
            continue
        dialogues = load_csv_dialogues(path)
        if max_dialogues_per_split is not None:
            dialogues = dialogues[:max_dialogues_per_split]
        if max_dialogues is not None:
            dialogues = dialogues[: max_dialogues - len(boundaries)]

        for dialogue in dialogues:
            normalized = adapter.adapt(dialogue["conversation"])
            if not normalized:
                continue
            first_turn = len(turns) + 1
            for turn in normalized:
                rendered = f"{turn.speaker}: {turn.text}"
                if turns:
                    cumulative_characters += 1  # newline between rendered turns
                cumulative_characters += len(rendered)
                cumulative_words += len(rendered.split())
                turns.append(turn.as_backend_turn())
                cumulative_characters_by_turn.append(cumulative_characters)
                cumulative_words_by_turn.append(cumulative_words)
            split_dialogue_counts[split] += 1
            split_turn_counts[split] += len(normalized)
            boundaries.append(
                DialogueBoundary(
                    dialogue_number=len(boundaries) + 1,
                    split=split,
                    source_csv=str(path),
                    source_row=int(dialogue["metadata"]["source_row"]),
                    first_turn=first_turn,
                    last_turn=len(turns),
                    cumulative_characters=cumulative_characters,
                    cumulative_words=cumulative_words,
                )
            )

    if not turns:
        raise ValueError("The selected CSV files contain no conversation turns")
    return ConcatenatedDataset(
        turns=turns,
        boundaries=boundaries,
        csv_files=resolved_paths,
        split_dialogue_counts=split_dialogue_counts,
        split_turn_counts=split_turn_counts,
        cumulative_characters_by_turn=cumulative_characters_by_turn,
        cumulative_words_by_turn=cumulative_words_by_turn,
    )


def select_checkpoints(
    dataset: ConcatenatedDataset,
    *,
    every_dialogues: int = 50,
    dialogue_numbers: Sequence[int] | None = None,
) -> list[DialogueBoundary]:
    """Choose cumulative source-dialogue boundaries, always including the end."""
    total = len(dataset.boundaries)
    if dialogue_numbers is None:
        if every_dialogues < 1:
            raise ValueError("every_dialogues must be positive")
        selected = list(range(every_dialogues, total + 1, every_dialogues))
    else:
        requested = list(dialogue_numbers)
        if not requested:
            raise ValueError("dialogue_numbers must not be empty")
        if any(not isinstance(number, int) or isinstance(number, bool) for number in requested):
            raise ValueError("dialogue_numbers must contain only integers")
        selected = sorted(set(requested))
        if selected[0] < 1 or selected[-1] > total:
            raise ValueError(f"dialogue_numbers must be between 1 and {total} inclusive")
    if not selected or selected[-1] != total:
        selected.append(total)
    return [dataset.boundaries[number - 1] for number in selected]


def select_turn_checkpoints(
    dataset: ConcatenatedDataset,
    *,
    every_turns: int = 1,
) -> list[DialogueBoundary]:
    """Choose cumulative turn checkpoints, including the final turn."""
    if every_turns < 1:
        raise ValueError("every_turns must be positive")
    total_turns = len(dataset.turns)
    selected = list(range(every_turns, total_turns + 1, every_turns))
    if not selected or selected[-1] != total_turns:
        selected.append(total_turns)
    dialogue_ends = [boundary.last_turn for boundary in dataset.boundaries]
    checkpoints: list[DialogueBoundary] = []
    for turn_number in selected:
        source = dataset.boundaries[bisect.bisect_left(dialogue_ends, turn_number)]
        checkpoints.append(
            DialogueBoundary(
                dialogue_number=source.dialogue_number,
                split=source.split,
                source_csv=source.source_csv,
                source_row=source.source_row,
                first_turn=source.first_turn,
                last_turn=turn_number,
                cumulative_characters=dataset.cumulative_characters_by_turn[turn_number - 1],
                cumulative_words=dataset.cumulative_words_by_turn[turn_number - 1],
            )
        )
    return checkpoints


def _is_timeout(step: Mapping[str, Any]) -> bool:
    error = str(step.get("error") or "").lower()
    return step.get("backend_status") == 504 or "timed out" in error or "timeout" in error


def _median(values: Sequence[int | float | None]) -> float | None:
    numbers = [float(value) for value in values if isinstance(value, (int, float))]
    return round(statistics.median(numbers), 2) if numbers else None


def _ratio(value: Any, baseline: float | None) -> float | None:
    if not isinstance(value, (int, float)) or not baseline:
        return None
    return round(value / baseline, 2)


def build_stress_summary(
    report: Mapping[str, Any],
    dataset: ConcatenatedDataset,
    checkpoints: Sequence[DialogueBoundary],
    *,
    degradation_ratio: float = 2.0,
) -> dict[str, Any]:
    """Add context-size and degradation diagnostics to the normal report."""
    if degradation_ratio <= 1:
        raise ValueError("degradation_ratio must be greater than 1")
    steps = list(report.get("steps", []))
    if len(steps) != len(checkpoints):
        raise ValueError("Report steps do not align with the selected checkpoints")

    successful = [
        step
        for step in steps
        if step.get("backend_status") == 200 and not step.get("error")
    ]
    baseline_steps = successful[:3]
    baseline_latency = _median([step.get("request_latency_ms") for step in baseline_steps])
    baseline_ttft = _median(
        [step.get("prompt_processing_and_thinking_latency_ms") for step in baseline_steps]
    )

    checkpoint_results: list[dict[str, Any]] = []
    for step, boundary in zip(steps, checkpoints):
        latency_ratio = _ratio(step.get("request_latency_ms"), baseline_latency)
        ttft_ratio = _ratio(step.get("prompt_processing_and_thinking_latency_ms"), baseline_ttft)
        timed_out = _is_timeout(step)
        is_success = step.get("backend_status") == 200 and not step.get("error")
        degradation_signal = is_success and any(
            ratio is not None and ratio >= degradation_ratio
            for ratio in (latency_ratio, ttft_ratio)
        )
        checkpoint_results.append(
            {
                "dialogue_number": boundary.dialogue_number,
                "ending_split": boundary.split,
                "ending_source_row": boundary.source_row,
                "cumulative_turns": boundary.last_turn,
                "cumulative_characters": boundary.cumulative_characters,
                "cumulative_words": boundary.cumulative_words,
                "estimated_input_tokens": round(boundary.cumulative_characters / 4),
                "reported_prompt_tokens": step.get("token_usage", {}).get("prompt_tokens"),
                "backend_status": step.get("backend_status"),
                "outcome": "timeout" if timed_out else "success" if is_success else "failure",
                "error": step.get("error"),
                "request_latency_ms": step.get("request_latency_ms"),
                "ttft_ms": step.get("prompt_processing_and_thinking_latency_ms"),
                "completion_latency_ms": step.get("completion_latency_ms"),
                "request_latency_vs_baseline": latency_ratio,
                "ttft_vs_baseline": ttft_ratio,
                "degradation_signal": degradation_signal,
            }
        )

    successful_results = [item for item in checkpoint_results if item["outcome"] == "success"]
    tail = successful_results[-min(3, len(successful_results)) :]
    tail_latency = _median([item["request_latency_ms"] for item in tail])
    tail_ttft = _median([item["ttft_ms"] for item in tail])
    failures = [item for item in checkpoint_results if item["outcome"] != "success"]
    return {
        "schema_version": "1.0",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "experiment": "concatenated_realtime_long_context_stress",
        "backend_mode": report.get("backend_mode"),
        "dataset": {
            "csv_files": dataset.csv_files,
            "concatenation_order": [Path(path).stem for path in dataset.csv_files],
            "split_dialogue_counts": dataset.split_dialogue_counts,
            "split_turn_counts": dataset.split_turn_counts,
            "total_dialogues": len(dataset.boundaries),
            "total_turns": len(dataset.turns),
            "total_characters": dataset.total_characters,
            "total_words": dataset.total_words,
            "estimated_input_tokens": round(dataset.total_characters / 4),
        },
        "checkpoint_count": len(checkpoint_results),
        "successful_checkpoints": len(successful_results),
        "failed_checkpoints": len(failures),
        "timeout_checkpoints": sum(item["outcome"] == "timeout" for item in checkpoint_results),
        "first_failed_checkpoint": failures[0] if failures else None,
        "largest_successful_context": successful_results[-1] if successful_results else None,
        "degradation_heuristic": {
            "ratio_threshold": degradation_ratio,
            "baseline": "median of the first three successful checkpoints",
            "baseline_request_latency_ms": baseline_latency,
            "baseline_ttft_ms": baseline_ttft,
            "tail_request_latency_ms": tail_latency,
            "tail_ttft_ms": tail_ttft,
            "tail_request_latency_vs_baseline": _ratio(tail_latency, baseline_latency),
            "tail_ttft_vs_baseline": _ratio(tail_ttft, baseline_ttft),
            "checkpoints_flagged": sum(item["degradation_signal"] for item in checkpoint_results),
            "note": (
                "A signal means request latency or TTFT met the configured ratio. "
                "It is a screening heuristic, not proof of model-quality degradation."
            ),
        },
        "checkpoints": checkpoint_results,
    }


def stress_summary_markdown(summary: Mapping[str, Any]) -> str:
    dataset = summary["dataset"]
    heuristic = summary["degradation_heuristic"]
    lines = [
        "# Concatenated realtime long-context stress test",
        "",
        f"Backend mode: `{summary['backend_mode']}`",
        f"Concatenation order: `{' + '.join(dataset['concatenation_order'])}`",
        (
            f"Dialogues: **{dataset['total_dialogues']}** | turns: **{dataset['total_turns']}** "
            f"| words: **{dataset['total_words']}** | estimated input tokens: "
            f"**{dataset['estimated_input_tokens']}**"
        ),
        (
            f"Checkpoints: **{summary['checkpoint_count']}** | successful: "
            f"**{summary['successful_checkpoints']}** | failed: **{summary['failed_checkpoints']}** "
            f"| timed out: **{summary['timeout_checkpoints']}**"
        ),
        "",
        "## Degradation screen",
        "",
        (
            f"Baseline request latency: **{heuristic['baseline_request_latency_ms']} ms**; "
            f"tail/baseline: **{heuristic['tail_request_latency_vs_baseline']}x**. "
            f"Baseline TTFT: **{heuristic['baseline_ttft_ms']} ms**; "
            f"tail/baseline: **{heuristic['tail_ttft_vs_baseline']}x**."
        ),
        heuristic["note"],
        "",
        "## Checkpoints",
        "",
        "| Dialogue | Split/row | Turns | Est. tokens | Prompt tokens | Outcome | Request ms | TTFT ms | vs baseline | Signal |",
        "|---:|:---|---:|---:|---:|:---|---:|---:|---:|:---:|",
    ]
    for item in summary["checkpoints"]:
        lines.append(
            f"| {item['dialogue_number']} | {item['ending_split']}/{item['ending_source_row']} "
            f"| {item['cumulative_turns']} | {item['estimated_input_tokens']} "
            f"| {item['reported_prompt_tokens']} | {item['outcome']} "
            f"| {item['request_latency_ms']} | {item['ttft_ms']} "
            f"| {item['request_latency_vs_baseline']}x "
            f"| {'yes' if item['degradation_signal'] else 'no'} |"
        )
    return "\n".join(lines) + "\n"


def _parse_dialogue_numbers(value: str) -> list[int]:
    try:
        return [int(part.strip()) for part in value.split(",") if part.strip()]
    except ValueError as error:
        raise argparse.ArgumentTypeError("Use comma-separated dialogue numbers") from error


def _progress_record(
    observation: StepObservation, boundary: DialogueBoundary
) -> dict[str, Any]:
    return {
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dialogue_number": boundary.dialogue_number,
        "turns": observation.step,
        "characters": boundary.cumulative_characters,
        "words": boundary.cumulative_words,
        "backend_status": observation.backend_status,
        "error": observation.error,
        "request_latency_ms": observation.request_latency_ms,
        "ttft_ms": observation.prompt_processing_and_thinking_latency_ms,
        "completion_latency_ms": observation.completion_latency_ms,
        "token_usage": observation.token_usage,
    }


def run_stress_test(
    *,
    csv_paths: Sequence[str | Path] = DEFAULT_CSVS,
    output_dir: str | Path,
    endpoint_url: str | None = None,
    bearer_token: str | None = None,
    backend_path: str | Path = DEFAULT_BACKEND,
    session_type: str = "CBT",
    every_dialogues: int = 50,
    every_turns: int | None = None,
    dialogue_numbers: Sequence[int] | None = None,
    max_dialogues_per_split: int | None = None,
    max_dialogues: int | None = None,
    timeout_seconds: int = 300,
    degradation_ratio: float = 2.0,
    compact_report: bool = False,
) -> dict[str, Any]:
    if timeout_seconds < 1:
        raise ValueError("timeout_seconds must be positive")
    dataset = load_concatenated_dataset(
        csv_paths,
        max_dialogues_per_split=max_dialogues_per_split,
        max_dialogues=max_dialogues,
    )
    if every_turns is not None:
        if dialogue_numbers is not None:
            raise ValueError("every_turns and dialogue_numbers cannot be used together")
        checkpoints = select_turn_checkpoints(dataset, every_turns=every_turns)
    else:
        checkpoints = select_checkpoints(
            dataset,
            every_dialogues=every_dialogues,
            dialogue_numbers=dialogue_numbers,
        )
    checkpoint_turns = [boundary.last_turn for boundary in checkpoints]
    by_turn = {boundary.last_turn: boundary for boundary in checkpoints}
    destination = Path(output_dir)
    destination.mkdir(parents=True, exist_ok=True)
    progress_path = destination / "concatenated_realtime_progress.jsonl"
    progress_path.write_text("", encoding="utf-8")

    print(
        f"Loaded {len(dataset.boundaries)} dialogues / {len(dataset.turns)} turns; "
        f"running {len(checkpoints)} cumulative checkpoints.",
        flush=True,
    )

    completed = 0

    def record_progress(observation: StepObservation) -> None:
        nonlocal completed
        completed += 1
        boundary = by_turn[observation.step]
        record = _progress_record(observation, boundary)
        with progress_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(
            f"[{completed}/{len(checkpoints)}] dialogue {boundary.dialogue_number}, "
            f"turns {observation.step}: status {observation.backend_status}, "
            f"{observation.request_latency_ms} ms",
            flush=True,
        )

    metadata = {
        "experiment": "concatenated_realtime_long_context_stress",
        "csv_files": dataset.csv_files,
        "concatenation_order": [Path(path).stem for path in dataset.csv_files],
        "split_dialogue_counts": dataset.split_dialogue_counts,
        "split_turn_counts": dataset.split_turn_counts,
        "total_dialogues": len(dataset.boundaries),
        "total_turns": len(dataset.turns),
        "checkpoint_dialogues": [boundary.dialogue_number for boundary in checkpoints],
        "checkpoint_turns": checkpoint_turns,
        "compact_report": compact_report,
    }
    session_context = {"session_type": session_type}
    if endpoint_url:
        client = HttpBackendClient(
            endpoint_url,
            bearer_token=bearer_token,
            timeout_seconds=timeout_seconds,
        )
        report = RealtimeConversationRunner(client).run(
            dataset.turns,
            session_context=session_context,
            metadata=metadata,
            checkpoint_turns=checkpoint_turns,
            on_step=record_progress,
            retain_step_inputs=not compact_report,
        )
    else:
        report = run_realtime_analysis(
            dataset.turns,
            backend_path=backend_path,
            session_context=session_context,
            metadata=metadata,
            checkpoint_turns=checkpoint_turns,
            on_step=record_progress,
            retain_step_inputs=not compact_report,
            capture_prompts=not compact_report,
        )

    write_report(report, destination, name_prefix="concatenated_realtime")
    summary = build_stress_summary(
        report,
        dataset,
        checkpoints,
        degradation_ratio=degradation_ratio,
    )
    (destination / "concatenated_stress_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (destination / "concatenated_stress_summary.md").write_text(
        stress_summary_markdown(summary), encoding="utf-8"
    )
    return summary


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csvs", nargs="+", type=Path, default=list(DEFAULT_CSVS))
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=HERE / "results" / "concatenated_stress",
    )
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument("--endpoint-url")
    parser.add_argument("--bearer-token")
    parser.add_argument("--session-type", default="CBT")
    parser.add_argument(
        "--checkpoint-every-dialogues",
        type=int,
        default=50,
        help="Cumulative request stride; 1 analyzes every dialogue boundary",
    )
    parser.add_argument(
        "--checkpoint-dialogues",
        type=_parse_dialogue_numbers,
        help="Explicit comma-separated dialogue boundaries; the final boundary is always added",
    )
    parser.add_argument(
        "--checkpoint-every-turns",
        type=int,
        help="Analyze every N cumulative turns; use 1 for the original step-by-step behavior",
    )
    parser.add_argument(
        "--max-dialogues-per-split",
        type=int,
        help="Small-run limit applied separately to test, train, and val",
    )
    parser.add_argument(
        "--max-dialogues",
        type=int,
        help="Limit the total dialogues after concatenating CSVs in their supplied order",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=300,
        help="Per-request timeout in HTTP mode",
    )
    parser.add_argument(
        "--degradation-ratio",
        type=float,
        default=2.0,
        help="Flag latency/TTFT at this multiple of the early-checkpoint baseline",
    )
    parser.add_argument(
        "--compact-report",
        action="store_true",
        help="Do not duplicate cumulative transcripts or exact prompts in every checkpoint",
    )
    args = parser.parse_args(argv)

    summary = run_stress_test(
        csv_paths=args.csvs,
        output_dir=args.output_dir,
        endpoint_url=args.endpoint_url,
        bearer_token=args.bearer_token,
        backend_path=args.backend,
        session_type=args.session_type,
        every_dialogues=args.checkpoint_every_dialogues,
        every_turns=args.checkpoint_every_turns,
        dialogue_numbers=args.checkpoint_dialogues,
        max_dialogues_per_split=args.max_dialogues_per_split,
        max_dialogues=args.max_dialogues,
        timeout_seconds=args.timeout_seconds,
        degradation_ratio=args.degradation_ratio,
        compact_report=args.compact_report,
    )
    print(json.dumps({key: value for key, value in summary.items() if key != "checkpoints"}, indent=2))
    print(f"Reports: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
