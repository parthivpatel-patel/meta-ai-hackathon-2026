"""Portable sequential report, independent state replay, escaped HTML."""

import html

from ..engine.contracts import dataset_hash, digest
from ..engine.hypotheses import generate_candidates
from ..phase2.evidence import summarize_assets
from ..phase2.inference import ModelHypothesis, ModelOutput
from ..phase2.thermal_input import verify_visual_record
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
            or not verify_visual_record(i, s.assets)
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
    """Human report plus complete escaped audit data; replay before presentation."""
    decision = replay(report)
    s = report["investigation"]
    escape = lambda x: html.escape(str(x))
    import json

    def label(value):
        names = {
            "normal": "Measurements consistent with the baseline",
            "SUPPORTED_SYNTHETIC": "Supported in this simulation",
            "INCONCLUSIVE": "Evidence is inconclusive",
            "ABSTAIN": "Not enough evidence",
            "reference_check": "Check independent reference readings",
            "restore_feed": "Restore the process input",
            "recalibrate_sensor": "Recalibrate a sensor",
        }
        if value.startswith("process-"):
            return "Change in process " + value.split("-", 1)[1]
        if value.startswith("sensor-"):
            return value.split("-", 1)[1].capitalize() + " sensor error"
        return names.get(value, value.replace("_", " ").capitalize())

    def table(headers, rows):
        return (
            "<table><thead><tr>"
            + "".join('<th scope="col">' + escape(h) + "</th>" for h in headers)
            + "</tr></thead><tbody>"
            + "".join(
                "<tr>" + "".join("<td>" + escape(c) + "</td>" for c in row) + "</tr>"
                for row in rows
            )
            + "</tbody></table>"
        )

    source = {
        "deterministic_rules_not_meta": "Rules-based proposals, not Meta inference",
        "not_run": "No model inference performed",
        "test_transport": "Local test response, not genuine inference",
        "meta_http_response": "Recorded Meta response; see the model provenance in the audit record",
    }[s["model_source"]]
    context = table(
        ["Case detail", "Value"],
        [
            ("Investigation", s["metadata"]["investigation_title"]),
            ("Equipment", s["metadata"]["equipment_id"]),
            (
                "Acquisition start",
                s["metadata"].get("acquired_at")
                or "Relative time, one-minute intervals",
            ),
            (
                "Data",
                "Synthetic measurements; temperature °C, vibration mm/s, pressure bar",
            ),
            ("Analysis", source),
        ],
    )
    findings = (
        "<ul>"
        + "".join("<li>" + escape(label(f)) + "</li>" for f in decision.findings)
        + "</ul>"
        if decision.findings
        else "<p>No supported diagnosis. Review uncertainty before taking further action.</p>"
    )
    ranking = table(
        ["Possible cause", "Rank (not probability)", "Evidence status"],
        [
            (label(r["hypothesis_id"]), r["rank"], label(r["evidence_status"]))
            for r in s["ranking"]
        ],
    )
    trials = []
    for trial in s["trials"]:
        for probe in trial["probes"]:
            before, after = probe["witness_before"], probe["witness_after"]
            trials.append(
                (
                    label(trial["kind"]),
                    probe["channel"],
                    f"{sum(before) / len(before):.3f}",
                    f"{sum(after) / len(after):.3f}",
                    len(before),
                )
            )
    experiments = table(
        ["Test", "Signal", "Witness before", "Witness after", "Replicates"], trials
    )
    evidence = table(
        ["Evidence", "Source", "Scope"],
        [
            (
                e["summary"],
                e["provenance"].replace("_", " "),
                e["scope"].replace("_", " "),
            )
            for e in s["evidence"]
        ],
    )
    channels = table(
        ["Signal", "Verification", "Reason"],
        [
            (c["channel"], label(c["status"]), "; ".join(c["reasons"]))
            for c in decision.model_dump()["channels"]
        ],
    )
    return (
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORGE investigation report</title>'
        "<style>body{font:16px/1.6 system-ui,sans-serif;color:#172f30;max-width:1000px;margin:40px auto;padding:0 20px}h1,h2{line-height:1.2}table{width:100%;border-collapse:collapse;display:block;overflow-x:auto;margin:20px 0}td,th{text-align:left;padding:10px;border-bottom:1px solid #d5dfdf;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere}summary{cursor:pointer}footer{border-top:1px solid #d5dfdf;margin-top:30px}@media print{details{display:none}body{margin:0}}</style></head><body><header><p>FORGE · Investigation report</p><h1>"
        + escape(s["metadata"]["investigation_title"])
        + "</h1><p>Synthetic research demonstration. Physical-world causality is not established.</p></header><main><h2>Case information</h2>"
        + context
        + "<h2>Findings</h2><p><strong>"
        + escape(label(decision.status))
        + "</strong></p>"
        + findings
        + "<h2>Independent verification</h2>"
        + channels
        + "<h2>Uncertainty</h2><p>"
        + escape(decision.uncertainty)
        + "</p><p>"
        + escape("; ".join(decision.reasons))
        + "</p>"
        + "<h2>Possible causes considered</h2>"
        + ranking
        + "<h2>Tests and new observations</h2><p>Witness means below use normalized baseline units, not engineering units or failure probabilities. Tests are controlled numerical experiments, not interventions on equipment.</p>"
        + experiments
        + "<h2>Evidence and provenance</h2>"
        + evidence
        + "<h2>Limitations</h2><p>"
        + escape(s["verification_scope"])
        + "</p><p>"
        + escape(s["uncertainty_policy"])
        + "</p>"
        + "<details><summary>Technical audit record and offline reproduction</summary><pre>"
        + escape(json.dumps(report, indent=2))
        + "</pre></details></main><footer>FORGE · Preserve the JSON export for independent offline replay.</footer></body></html>"
    )
