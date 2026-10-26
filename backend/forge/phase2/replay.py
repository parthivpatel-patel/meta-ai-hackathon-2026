import argparse
from pathlib import Path

from .service import RunReport, replay


def main():
    parser = argparse.ArgumentParser(
        description="Offline Phase 2 report replay; never executes model output"
    )
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    if args.report.stat().st_size > 1_048_576:
        parser.error("Report exceeds 1 MiB")
    try:
        result = replay(RunReport.model_validate_json(args.report.read_text()))
    except ValueError as exc:
        parser.exit(1, "Replay rejected: " + str(exc) + "\n")
    print("Phase 2 replay verified:", result.status, ", ".join(result.findings))


if __name__ == "__main__":
    main()
