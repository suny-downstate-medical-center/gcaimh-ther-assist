"""Run realtime analysis for every dialogue in a CSV dataset."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from realtime_analysis_suite import (  # noqa: E402
    DEFAULT_BACKEND,
    DEFAULT_CSV,
    HttpBackendClient,
    RealtimeConversationRunner,
    _average,
    load_csv_dialogues,
    run_realtime_analysis,
    write_report,
)


def summarize_reports(reports: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Create aggregate statistics without retaining all report bodies."""
    steps = [step for report in reports for step in report.get("steps", [])]
    attempts = [attempt for step in steps for attempt in step.get("model_attempts", [])]
    token_totals: dict[str, int] = {}
    for report in reports:
        for key, value in report.get("summary", {}).get("token_totals", {}).items():
            if isinstance(value, int):
                token_totals[key] = token_totals.get(key, 0) + value
    return {
        "dialogues": len(reports),
        "steps": len(steps),
        "successful_steps": sum(1 for step in steps if step.get("backend_status") == 200 and not step.get("error")),
        "alerts": sum(1 for step in steps if step.get("response", {}).get("alert")),
        "rag_calls": sum(len(step.get("rag", [])) for step in steps),
        "unique_datastores": sorted({item.get("datastore") for step in steps for item in step.get("rag", [])}),
        "model_attempts": len(attempts),
        "token_totals": token_totals,
        "average_request_latency_ms": _average([step.get("request_latency_ms") for step in steps]),
        "average_ttft_ms": _average([attempt.get("time_to_first_token_ms") for attempt in attempts]),
        "average_completion_after_first_token_ms": _average(
            [attempt.get("completion_after_first_token_ms") for attempt in attempts]
        ),
        "dialogue_summaries": [
            {
                "source_row": report.get("metadata", {}).get("source_row"),
                "steps": report.get("summary", {}).get("steps", 0),
                "successful_steps": report.get("summary", {}).get("successful_steps", 0),
                "alerts": report.get("summary", {}).get("alerts", 0),
                "rag_calls": report.get("summary", {}).get("rag_calls", 0),
                "model_attempts": report.get("summary", {}).get("model_attempts", 0),
                "average_request_latency_ms": report.get("summary", {}).get("average_request_latency_ms"),
            }
            for report in reports
        ],
    }


def summary_markdown(summary: Mapping[str, Any], *, backend_mode: str, csv_path: Path) -> str:
    lines = [
        "# All-dialogues realtime analysis summary",
        "",
        f"Backend mode: `{backend_mode}`",
        f"Dataset: `{csv_path}`",
        "",
        f"Dialogues: **{summary['dialogues']}** | steps: **{summary['steps']}** | successful steps: **{summary['successful_steps']}** | alerts: **{summary['alerts']}**",
        f"RAG calls: **{summary['rag_calls']}** | model attempts: **{summary['model_attempts']}**",
        f"Token totals: `{json.dumps(summary['token_totals'], sort_keys=True)}`",
        f"Average request latency: **{summary['average_request_latency_ms']} ms**",
        f"Average TTFT: **{summary['average_ttft_ms']} ms**",
        f"Average completion after TTFT: **{summary['average_completion_after_first_token_ms']} ms**",
        "",
        "| CSV row | Steps | Successful | Alerts | RAG calls | Model attempts | Avg request ms |",
        "|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for item in summary["dialogue_summaries"]:
        lines.append(
            f"| {item['source_row']} | {item['steps']} | {item['successful_steps']} | {item['alerts']} | {item['rag_calls']} | {item['model_attempts']} | {item['average_request_latency_ms']} |"
        )
    return "\n".join(lines) + "\n"


def run_all_dialogues(
    *,
    csv_path: str | Path = DEFAULT_CSV,
    output_dir: str | Path,
    endpoint_url: str | None = None,
    bearer_token: str | None = None,
    backend_path: str | Path = DEFAULT_BACKEND,
    session_type: str = "CBT",
    max_dialogues: int | None = None,
) -> dict[str, Any]:
    """Run every selected CSV row through one realtime pathway."""
    csv_file = Path(csv_path).resolve()
    datasets = load_csv_dialogues(csv_file)
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
            report = RealtimeConversationRunner(
                HttpBackendClient(endpoint_url, bearer_token=bearer_token)
            ).run(
                dataset["conversation"],
                session_context={"session_type": session_type},
                metadata=dataset["metadata"],
            )
        else:
            report = run_realtime_analysis(
                dataset["conversation"],
                backend_path=backend_path,
                session_context={"session_type": session_type},
                metadata=dataset["metadata"],
            )
        dialogue_dir = destination / f"dialogue_{source_row:04d}"
        write_report(report, dialogue_dir)
        reports.append(report)

    summary = summarize_reports(reports)
    summary["csv_path"] = str(csv_file)
    summary["backend_mode"] = mode
    summary["endpoint_url"] = endpoint_url
    (destination / "all_dialogues_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (destination / "all_dialogues_summary.md").write_text(
        summary_markdown(summary, backend_mode=mode, csv_path=csv_file), encoding="utf-8"
    )
    return summary


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument("--endpoint-url")
    parser.add_argument("--bearer-token")
    parser.add_argument("--session-type", default="CBT")
    parser.add_argument("--max-dialogues", type=int, help="Optional limit for a smaller trial run")
    args = parser.parse_args(argv)
    summary = run_all_dialogues(
        csv_path=args.csv,
        output_dir=args.output_dir,
        endpoint_url=args.endpoint_url,
        bearer_token=args.bearer_token,
        backend_path=args.backend,
        session_type=args.session_type,
        max_dialogues=args.max_dialogues,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"Reports: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
