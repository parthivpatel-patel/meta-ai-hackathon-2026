"""Existing hypothesis/selection/verifier contracts over coupled-simulator observations."""

import html
import json
from typing import Literal

import numpy as np
from pydantic import Field

from ..engine.contracts import CHANNELS, Record, dataset_hash, digest
from ..engine.hypotheses import generate_candidates
from ..phase2.contracts import Samples, Trial, seal_trial
from ..phase2.inference import ModelHypothesis, ModelOutput
from ..phase2.verification import observe
from ..phase3.service import rank, select
from ..phase3.verification import verify
from ..simulation import Measurement
from .model import COMPONENTS, Recipe, simulate
from .presentation import render_progress


class CoupledTrial(Trial):
    """Versioned simulator provenance; legacy Trial parsing remains closed."""

    simulator: Literal["coupled-pump-1"] = "coupled-pump-1"


class Context(Record):
    component_id: str = Field(default="pump", max_length=40)
    at_sequence: int = Field(default=319, ge=319, le=359)


class InvestigationRequest(Record):
    recipe: Recipe = Recipe()
    context: Context = Context()
    experiments: int = Field(default=0, ge=0, le=4)


def project(frame, true=False):
    data = (
        frame["truth"]
        if true
        else {r["sensor_id"]: r["value"] for r in frame["readings"]}
    )
    return {
        c: data[s]
        for c, s in zip(
            CHANNELS, ["motor_temperature", "vibration", "discharge_pressure"]
        )
    }


def investigate(request: InvestigationRequest):
    if request.context.component_id not in COMPONENTS:
        raise ValueError("Unknown component")
    if not COMPONENTS[request.context.component_id]["sensors"]:
        raise ValueError("Component has no associated instruments")
    if request.recipe.actions:
        raise ValueError(
            "Investigations require an unmodified captured scenario; reset before capture"
        )
    if request.context.at_sequence >= request.recipe.steps:
        raise ValueError("Capture sequence outside recording")
    data = simulate(request.recipe, include_truth=True)
    rows = [
        Measurement(minute=i, **project(f))
        for i, f in enumerate(
            data["frames"][request.recipe.onset - 80 : request.recipe.onset + 40]
        )
    ]
    observed = observe(rows)
    output = ModelOutput(
        hypotheses=[
            ModelHypothesis(
                hypothesis_id=c.id,
                rationale=c.hypothesis,
                evidence_channels=[] if c.id == "normal" else [c.id.split("-")[-1]],
            )
            for c in generate_candidates(observed)
        ]
    )
    trials = []
    decision = verify(rows, trials)
    plan = None
    events = []
    before = data["frames"][request.context.at_sequence]
    healthy = simulate(
        request.recipe.model_copy(update={"scenario": "normal"}), include_truth=True
    )["frames"][request.context.at_sequence]
    base = project(healthy, True)
    for count in range(request.experiments):
        plan = select(observed, decision, trials, 4)
        if plan is None:
            break
        sequence = request.context.at_sequence + 1
        actions = (
            []
            if plan.kind.value == "reference_check"
            else [{"sequence": sequence, "kind": plan.kind.value}]
        )
        after_recipe = Recipe(
            **{**request.recipe.model_dump(), "steps": 600, "actions": actions}
        )
        after = (
            simulate(after_recipe, include_truth=True)["frames"][
                request.context.at_sequence + 160
            ]
            if actions
            else before
        )
        samples = []
        for idx, (channel, scale) in enumerate(zip(CHANNELS, [0.8, 0.08, 0.12])):
            rng = np.random.default_rng(
                np.random.SeedSequence([request.recipe.seed, count, idx, 4104])
            )
            arrays = []
            for frame, true in [
                (before, False),
                (after, False),
                (before, True),
                (after, True),
            ]:
                value = (project(frame, true)[channel] - base[channel]) / scale
                arrays.append(
                    [round(value + float(x), 8) for x in rng.normal(0, 0.5, 96)]
                )
            samples.append(
                Samples(
                    channel=channel,
                    primary_before=arrays[0],
                    primary_after=arrays[1],
                    witness_before=arrays[2],
                    witness_after=arrays[3],
                )
            )
        sealed = seal_trial(dataset_hash(rows), plan.kind, samples)
        trial = CoupledTrial(**{**sealed.model_dump(), "simulator": "coupled-pump-1"})
        trials.append(trial)
        decision = verify(rows, trials, len(trials) >= 4)
        events.append(
            {
                "id": trial.id,
                "action": plan.kind.value,
                "sequence": sequence,
                "mode": "COUNTERFACTUAL_SIMULATION",
                "after_sequence": request.context.at_sequence + 160,
                "after_frame": {k: v for k, v in after.items() if k != "truth"},
                "verification": decision.status,
            }
        )
    plan = (
        select(observed, decision, trials, 4)
        if decision.status == "IN_PROGRESS"
        else None
    )
    if decision.status == "IN_PROGRESS" and plan is None:
        decision = verify(rows, trials, True)
    payload = {
        "schema": "forge-industrial-report-1",
        "engine": "existing-phase3-verifier/coupled-pump-1",
        "request": request.model_dump(mode="json"),
        "machine_id": "pump-104",
        "source": "SIMULATED",
        "provider": "rules-based, not Meta",
        "evidence_window": {
            "first_sequence": request.recipe.onset - 80,
            "last_sequence": request.recipe.onset + 39,
            "time_step_seconds": request.recipe.sample_period_seconds,
            "legacy_index_field": "minute is a sample index in this adapter, not elapsed minutes",
        },
        "measurements": [r.model_dump() for r in rows],
        "observed": observed.model_dump(),
        "hypotheses": output.model_dump(),
        "ranking": [
            r.model_dump() for r in rank(output, decision, observed, dataset_hash(rows))
        ],
        "trials": [t.model_dump(mode="json") for t in trials],
        "events": events,
        "decision": decision.model_dump(),
        "plan": plan.model_dump(mode="json") if plan else None,
        "limitations": [
            "Coupled pedagogical model, not field-validated physics or a calibrated twin",
            "Only motor-temperature, vibration and discharge-pressure are projected to the existing verifier",
            "Channel-level support is not unique identification of bearing, alignment or cavitation failure",
            "96 synthetic instrument replicates of fixed before/after states, not recorded independent industrial trials",
            "Counterfactual experiments do not overwrite observed history; no physical actuation",
            "Digest/replay consistency is not authentication of an external source",
        ],
    }
    return {**payload, "report_hash": digest(payload)}


