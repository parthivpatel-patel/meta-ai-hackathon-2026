"""Portable sequential report, independent state replay, escaped HTML."""

import html

from ..engine.contracts import dataset_hash, digest
from ..engine.hypotheses import generate_candidates
from ..phase2.evidence import summarize_assets
from ..phase2.inference import ModelHypothesis, ModelOutput
from ..phase2.verification import observe
from .service import Session, evidence_refs, rank, select
from .verification import verify

REPRODUCTION = "From backend: uv run --frozen python -m forge.phase3.replay report.json. Offline numerical replay only, not an inference rerun or physical experiment."


def export(s: Session) -> dict:
    if s.status != "COMPLETE":
        raise ValueError("Complete the investigation before exporting")
    payload = s.model_dump(mode="json")
    payload.pop("id")
    payload.pop("version")
    return {
        "schema": "forge-report-3",
        "run_id": "RUN3-" + digest(payload),
        "investigation": payload,
        "reproduction": REPRODUCTION,
        "limitations": [
            "Synthetic systems only; no physical causality or industrial certification",
            "Ordinal rankings and statistical intervals are not calibrated causal probabilities",
            "Thermal/waveform context has no independent time/alignment or model-vision verification",
            "Evidence digests are not source authentication; model provenance is not a signed attestation",
        ],
    }


def replay(report: dict):
    if (
        set(report)
        != {"schema", "run_id", "investigation", "reproduction", "limitations"}
        or report["schema"] != "forge-report-3"
    ):
        raise ValueError("Unsupported report schema")
    payload = report["investigation"]
    s = Session.model_validate({**payload, "id": "0" * 32, "version": 0})
    if (
        s.plan is not None
        or s.verification_scope != Session.model_fields["verification_scope"].default
        or s.uncertainty_policy != Session.model_fields["uncertainty_policy"].default
    ):
        raise ValueError("Canonical scope or completed-state mismatch")
    if export(s) != report:
        raise ValueError("Report identity or canonical metadata mismatch")
    if s.dataset_hash != dataset_hash(s.measurements) or s.observed != observe(
        s.measurements
    ):
        raise ValueError("Observation replay mismatch")
    if s.asset_features != summarize_assets(s.assets) or s.evidence != evidence_refs(
        s.measurements, s.assets, s.metadata
    ):
        raise ValueError("Cross-modal provenance mismatch")
    # Recompute each selection from prior evidence; no private labels or generator authority.
    previous = []
    for trial in s.trials:
        decision = verify(s.measurements, previous, len(previous) >= s.max_experiments)
        planned = select(s.observed, decision, previous, s.max_experiments)
        if planned is None or planned.kind != trial.kind:
            raise ValueError("Sequential selection mismatch")
        previous.append(trial)
    decision = verify(s.measurements, s.trials, len(s.trials) >= s.max_experiments)
    if (
        decision != s.decision
        or rank(s.hypotheses, decision, s.observed, s.dataset_hash) != s.ranking
    ):
        raise ValueError("Independent sequential verification mismatch")
    if s.model_source == "not_run":
        if (
            s.hypotheses is not None
            or s.trials
            or s.inference
            or decision.status != "ABSTAIN"
        ):
            raise ValueError("Missing hypothesis provenance")
    elif s.model_source == "deterministic_rules_not_meta":
        expected = ModelOutput(
            hypotheses=[
                ModelHypothesis(
                    hypothesis_id=c.id,
                    rationale=c.hypothesis,
                    evidence_channels=[] if c.id == "normal" else [c.id.split("-")[-1]],
                )
                for c in generate_candidates(s.observed)
            ]
        )
        if s.hypotheses != expected or s.inference is not None:
            raise ValueError("Rules provenance mismatch")
    else:
        i = s.inference
        if (
            i is None
            or i.source != s.model_source
            or i.output != s.hypotheses
            or i.input_hash
            != digest(
                {
                    "telemetry": s.observed.model_dump(),
                    "multimodal_features": s.asset_features,
                }
            )
            or i.output_hash != digest(i.output.model_dump())
            or i.requested_model != i.returned_model
        ):
            raise ValueError("Model provenance mismatch")
    # Reconstruct the deterministic event timeline, preventing invented execution claims.
    expected = [
        {
            "index": 0,
            "action": "observe",
            "evidence_refs": [],
            "detail": "Created an isolated synthetic case; recipe/answer labels excluded from model inputs",
        }
    ]
    if s.model_source != "not_run":
        expected.append(
            {
                "index": 1,
                "action": "hypothesize",
                "evidence_refs": [],
                "detail": "Candidate suggestions from "
                + s.model_source
                + "; all remain subject to independent verification",
            }
        )
    prior = []
    for trial in s.trials:
        before = verify(s.measurements, prior, len(prior) >= s.max_experiments)
        plan = select(s.observed, before, prior, s.max_experiments)
        expected.append(
            {
                "index": len(expected),
                "action": "select",
                "evidence_refs": [],
                "detail": plan.kind.value + ": " + plan.reason,
            }
        )
        prior.append(trial)
        after = verify(s.measurements, prior, len(prior) >= s.max_experiments)
        expected.append(
            {
                "index": len(expected),
                "action": "execute_and_verify",
                "evidence_refs": [trial.id],
                "detail": plan.kind.value + " → " + after.status,
            }
        )
    if [e.model_dump() for e in s.events] != expected:
        raise ValueError("Execution timeline mismatch")
    return decision


def render(report):
    decision = replay(report)
    s = report["investigation"]
    escape = lambda x: html.escape(str(x))
    import json

    rows = "".join(
        "<tr><td>"
        + escape(r["hypothesis_id"])
        + "</td><td>"
        + escape(r["rank"])
        + "</td><td>"
        + escape(r["evidence_status"])
        + "</td></tr>"
        for r in s["ranking"]
    )
    events = "".join("<li>" + escape(e["detail"]) + "</li>" for e in s["events"])
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORGE sequential report</title><h1>FORGE · Verifiable synthetic investigation</h1><p>'
        + escape(s["model_source"])
        + "</p><h2>"
        + escape(decision.status)
        + "</h2><p>"
        + escape(", ".join(decision.findings))
        + "</p><p>Physical-world causality is not established.</p><h2>Evidence ranking (not probabilities)</h2><table>"
        + rows
        + "</table><h2>Experiment timeline</h2><ol>"
        + events
        + '</ol><details><summary>Raw evidence and reproduction</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'
        + escape(json.dumps(report, indent=2))
        + "</pre></details></html>"
    )
