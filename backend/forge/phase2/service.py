"""Versioned bounded orchestration, model proposals, and portable evidence replay."""

from typing import Literal

from pydantic import Field

from ..engine.contracts import BlindInput, ExperimentKind, Record, dataset_hash, digest
from ..engine.hypotheses import generate_candidates
from ..simulation import Measurement
from .contracts import Trial
from .evidence import EvidenceBundle, summarize_assets
from .inference import HypothesisProvider, ModelHypothesis, ModelOutput, ModelRecord
from .oracle import Oracle, Recipe
from .thermal_input import verify_visual_record
from .verification import Decision, observe, verify

LIMITATIONS = [
    "Synthetic additive model only; not physical-world causality or industrial safety advice.",
    "Four interventions with 96 replicates each versus one with 24 in v1 use sixteen times the raw experimental sample budget; this is not a like-for-like compute comparison.",
    "Thermal and waveform features are contextual, not independently validated mechanistic proof.",
    "No general photo/video/audio model inference. Uploaded provenance and endpoint model identity are not attested.",
    "Digests prove internal consistency, not authenticity. No persistent storage or multi-user authentication.",
]


def canonical_trace(source: str) -> list[str]:
    return [
        "Observed label-free telemetry and bounded multimodal features",
        "Generated " + source + " candidate suggestions",
        "Selected reference plus three ranked bounded interventions",
        "Executed 96 independent synthetic replicates per intervention",
        "Independently verified every channel and checked model proposals",
    ]


class ModelAssessment(Record):
    hypothesis_id: str
    status: Literal["SUPPORTED_SYNTHETIC", "NOT_SUPPORTED", "INCONCLUSIVE"]
    reason: str


class RunReport(Record):
    schema_version: Literal["forge-report-2"] = "forge-report-2"
    engine_version: Literal["forge-engine-2.0"] = "forge-engine-2.0"
    id: str
    dataset_hash: str
    measurements: list[Measurement] = Field(min_length=120, max_length=120)
    observed: BlindInput
    assets: EvidenceBundle
    asset_features: dict
    model_source: Literal[
        "deterministic_rules_not_meta", "meta_http_response", "test_transport"
    ]
    hypotheses: ModelOutput
    inference: ModelRecord | None = None
    trials: list[Trial] = Field(min_length=4, max_length=4)
    verification: Decision
    model_assessments: list[ModelAssessment]
    trace: list[str]
    limitations: list[str]
    reproduction: str = "From backend: uv run --frozen python -m forge.phase2.replay report.json. Recomputes evidence and decisions offline; does not rerun a physical or model inference experiment."


def assess(output: ModelOutput, decision: Decision) -> list[ModelAssessment]:
    return [
        ModelAssessment(
            hypothesis_id=h.hypothesis_id,
            status="SUPPORTED_SYNTHETIC"
            if decision.status == "SUPPORTED_SYNTHETIC"
            and h.hypothesis_id in decision.findings
            else "INCONCLUSIVE"
            if decision.status in ("INCONCLUSIVE", "ABSTAIN")
            else "NOT_SUPPORTED",
            reason="Independent raw-evidence verifier; model rationale is untrusted text and is never accepted as a causal finding.",
        )
        for h in output.hypotheses
    ]


def order(observed: BlindInput) -> list[ExperimentKind]:
    mapping = {
        "temperature": ExperimentKind.COOLING,
        "vibration": ExperimentKind.BALANCE,
        "pressure": ExperimentKind.FEED,
    }
    ranked = sorted(observed.signals, key=lambda s: (-s.flags, -s.max_score, s.channel))
    selected = [mapping[s.channel] for s in ranked]
    return (
        [ExperimentKind.REFERENCE]
        + selected
        + [k for k in mapping.values() if k not in selected]
    )


async def investigate(
    recipe: Recipe, assets: EvidenceBundle, provider: HypothesisProvider | None = None
) -> RunReport:
    oracle = Oracle(recipe)
    observed = observe(oracle.rows)
    features = summarize_assets(assets)
    inference = None
    if provider:
        inference = await provider.infer(observed, features)
        output = inference.output
        source = inference.source
    else:
        candidates = generate_candidates(observed)
        output = ModelOutput(
            hypotheses=[
                ModelHypothesis(
                    hypothesis_id=c.id,
                    rationale=c.hypothesis,
                    evidence_channels=[] if c.id == "normal" else [c.id.split("-")[-1]],
                )
                for c in candidates
            ]
        )
        source = "deterministic_rules_not_meta"
    trials = [oracle.execute(kind) for kind in order(observed)]
    decision = verify(oracle.rows, trials)
    identity = digest(
        {
            "dataset": oracle.data_hash,
            "trials": [t.id for t in trials],
            "assets": features["content_hash"],
            "output": output.model_dump(),
            "source": source,
        }
    )
    return RunReport(
        id="RUN2-" + identity,
        dataset_hash=oracle.data_hash,
        measurements=oracle.rows,
        observed=observed,
        assets=assets,
        asset_features=features,
        model_source=source,
        hypotheses=output,
        inference=inference,
        trials=trials,
        verification=decision,
        model_assessments=assess(output, decision),
        trace=canonical_trace(source),
        limitations=LIMITATIONS,
    )


def replay(report: RunReport) -> Decision:
    if (
        report.limitations != LIMITATIONS
        or report.trace != canonical_trace(report.model_source)
        or report.reproduction != RunReport.model_fields["reproduction"].default
    ):
        raise ValueError("Canonical report metadata mismatch")
    if report.dataset_hash != dataset_hash(report.measurements):
        raise ValueError("Dataset identity mismatch")
    observed = observe(report.measurements)
    if observed != report.observed:
        raise ValueError("Observation replay mismatch")
    features = summarize_assets(report.assets)
    if features != report.asset_features:
        raise ValueError("Multimodal feature replay mismatch")
    if [t.kind for t in report.trials] != order(observed):
        raise ValueError("Experiment selection replay mismatch")
    decision = verify(report.measurements, report.trials)
    if (
        decision != report.verification
        or assess(report.hypotheses, decision) != report.model_assessments
    ):
        raise ValueError("Independent verification replay mismatch")
    if report.model_source == "deterministic_rules_not_meta":
        if report.inference is not None:
            raise ValueError("Rules output cannot claim network inference")
        candidates = generate_candidates(observed)
        expected = ModelOutput(
            hypotheses=[
                ModelHypothesis(
                    hypothesis_id=c.id,
                    rationale=c.hypothesis,
                    evidence_channels=[] if c.id == "normal" else [c.id.split("-")[-1]],
                )
                for c in candidates
            ]
        )
        if expected != report.hypotheses:
            raise ValueError("Rules provenance mismatch")
    else:
        inference = report.inference
        if (
            inference is None
            or inference.source != report.model_source
            or inference.output != report.hypotheses
        ):
            raise ValueError("Model provenance mismatch")
        if (
            inference.requested_model != inference.returned_model
            or not verify_visual_record(inference, report.assets)
            or inference.input_hash
            != digest(
                {"telemetry": observed.model_dump(), "multimodal_features": features}
            )
            or inference.output_hash != digest(inference.output.model_dump())
        ):
            raise ValueError("Model evidence digest mismatch")
    identity = digest(
        {
            "dataset": report.dataset_hash,
            "trials": [t.id for t in report.trials],
            "assets": features["content_hash"],
            "output": report.hypotheses.model_dump(),
            "source": report.model_source,
        }
    )
    if report.id != "RUN2-" + identity:
        raise ValueError("Run identity mismatch")
    return decision
