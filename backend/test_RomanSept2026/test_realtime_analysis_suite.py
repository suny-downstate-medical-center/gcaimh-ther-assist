"""Fast, offline tests for the experiment harness itself."""

from __future__ import annotations

import csv
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from run_concatenated_realtime_stress import (
    build_stress_summary,
    load_concatenated_dataset,
    select_checkpoints,
    select_turn_checkpoints,
)
from export_realtime_metrics_csv import export_metrics_csv, resolve_dialogue_report
from export_all_realtime_metrics_csv import export_all_realtime_metrics
from realtime_analysis_suite import (
    FlexibleConversationAdapter,
    HttpBackendClient,
    RealtimeConversationRunner,
    report_markdown,
    report_html,
    write_report,
)


class FakeClient:
    def __init__(self):
        self.payloads = []

    def analyze(self, payload):
        self.payloads.append(payload)
        return 200, {
            "analysis_type": "realtime",
            "alert": {
                "category": "engagement",
                "title": "Continue exploration",
                "message": "The patient engaged with the discussion.",
                "recommendation": ["Ask a follow-up question."],
            },
            "_diagnostics": {"token_usage": {"prompt_tokens": 10, "completion_tokens": 4}},
        }


class RealtimeAnalysisSuiteTests(unittest.TestCase):
    def setUp(self):
        self.adapter = FlexibleConversationAdapter()

    def test_adapts_huggingface_rounds(self):
        turns = self.adapter.adapt([{"round": 1, "user": "I feel overwhelmed", "supporter": "I hear you."}])
        self.assertEqual([turn.speaker for turn in turns], ["Patient", "Therapist"])
        self.assertEqual(turns[0].text, "I feel overwhelmed")

    def test_adapts_backend_and_chat_turns(self):
        turns = self.adapter.adapt([
            {"speaker": "conversation", "text": "Patient: I am tired"},
            {"role": "assistant", "content": "Tell me more."},
        ])
        self.assertEqual([turn.speaker for turn in turns], ["Patient", "Therapist"])
        self.assertEqual(turns[0].text, "I am tired")

    def test_runner_uses_cumulative_checkpoints_and_sums_tokens(self):
        client = FakeClient()
        report = RealtimeConversationRunner(client).run([
            {"user": "First", "supporter": "Response"},
            {"user": "Second", "supporter": "Response 2"},
        ])
        self.assertEqual(report["summary"]["steps"], 4)
        self.assertEqual([len(step["input_turns"]) for step in report["steps"]], [1, 2, 3, 4])
        self.assertEqual(report["summary"]["token_totals"], {"prompt_tokens": 40, "completion_tokens": 16})

    def test_runner_can_sample_selected_cumulative_checkpoints(self):
        client = FakeClient()
        observed_steps = []
        report = RealtimeConversationRunner(client).run(
            [
                {"user": "First", "supporter": "Response"},
                {"user": "Second", "supporter": "Response 2"},
            ],
            checkpoint_turns=[2, 4],
            on_step=lambda step: observed_steps.append(step.step),
        )
        self.assertEqual([step["step"] for step in report["steps"]], [2, 4])
        self.assertEqual([len(payload["transcript_segment"]) for payload in client.payloads], [2, 4])
        self.assertEqual(observed_steps, [2, 4])

    def test_runner_rejects_out_of_range_checkpoint(self):
        with self.assertRaisesRegex(ValueError, "between 1 and 2"):
            RealtimeConversationRunner(FakeClient()).run(
                [{"user": "First", "supporter": "Response"}],
                checkpoint_turns=[3],
            )

    def test_http_client_reads_newline_delimited_backend_response(self):
        response = MagicMock()
        response.status = 200
        response.read.return_value = b'{"_diagnostics":{"latency_ms":12}}\n'
        response.__enter__.return_value = response
        with patch("urllib.request.urlopen", return_value=response) as urlopen:
            status, body = HttpBackendClient("http://localhost:8080/therapy_analysis").analyze({"action": "health_check"})
        self.assertEqual(status, 200)
        self.assertEqual(body["_diagnostics"]["latency_ms"], 12)
        self.assertEqual(urlopen.call_args.args[0].full_url, "http://localhost:8080/therapy_analysis")

    def test_http_client_classifies_timeout(self):
        with patch("urllib.request.urlopen", side_effect=TimeoutError):
            status, body = HttpBackendClient(
                "http://localhost:8080/therapy_analysis", timeout_seconds=17
            ).analyze({"action": "analyze_segment"})
        self.assertEqual(status, 504)
        self.assertIn("17 seconds", body["error"])

    def test_html_report_contains_figures_and_rag_sections(self):
        report = RealtimeConversationRunner(FakeClient()).run([
            {"user": "First", "supporter": "Response"},
        ])
        rendered = report_html(report)
        self.assertIn("Latency by cumulative conversation step", rendered)
        self.assertIn("Token usage by cumulative conversation step", rendered)
        self.assertIn("<svg", rendered)
        self.assertIn("Step-by-step conversation and RAG", rendered)
        self.assertIn("Model output / recommendation", rendered)
        self.assertIn("Ask a follow-up question.", rendered)
        self.assertIn("No RAG observations captured", rendered)
        self.assertIn("Model output / recommendation", report_markdown(report))

    def test_write_report_creates_html_file(self):
        report = RealtimeConversationRunner(FakeClient()).run("A short test")
        with TemporaryDirectory() as output_dir:
            _, _, html_path = write_report(report, output_dir)
            self.assertTrue(html_path.is_file())
            self.assertIn("<svg", html_path.read_text(encoding="utf-8"))

    def test_concatenates_splits_and_always_includes_final_checkpoint(self):
        with TemporaryDirectory() as directory:
            paths = []
            for split, dialogue in (
                ("test", [{"round": 1, "user": "u1", "supporter": "s1"}]),
                ("train", [{"round": 1, "user": "u2", "supporter": "s2"}]),
                ("val", "one plain patient turn"),
            ):
                path = Path(directory) / f"{split}.csv"
                with path.open("w", newline="", encoding="utf-8") as handle:
                    writer = csv.DictWriter(handle, fieldnames=["Dialogue"])
                    writer.writeheader()
                    writer.writerow(
                        {"Dialogue": json.dumps(dialogue) if not isinstance(dialogue, str) else dialogue}
                    )
                paths.append(path)

            dataset = load_concatenated_dataset(paths)
            checkpoints = select_checkpoints(dataset, every_dialogues=2)
            turn_checkpoints = select_turn_checkpoints(dataset, every_turns=2)
            limited_dataset = load_concatenated_dataset(paths, max_dialogues=2)
            report = RealtimeConversationRunner(FakeClient()).run(
                dataset.turns,
                checkpoint_turns=[item.last_turn for item in checkpoints],
            )
            report["steps"][-1]["backend_status"] = 504
            report["steps"][-1]["error"] = "Analysis endpoint timed out"
            summary = build_stress_summary(report, dataset, checkpoints)

        self.assertEqual(dataset.split_dialogue_counts, {"test": 1, "train": 1, "val": 1})
        self.assertEqual(len(dataset.turns), 5)
        self.assertEqual([item.dialogue_number for item in checkpoints], [2, 3])
        self.assertEqual([item.last_turn for item in checkpoints], [4, 5])
        self.assertEqual([item.last_turn for item in turn_checkpoints], [2, 4, 5])
        self.assertEqual(len(limited_dataset.boundaries), 2)
        self.assertEqual(len(limited_dataset.turns), 4)
        self.assertEqual(summary["timeout_checkpoints"], 1)

    def test_exports_one_csv_row_per_realtime_step(self):
        report = RealtimeConversationRunner(FakeClient()).run(
            [{"user": "First", "supporter": "Response"}],
            metadata={"source_csv": "/data/test.csv", "source_row": 7},
        )
        with TemporaryDirectory() as directory:
            dialogue_dir = Path(directory) / "dialogue_0007"
            dialogue_dir.mkdir()
            report_path = dialogue_dir / "realtime_analysis_report.json"
            report_path.write_text(json.dumps(report), encoding="utf-8")
            output_path = Path(directory) / "metrics.csv"

            resolved = resolve_dialogue_report(directory, 7)
            export_metrics_csv(resolved, output_path)
            with output_path.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))

        self.assertEqual(resolved, report_path)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["step"], "1")
        self.assertEqual(rows[0]["prompt_tokens"], "10")
        self.assertEqual(rows[1]["step"], "2")
        self.assertIn("request_latency_ms", rows[0])
        self.assertIn("prompt_processing_and_thinking_latency_ms", rows[0])
        self.assertEqual(len(rows[0]), 12)

    def test_exports_all_reports_and_combines_their_metrics(self):
        report = RealtimeConversationRunner(FakeClient()).run("One step")
        with TemporaryDirectory() as directory:
            root = Path(directory)
            for mode in ("service", "in_process"):
                mode_dir = root / mode
                mode_dir.mkdir()
                (mode_dir / "concatenated_realtime_report.json").write_text(
                    json.dumps(report), encoding="utf-8"
                )

            individual, combined = export_all_realtime_metrics(root)
            with combined.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))

        self.assertEqual(len(individual), 2)
        self.assertEqual(len(rows), 2)
        self.assertEqual({row["result"] for row in rows}, {"service", "in_process"})
        self.assertEqual(rows[0]["prompt_tokens"], "10")


if __name__ == "__main__":
    unittest.main()
