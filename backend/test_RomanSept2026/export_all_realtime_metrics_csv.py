"""Export every realtime JSON report beneath a results directory to CSV."""

from __future__ import annotations

import argparse
import csv
from collections import Counter
from pathlib import Path
from typing import Any, Sequence

from export_realtime_metrics_csv import CSV_FIELDS, export_metrics_csv, load_metric_rows


REPORT_FILENAMES = {
    "realtime_analysis_report.json",
    "concatenated_realtime_report.json",
}
COMBINED_FIELDS = ["result", *CSV_FIELDS]


def find_realtime_reports(results_root: str | Path) -> list[Path]:
    root = Path(results_root)
    if not root.is_dir():
        raise NotADirectoryError(f"Results directory does not exist: {root}")
    return sorted(
        path
        for path in root.rglob("*.json")
        if path.name in REPORT_FILENAMES
    )


def export_all_realtime_metrics(
    results_root: str | Path,
    *,
    combined_output: str | Path | None = None,
) -> tuple[list[Path], Path]:
    root = Path(results_root).resolve()
    reports = find_realtime_reports(root)
    if not reports:
        raise FileNotFoundError(f"No realtime report JSON files found beneath {root}")

    reports_per_directory = Counter(report.parent for report in reports)
    individual_outputs: list[Path] = []
    combined_rows: list[dict[str, Any]] = []

    for report in reports:
        filename = (
            "metrics.csv"
            if reports_per_directory[report.parent] == 1
            else f"{report.stem}_metrics.csv"
        )
        individual_output = report.parent / filename
        export_metrics_csv(report, individual_output)
        individual_outputs.append(individual_output)

        result_name = str(report.parent.relative_to(root)) or "."
        for row in load_metric_rows(report):
            combined_rows.append({"result": result_name, **row})

    combined_path = (
        Path(combined_output).resolve()
        if combined_output is not None
        else root / "all_realtime_metrics.csv"
    )
    combined_path.parent.mkdir(parents=True, exist_ok=True)
    with combined_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=COMBINED_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(combined_rows)
    return individual_outputs, combined_path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--results-root", type=Path, required=True)
    parser.add_argument(
        "--combined-output",
        type=Path,
        help="Defaults to all_realtime_metrics.csv beneath the results root",
    )
    args = parser.parse_args(argv)

    individual, combined = export_all_realtime_metrics(
        args.results_root,
        combined_output=args.combined_output,
    )
    for path in individual:
        print(f"CSV: {path}")
    print(f"Combined CSV ({len(individual)} reports): {combined}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
