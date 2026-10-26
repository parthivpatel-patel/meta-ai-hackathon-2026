"""Portable deterministic report and escaped, self-contained HTML rendering."""

import html
import json
from typing import Literal

from .contracts import VERSION, Record, Verification, dataset_hash, digest
from .investigation import Snapshot
from .verifier import verify

LIMITATIONS = [
    "Synthetic model evidence only; no proof of physical-world causality.",
    "Rules-based hypotheses, not Meta output. No external model inference occurred.",
    "Single-fault signature policy may abstain on confounders or combined faults.",
    "Intervals assume independent synthetic replicates; real sensor dependence is not modeled.",
    "Digests establish replay consistency, not source authenticity or a trusted audit log.",
]


class Report(Record):
    schema_version: Literal["forge-report-1"] = "forge-report-1"
    investigation_id: str
    engine_version: str = VERSION
    dataset_identity: str
    simulation_identity: str = "phase0-observations-v1 + independent-relaxation-v1"
    investigation: Snapshot
    evidence_references: list[str]
    limitations: list[str]
    reproduction: list[str]


def make_report(snapshot: Snapshot) -> Report:
    if (
        snapshot.status != "VERIFIED"
        or snapshot.experiment is None
        or snapshot.verification is None
    ):
        raise ValueError("A completed verification is required for export")
    # Session UUIDs are deliberately excluded from the portable deterministic identity.
    run_id = "RUN-" + digest(
        {
            "dataset": snapshot.dataset_hash,
            "experiment": snapshot.experiment.id,
            "version": VERSION,
        }
    )
    portable = snapshot.model_copy(update={"id": run_id})
    return Report(
        investigation_id=run_id,
        dataset_identity=snapshot.dataset_hash,
        investigation=portable,
        evidence_references=[snapshot.experiment.id]
        + [f"{snapshot.experiment.id}#{p.channel}" for p in snapshot.experiment.probes],
        limitations=LIMITATIONS,
        reproduction=[
            "Install the locked backend dependencies with uv sync --project backend --frozen.",
            "Save this JSON unchanged as report.json; from backend run: uv run --frozen python -m forge.replay report.json",
            "Replay recomputes telemetry statistics, quality policy, experimental intervals, candidate predictions, selection, and verification from embedded raw evidence without hidden labels or network access.",
            "This replays observed evidence, not a physical experiment. The blind evaluation harness can regenerate simulation cases from its published seed/perturbation matrix.",
        ],
    )


def render_html(report: Report) -> str:
    r = report.model_dump()
    decision = html.escape(report.investigation.verification.decision)
    details = html.escape(json.dumps(r, indent=2, ensure_ascii=False))
    escape = lambda value: html.escape(str(value))
    finding = escape(
        report.investigation.verification.finding or "No sufficiently supported finding"
    )
    candidates = "".join(
        "<li><b>"
        + escape(c.title)
        + "</b>: "
        + escape(c.hypothesis)
        + "<br>Prediction: "
        + escape(c.prediction)
        + "</li>"
        for c in report.investigation.candidates
    )
    stats = "".join(
        "<tr><th>"
        + escape(s.channel)
        + "</th><td>"
        + format(s.witness_before.estimate, ".3f")
        + "</td><td>"
        + format(s.witness_after.estimate, ".3f")
        + "</td><td>["
        + format(s.witness_reduction.low, ".3f")
        + ", "
        + format(s.witness_reduction.high, ".3f")
        + "]</td></tr>"
        for s in report.investigation.verification.statistics
    )
    assessments = "".join(
        "<li>"
        + escape(a.hypothesis_id)
        + ": <b>"
        + escape(a.status)
        + "</b> — "
        + escape(a.reason)
        + "</li>"
        for a in report.investigation.verification.assessments
    )
    limitations = "".join(
        "<li>" + escape(item) + "</li>" for item in report.limitations
    )
    selection = report.investigation.selection
    intervention = escape(selection.intervention if selection else "No intervention")
    reasons = "".join(
        "<li>" + html.escape(reason) + "</li>"
        for reason in report.investigation.verification.reasons
    )
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>FORGE investigation report</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px;background:#f7f8f5;color:#243b2c}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}h1{font-size:28px}</style>"
        "<h1>FORGE · Synthetic investigation report</h1><p>Mock/rules-based investigation. No Meta inference or physical diagnosis.</p>"
        "<h2>"
        + decision
        + "</h2><p>Finding: "
        + finding
        + "</p><ul>"
        + reasons
        + "</ul>"
        "<h2>Competing hypotheses</h2><ul>"
        + candidates
        + "</ul><h2>Intervention</h2><p>"
        + intervention
        + "</p>"
        "<h2>Independent experimental evidence</h2><table><thead><tr><th>Signal</th><th>Witness before</th><th>Witness after</th><th>99% pointwise reduction interval</th></tr></thead><tbody>"
        + stats
        + "</tbody></table>"
        "<p>"
        + escape(report.investigation.verification.uncertainty)
        + "</p><h2>Verification assessments</h2><ul>"
        + assessments
        + "</ul>"
        "<h2>Limitations</h2><ul>"
        + limitations
        + "</ul><details><summary>Portable raw evidence and reproduction instructions</summary><pre>"
        + details
        + "</pre></details></html>"
    )


def replay_report(report: Report) -> Verification:
    from .hypotheses import describe_selection, generate_candidates, select_experiment
    from .investigation import summarize

    s = report.investigation
    if report.engine_version != VERSION or s.engine_version != VERSION:
        raise ValueError("Unsupported engine version")
    if (
        report.dataset_identity != dataset_hash(s.measurements)
        or s.dataset_hash != report.dataset_identity
    ):
        raise ValueError("Dataset identity mismatch")
    evidence, observed = summarize(s.measurements)
    if [e.model_dump() for e in evidence] != [
        e.model_dump() for e in s.evidence
    ] or observed != s.observed:
        raise ValueError("Observed evidence mismatch")
    if generate_candidates(observed) != s.candidates:
        raise ValueError("Candidate prediction mismatch")
    if (
        s.selection is None
        or s.experiment is None
        or s.selection.kind != s.experiment.kind
    ):
        raise ValueError("Selection/result mismatch")
    automatic = select_experiment(observed)
    manual = describe_selection(
        s.selection.kind, "Operator-selected allowlisted intervention"
    )
    if s.selection not in (automatic, manual):
        raise ValueError("Selection metadata mismatch")
    expected = make_report(s)
    if report != expected:
        raise ValueError("Report identity, references, or metadata mismatch")
    decision = verify(s.measurements, s.experiment, s.proposed_finding)
    if decision != s.verification:
        raise ValueError("Verification replay mismatch")
    return decision
