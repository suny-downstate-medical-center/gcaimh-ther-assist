"""Small HTTP wrapper around :mod:`realtime_analysis_suite`.

Run from the repository root with:

    conda run -n TherAssist python backend/test_RomanSept2026/realtime_analysis_api.py

POST ``/run`` accepts a JSON object containing any conversation representation
documented by ``realtime_analysis_suite.FlexibleConversationAdapter``.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any, Sequence

from flask import Flask, jsonify, request

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from realtime_analysis_suite import run_realtime_analysis  # noqa: E402


def create_app() -> Flask:
    app = Flask("realtime-analysis-api")

    @app.get("/health")
    def health() -> Any:
        return jsonify({"status": "ok", "service": "realtime-analysis-suite"})

    @app.post("/run")
    def run() -> Any:
        body = request.get_json(silent=True) or {}
        conversation = body.get("conversation", body.get("dialogue", body.get("messages")))
        if conversation is None:
            return jsonify({"error": "Provide conversation, dialogue, or messages"}), 400
        try:
            report = run_realtime_analysis(
                conversation,
                backend_path=body.get("backend_path", HERE.parent / "therapy-analysis-function" / "main.py"),
                session_context=body.get("session_context", {"session_type": "CBT"}),
                metadata=body.get("metadata", {}),
            )
            return jsonify(report)
        except (ImportError, ValueError, OSError) as error:
            return jsonify({"error": str(error)}), 400
        except Exception as error:  # pragma: no cover - live SDK/network failures vary
            app.logger.exception("Realtime experiment failed")
            return jsonify({"error": f"Realtime experiment failed: {error}"}), 500

    return app


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args(argv)
    create_app().run(host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
