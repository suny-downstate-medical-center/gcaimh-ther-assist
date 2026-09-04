"""Offline tests for the comprehensive-analysis experiment runner."""

from __future__ import annotations

import unittest

from comprehensive_analysis_suite import ComprehensiveConversationRunner
from realtime_analysis_suite import report_html


class FakeComprehensiveClient:
    mode = "test"

    def __init__(self):
        self.payloads = []

    def analyze(self, payload):
        self.payloads.append(payload)
        return 200, {
            "analysis_type": "comprehensive",
            "session_metrics": {"engagement_level": 0.8},
            "pathway_guidance": {
                "continue_current": True,
                "rationale": "Continue the current approach.",
                "immediate_actions": ["Use the next open question."],
            },
            "_diagnostics": {
                "token_usage": {
                    "prompt_tokens": 100,
                    "completion_tokens": 30,
                    "thinking_tokens": 20,
                },
            },
        }


class ComprehensiveAnalysisSuiteTests(unittest.TestCase):
    def test_runner_uses_comprehensive_path_at_cumulative_checkpoints(self):
        client = FakeComprehensiveClient()
        report = ComprehensiveConversationRunner(client).run([
            {"user": "First", "supporter": "Response"},
        ])
        self.assertEqual(report["analysis_type"], "comprehensive")
        self.assertEqual(report["summary"]["steps"], 2)
        self.assertTrue(all(payload["is_realtime"] is False for payload in client.payloads))
        self.assertEqual(report["summary"]["token_totals"]["thinking_tokens"], 40)

    def test_comprehensive_output_is_visible_in_html_report(self):
        report = ComprehensiveConversationRunner(FakeComprehensiveClient()).run("A short test")
        rendered = report_html(report)
        self.assertIn("Comprehensive analysis report", rendered)
        self.assertIn("Structured comprehensive model output", rendered)
        self.assertIn("Use the next open question.", rendered)


if __name__ == "__main__":
    unittest.main()
