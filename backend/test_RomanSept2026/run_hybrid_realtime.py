"""Compare the authenticated local service with an instrumented shadow run.

The service run validates the real START-Mac runtime. The in-process run sends
the identical cumulative checkpoints through the same realtime handler while
capturing prompts and RAG internals. They are separate requests, so this is a
side-by-side shadow comparison rather than server-side tracing of one request.
"""

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
    load_first_csv_dialogue,
    run_realtime_analysis,
    write_report,
)


def run_hybrid(
    conversation: Any,
    *,
    endpoint_url: str,
    backend_path: str | Path = DEFAULT_BACKEND,
    bearer_token: str | None = None,
    session_context: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Run identical checkpoints through HTTP and instrumented in-process paths."""
    context = dict(session_context or {"session_type": "CBT"})
    source_metadata = dict(metadata or {})

    service_report = RealtimeConversationRunner(
        HttpBackendClient(endpoint_url, bearer_token=bearer_token)
    ).run(conversation, session_context=context, metadata=source_metadata)
    shadow_report = run_realtime_analysis(
        conversation,
        backend_path=backend_path,
        session_context=context,
        metadata=source_metadata,
    )

    comparison = []
    for service_step, shadow_step in zip(service_report["steps"], shadow_report["steps"]):
        service_alert = service_step["response"].get("alert", {})
        shadow_alert = shadow_step["response"].get("alert", {})
        comparison.append(
            {
                "step": service_step["step"],
                "same_transcript_checkpoint": service_step["transcript_text"] == shadow_step["transcript_text"],
                "service_status": service_step["backend_status"],
                "shadow_status": shadow_step["backend_status"],
                "service_request_latency_ms": service_step["request_latency_ms"],
                "shadow_request_latency_ms": shadow_step["request_latency_ms"],
                "service_alert_category": service_alert.get("category"),
                "shadow_alert_category": shadow_alert.get("category"),
                "same_alert_category": service_alert.get("category") == shadow_alert.get("category"),
                "service_token_usage": service_step["token_usage"],
                "shadow_token_usage": shadow_step["token_usage"],
                "shadow_rag_datastores": [item["datastore"] for item in shadow_step["rag"]],
                "shadow_rag_chunk_count": sum(len(item["passages"]) for item in shadow_step["rag"]),
                "shadow_prompt_count": len(shadow_step["model_attempts"]),
            }
        )

    return {
        "schema_version": "1.0-hybrid",
        "endpoint_url": endpoint_url,
        "metadata": source_metadata,
        "session_context": context,
        "comparison": comparison,
        "service_report": service_report,
        "in_process_report": shadow_report,
        "limitations": [
            "The HTTP and in-process calls are separate executions of the same cumulative checkpoints; model output can differ because realtime generation is nondeterministic outside temperature settings and shared caches may differ.",
            "The authenticated service currently does not return its exact assembled prompt or pre-fetched RAG passages. Those details are captured by the matching in-process shadow execution.",
        ],
    }


def hybrid_markdown(report: Mapping[str, Any]) -> str:
    lines = [
        "# Hybrid realtime analysis debrief",
        "",
        f"Service endpoint: `{report['endpoint_url']}`",
        "",
        "The service column is the authenticated START-Mac HTTP process. The shadow column is the same realtime handler run in-process with prompt/RAG instrumentation.",
        "",
        "| Step | Service ms | Shadow ms | Service status | Shadow status | Same alert category | Shadow RAG chunks | Shadow prompts |",
        "|---:|---:|---:|---:|---:|:---:|---:|---:|",
    ]
    for row in report["comparison"]:
        lines.append(
            f"| {row['step']} | {row['service_request_latency_ms']} | {row['shadow_request_latency_ms']} | {row['service_status']} | {row['shadow_status']} | {row['same_alert_category']} | {row['shadow_rag_chunk_count']} | {row['shadow_prompt_count']} |"
        )
    lines.extend([
        "",
        "Detailed prompt/RAG output is in `in_process/realtime_analysis_debrief.md`; the service response and diagnostics are in `service/realtime_analysis_debrief.md`.",
        "",
        "Limitations:",
        "",
    ])
    lines.extend(f"- {limitation}" for limitation in report["limitations"])
    return "\n".join(lines) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--endpoint-url", default="http://127.0.0.1:8090/therapy_analysis")
    parser.add_argument("--backend", type=Path, default=DEFAULT_BACKEND)
    parser.add_argument("--bearer-token")
    parser.add_argument("--session-type", default="CBT")
    parser.add_argument("--output-dir", type=Path, default=HERE / "results" / "hybrid")
    args = parser.parse_args(argv)

    dataset = load_first_csv_dialogue(args.csv)
    report = run_hybrid(
        dataset["conversation"],
        endpoint_url=args.endpoint_url,
        backend_path=args.backend,
        bearer_token=args.bearer_token,
        session_context={"session_type": args.session_type},
        metadata=dataset["metadata"],
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "hybrid_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    write_report(report["service_report"], args.output_dir / "service")
    write_report(report["in_process_report"], args.output_dir / "in_process")
    (args.output_dir / "hybrid_debrief.md").write_text(
        hybrid_markdown(report), encoding="utf-8"
    )
    print(json.dumps({
        "endpoint_url": args.endpoint_url,
        "steps": len(report["comparison"]),
        "service_summary": report["service_report"]["summary"],
        "in_process_summary": report["in_process_report"]["summary"],
        "output_dir": str(args.output_dir),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
