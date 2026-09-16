"""Export per-step latency and token metrics from a realtime JSON report."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Mapping, Sequence


CSV_FIELDS = [
    "step",
    "request_latency_ms",
    "rag_prefetch_latency_ms",
    "prompt_assembly_latency_ms",
    "prompt_processing_and_thinking_latency_ms",
    "completion_latency_ms",
    "model_latency_ms",
    "prompt_tokens",
    "completion_tokens",
    "thinking_tokens",
    "total_tokens",
    "cached_tokens",
]


def _sum_numbers(values: Sequence[Any]) -> int | float | None:
    numbers = [value for value in values if isinstance(value, (int, float))]
    return sum(numbers) if numbers else None


def _report_rows(
    report: Mapping[str, Any],
    *,
    checkpoint_dialogue: int | None = None,
) -> list[dict[str, Any]]:
    steps = report.get("steps")
    if not isinstance(steps, list):
        raise ValueError("JSON does not contain a 'steps' list")
    metadata = report.get("metadata", {})
    if not isinstance(metadata, Mapping):
        metadata = {}
    checkpoint_dialogues = metadata.get("checkpoint_dialogues", [])
    if not isinstance(checkpoint_dialogues, list):
        checkpoint_dialogues = []

    indexed_steps = list(enumerate(steps))
    if checkpoint_dialogue is not None:
        if checkpoint_dialogue not in checkpoint_dialogues:
            raise ValueError(
                f"Dialogue {checkpoint_dialogue} is not an analyzed checkpoint in this report"
            )
        index = checkpoint_dialogues.index(checkpoint_dialogue)
        indexed_steps = [(index, steps[index])]

    rows: list[dict[str, Any]] = []
    for index, step in indexed_steps:
        if not isinstance(step, Mapping):
            continue
        token_usage = step.get("token_usage", {})
        if not isinstance(token_usage, Mapping):
            token_usage = {}
        attempts = step.get("model_attempts", [])
        if not isinstance(attempts, list):
            attempts = []
        model_latencies = [
            attempt.get("model_latency_ms")
            for attempt in attempts
            if isinstance(attempt, Mapping)
            and isinstance(attempt.get("model_latency_ms"), (int, float))
        ]
        rows.append(
            {
                "step": step.get("step", ""),
                "request_latency_ms": step.get("request_latency_ms", ""),
                "rag_prefetch_latency_ms": step.get("rag_prefetch_latency_ms", ""),
                "prompt_assembly_latency_ms": step.get("prompt_assembly_latency_ms", ""),
                "prompt_processing_and_thinking_latency_ms": step.get(
                    "prompt_processing_and_thinking_latency_ms", ""
                ),
                "completion_latency_ms": step.get("completion_latency_ms", ""),
                "model_latency_ms": _sum_numbers(model_latencies),
                "prompt_tokens": token_usage.get("prompt_tokens", ""),
                "completion_tokens": token_usage.get("completion_tokens", ""),
                "thinking_tokens": token_usage.get("thinking_tokens", ""),
                "total_tokens": token_usage.get("total_tokens", ""),
                "cached_tokens": token_usage.get("cached_tokens", ""),
            }
        )
    if not rows:
        raise ValueError("The report contains no exportable steps")
    return rows


def _stress_summary_rows(
    summary: Mapping[str, Any],
    *,
    checkpoint_dialogue: int | None = None,
) -> list[dict[str, Any]]:
    checkpoints = summary.get("checkpoints")
    if not isinstance(checkpoints, list):
        raise ValueError("JSON does not contain a 'steps' or 'checkpoints' list")
    if checkpoint_dialogue is not None:
        checkpoints = [
            item
            for item in checkpoints
            if isinstance(item, Mapping) and item.get("dialogue_number") == checkpoint_dialogue
        ]
        if not checkpoints:
            raise ValueError(
                f"Dialogue {checkpoint_dialogue} is not an analyzed checkpoint in this summary"
            )

    rows: list[dict[str, Any]] = []
    for item in checkpoints:
        if not isinstance(item, Mapping):
            continue
        row = {field: "" for field in CSV_FIELDS}
        row.update(
            {
                "step": item.get("cumulative_turns", ""),
                "request_latency_ms": item.get("request_latency_ms", ""),
                "prompt_processing_and_thinking_latency_ms": item.get("ttft_ms", ""),
                "completion_latency_ms": item.get("completion_latency_ms", ""),
                "prompt_tokens": item.get("reported_prompt_tokens", ""),
            }
        )
        rows.append(row)
    if not rows:
        raise ValueError("The stress summary contains no exportable checkpoints")
    return rows


def load_metric_rows(
    report_path: str | Path,
    *,
    checkpoint_dialogue: int | None = None,
) -> list[dict[str, Any]]:
    path = Path(report_path)
    with path.open(encoding="utf-8") as handle:
        document = json.load(handle)
    if not isinstance(document, Mapping):
        raise ValueError("The report JSON must contain an object")
    if "steps" in document:
        return _report_rows(document, checkpoint_dialogue=checkpoint_dialogue)
    return _stress_summary_rows(document, checkpoint_dialogue=checkpoint_dialogue)


def export_metrics_csv(
    report_path: str | Path,
    output_path: str | Path,
    *,
    checkpoint_dialogue: int | None = None,
) -> Path:
    rows = load_metric_rows(report_path, checkpoint_dialogue=checkpoint_dialogue)
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    return destination


def resolve_dialogue_report(results_dir: str | Path, dialogue_number: int) -> Path:
    if dialogue_number < 1:
        raise ValueError("dialogue_number must be positive")
    root = Path(results_dir)
    candidates = (
        root / f"dialogue_{dialogue_number:04d}" / "realtime_analysis_report.json",
        root / f"dialogue_{dialogue_number}" / "realtime_analysis_report.json",
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        f"No realtime report found for dialogue {dialogue_number} under {root}"
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--report", type=Path, help="Detailed report or stress-summary JSON")
    source.add_argument("--results-dir", type=Path, help="Batch directory containing dialogue_NNNN")
    parser.add_argument(
        "--dialogue",
        type=int,
        help="Dialogue number to resolve within --results-dir",
    )
    parser.add_argument(
        "--checkpoint-dialogue",
        type=int,
        help="Export one dialogue checkpoint from a concatenated report/summary",
    )
    parser.add_argument("--output", type=Path, help="Destination CSV path")
    args = parser.parse_args(argv)

    if args.results_dir:
        if args.dialogue is None:
            parser.error("--dialogue is required with --results-dir")
        report_path = resolve_dialogue_report(args.results_dir, args.dialogue)
    else:
        if args.dialogue is not None:
            parser.error("--dialogue is only used with --results-dir")
        report_path = args.report

    output_path = args.output or report_path.with_name("realtime_step_metrics.csv")
    written = export_metrics_csv(
        report_path,
        output_path,
        checkpoint_dialogue=args.checkpoint_dialogue,
    )
    print(f"CSV: {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
