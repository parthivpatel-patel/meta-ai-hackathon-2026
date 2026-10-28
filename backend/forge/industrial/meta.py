"""Observed-only model boundary and portable recorded proposals. No network here."""

import html
import json
import re
from typing import Literal

from pydantic import Field

from ..engine.contracts import CHANNELS, BlindInput, Record, dataset_hash, digest
from ..phase2.inference import ModelOutput, ModelRecord
from ..phase3.service import rank
from ..phase3.verification import SequentialDecision
from ..simulation import Measurement
from .investigation import InvestigationRequest, investigate
from .model import COMPONENTS, simulate

MODEL_ID = "meta-models/muse-spark-open-1026"
SCHEMA = "forge-industrial-model-report-1"


class RecordedProposal(Record):
    source: Literal["test_transport", "meta_http_response"]
    provider: Literal["baseten"]
    requested_model: Literal["meta-models/muse-spark-open-1026"]
    returned_model: Literal["meta-models/muse-spark-open-1026"]
    input_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    output_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    output: ModelOutput


def prepare(request: InvestigationRequest) -> tuple[BlindInput, dict]:
    """No supplied narrative, recipes, labels, trial/oracle results or future frames."""
    capture = request.model_copy(update={"experiments": 0})
    report = investigate(capture)
    rows = [Measurement.model_validate(r) for r in report["measurements"]]
    frames = simulate(capture.recipe)["frames"]
    start = capture.recipe.onset - 80
    refs = {
        channel: {
            "sensor_id": sensor,
            "unit": unit,
            "reference": digest([dataset_hash(rows), channel]),
        }
        for channel, sensor, unit in zip(
            CHANNELS,
            ["motor_temperature", "vibration", "discharge_pressure"],
            ["°C", "mm/s", "bar"],
        )
    }
    features = {
        "schema": "forge-observed-machine-evidence-1",
        "operating_mode": "SIMULATION_ONLY",
        "equipment_id": "pump-104",
        "component_id": capture.context.component_id,
        "associated_sensor_ids": COMPONENTS[capture.context.component_id]["sensors"],
        "evidence_references": refs,
        "reference_contract": "Output evidence_channels names these closed channel references; no invented references or tools.",
        "window": {
            "first_timestamp": frames[start]["timestamp"],
            "last_timestamp": frames[start + 119]["timestamp"],
            "sample_period_seconds": capture.recipe.sample_period_seconds,
            "samples": 120,
        },
        "observed_samples": [
            {
                "timestamp": frames[start + index]["timestamp"],
                **{c: getattr(rows[index], c) for c in CHANNELS},
            }
            for index in (0, 39, 79, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 119)
        ],
        "uncertainty": "Synthetic observations only; unknown cause. Channel support cannot uniquely identify a mechanical failure.",
    }
    return BlindInput.model_validate(report["observed"]), features


def validate_output(output: ModelOutput) -> None:
    if len(output.hypotheses) < 2:
        raise ValueError("At least two competing hypotheses are required")
    for h in output.hypotheses:
        expected = (
            [] if h.hypothesis_id == "normal" else [h.hypothesis_id.split("-")[-1]]
        )
        if h.evidence_channels != expected:
            raise ValueError(
                "Candidate must reference its registered observation channel"
            )
        if re.search(
            r"://|```|<\s*script|__import__|\b(?:eval|exec)\s*\(|\b(?:sudo|actuate)\b|\bshut\s*down\b|\bopen\s+(?:the\s+)?valve\b",
            h.rationale,
            re.IGNORECASE,
        ):
            raise ValueError("Executable, URL or equipment-control narrative rejected")


def public_proposal(record: ModelRecord) -> RecordedProposal:
    """Whitelist only; operational diagnostics/usage/headers never enter public exports."""
    if record.input_mode != "numerical_summaries":
        raise ValueError("Workstation requires observed numeric evidence")
    return RecordedProposal.model_validate(
        {k: getattr(record, k) for k in RecordedProposal.model_fields}
    )


def make_report(request: InvestigationRequest, proposal: RecordedProposal) -> dict:
    observed, features = prepare(request)
    validate_output(proposal.output)
    if proposal.input_hash != digest(
        {"telemetry": observed.model_dump(), "multimodal_features": features}
    ) or proposal.output_hash != digest(proposal.output.model_dump()):
        raise ValueError("Proposal is not bound to the captured observations")
    baseline = investigate(request)
    rows = [Measurement.model_validate(r) for r in baseline["measurements"]]
    decision = SequentialDecision.model_validate(baseline["decision"])
    payload = {
        **{k: v for k, v in baseline.items() if k != "report_hash"},
        "schema": SCHEMA,
        "provider": "Recorded fixture proposals — not Meta inference"
        if proposal.source == "test_transport"
        else "Recorded Meta response claim — source not authenticated by replay",
        "model_proposal": proposal.model_dump(mode="json"),
        "model_evidence": {
            "telemetry": observed.model_dump(),
            "multimodal_features": features,
        },
        "hypotheses": proposal.output.model_dump(),
        "ranking": [
            r.model_dump()
            for r in rank(proposal.output, decision, observed, dataset_hash(rows))
        ],
        "limitations": baseline["limitations"]
        + [
            "Recorded proposal replay performs no inference. Source/model fields are consistency evidence, not cryptographic provider authentication.",
            "Model proposals never select experiments, actuate equipment or override numerical verification.",
            "Public export excludes private provider diagnostics and usage; private receipts stay with the owner.",
        ],
    }
    return {**payload, "report_hash": digest(payload)}


def replay(report: dict) -> dict:
    if not isinstance(report, dict) or report.get("schema") != SCHEMA:
        raise ValueError("Unsupported recorded-proposal report")
    request = InvestigationRequest.model_validate(report.get("request"))
    proposal = RecordedProposal.model_validate(report.get("model_proposal"))
    expected = make_report(request, proposal)
    if digest(report) != digest(expected):
        raise ValueError("Recorded proposal or independent evidence does not reproduce")
    return expected


def advance(report: dict) -> dict:
    verified = replay(report)
    if not verified["plan"] or verified["request"]["experiments"] >= 4:
        raise ValueError("No further supported experiment")
    request = InvestigationRequest.model_validate(verified["request"])
    return make_report(
        request.model_copy(update={"experiments": request.experiments + 1}),
        RecordedProposal.model_validate(verified["model_proposal"]),
    )


def render(report: dict) -> str:
    r = replay(report)
    esc = lambda value: html.escape(str(value))
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FORGE recorded proposals</title><body><h1>FORGE recorded proposals</h1><p>'
        + esc(r["provider"])
        + "</p><p>Simulation only. No physical actuation. Replay makes no model calls.</p><h2>Independent numerical verification</h2><p>"
        + esc(r["decision"]["status"])
        + "</p><p>"
        + esc(r["decision"]["findings"])
        + "</p><h2>Competing proposals</h2><ul>"
        + "".join(
            "<li>" + esc(h["hypothesis_id"]) + ": " + esc(h["rationale"]) + "</li>"
            for h in r["hypotheses"]["hypotheses"]
        )
        + "</ul><h2>Limitations</h2><ul>"
        + "".join("<li>" + esc(x) + "</li>" for x in r["limitations"])
        + '</ul><details><summary>Complete reproduction evidence</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'
        + esc(json.dumps(r, indent=2))
        + "</pre></details></body></html>"
    )
