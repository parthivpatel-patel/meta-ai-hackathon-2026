"""Usage: python -m forge.replay report.json (bounded, offline evidence replay)."""

import argparse
from pathlib import Path

from .engine.reporting import Report, replay_report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    if args.report.stat().st_size > 2_000_000:
        parser.error("Report exceeds the 2 MB replay limit")
    try:
        report = Report.model_validate_json(args.report.read_text())
        result = replay_report(report)
    except ValueError as exc:
        parser.exit(1, f"Replay rejected: {exc}\n")
    print(
        f"Replay verified: {result.decision}; finding={result.finding}; physical causality not established"
    )


if __name__ == "__main__":
    main()