def replay(report):
    if (
        not isinstance(report, dict)
        or report.get("schema") != "forge-industrial-report-1"
    ):
        raise ValueError("Unsupported industrial report")
    request = InvestigationRequest.model_validate(report.get("request"))
    expected = investigate(request)
    # Python equality treats True == 1 and False == 0. Compare canonical JSON
    # digests so type-coerced or numerically altered records cannot retain a seal.
    if digest(expected) != digest(report):
        raise ValueError("Report/evidence/reproduction mismatch")
    return expected


def render(report):
    replay(report)
    escape = lambda x: html.escape(str(x))
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORGE machine investigation</title><body><h1>FORGE machine investigation</h1><p>Simulation only. No physical actuation or genuine Meta inference.</p><h2>Context</h2><p>'
        + escape(report["request"])
        + "</p><h2>Independent verification</h2><p>"
        + escape(report["decision"]["status"])
        + "</p><p>"
        + escape(report["decision"]["findings"])
        + "</p><h2>Experiments</h2><ul>"
        + "".join(
            "<li>" + escape(e["action"]) + ": " + escape(e["verification"]) + "</li>"
            for e in report["events"]
        )
        + "</ul>"
        + render_progress(report)
        + "<h2>Uncertainty</h2><p>"
        + escape(report["decision"]["uncertainty"])
        + "</p><h2>Limitations</h2><ul>"
        + "".join("<li>" + escape(x) + "</li>" for x in report["limitations"])
        + '</ul><details><summary>Evidence, hypotheses and complete reproduction record</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'
        + escape(json.dumps(report, indent=2))
        + "</pre></details></body></html>"
    )


def proposal_evidence(report):
    """Prepare verified bounded numeric evidence for a future authorized private call.

    No transport, credentials, scenario labels, seeds or latent state cross this boundary.
    """
    replay(report)
    component = COMPONENTS[report["request"]["context"]["component_id"]]
    summaries = []
    for trial in report["trials"]:
        for probe in trial["probes"]:
            summaries.append(
                {
                    "experiment": trial["kind"],
                    "channel": probe["channel"],
                    "replicates": 96,
                    "normalized_witness_before_mean": sum(probe["witness_before"]) / 96,
                    "normalized_witness_after_mean": sum(probe["witness_after"]) / 96,
                    "normalized_primary_before_mean": sum(probe["primary_before"]) / 96,
                    "normalized_primary_after_mean": sum(probe["primary_after"]) / 96,
                }
            )
    return {
        "schema": "forge-industrial-proposal-1",
        "mode": "SIMULATION_ONLY",
        "machine_id": "pump-104",
        "component_id": component["id"],
        "sensor_ids": component["sensors"],
        "observed": report["observed"],
        "candidate_ids": [
            h["hypothesis_id"] for h in report["hypotheses"]["hypotheses"]
        ],
        "experiment_summaries": summaries,
        "uncertainty": report["decision"]["uncertainty"],
        "instructions_scope": "Channel-level candidate proposals only. No tools or actuation. Numerical verification remains independent.",
    }
