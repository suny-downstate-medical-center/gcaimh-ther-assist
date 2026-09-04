"""Fast, offline tests for the experiment harness itself."""

from __future__ import annotations

import unittest
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch

from realtime_analysis_suite import (
    FlexibleConversationAdapter,
    HttpBackendClient,
    RealtimeConversationRunner,
    report_html,
    write_report,
)


class FakeClient:
    def analyze(self, payload):
        return 200, {
            "analysis_type": "realtime",
            "alert": {"category": "engagement"},
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
        report = RealtimeConversationRunner(FakeClient()).run([
            {"user": "First", "supporter": "Response"},
            {"user": "Second", "supporter": "Response 2"},
        ])
        self.assertEqual(report["summary"]["steps"], 4)
        self.assertEqual([len(step["input_turns"]) for step in report["steps"]], [1, 2, 3, 4])
        self.assertEqual(report["summary"]["token_totals"], {"prompt_tokens": 40, "completion_tokens": 16})

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

    def test_html_report_contains_figures_and_rag_sections(self):
        report = RealtimeConversationRunner(FakeClient()).run([
            {"user": "First", "supporter": "Response"},
        ])
        rendered = report_html(report)
        self.assertIn("Latency by cumulative conversation step", rendered)
        self.assertIn("Token usage by cumulative conversation step", rendered)
        self.assertIn("<svg", rendered)
        self.assertIn("Step-by-step conversation and RAG", rendered)
        self.assertIn("No RAG observations captured", rendered)

    def test_write_report_creates_html_file(self):
        report = RealtimeConversationRunner(FakeClient()).run("A short test")
        with TemporaryDirectory() as output_dir:
            _, _, html_path = write_report(report, output_dir)
            self.assertTrue(html_path.is_file())
            self.assertIn("<svg", html_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
