import hashlib
import json
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from ..simulation import Measurement

VERSION = "forge-engine-1.0"
CHANNELS = ("temperature", "vibration", "pressure")
Channel = Literal["temperature", "vibration", "pressure"]
HypothesisID = Literal[
    "normal",
    "process-temperature",
    "process-vibration",
    "process-pressure",
    "sensor-temperature",
    "sensor-vibration",
    "sensor-pressure",
]


class Record(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, frozen=True)


class ExperimentKind(StrEnum):
    REFERENCE = "reference_check"
    COOLING = "restore_cooling"
    BALANCE = "balance_rotor"
    FEED = "restore_feed"


TARGETS = {
    ExperimentKind.COOLING: "temperature",
    ExperimentKind.BALANCE: "vibration",
    ExperimentKind.FEED: "pressure",
}


def digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), allow_nan=False
        ).encode()
    ).hexdigest()


def dataset_hash(rows: list[Measurement]) -> str:
    return digest([r.model_dump() for r in rows])


class SignalSummary(Record):
    channel: Channel
    flags: int = Field(ge=0, le=1000)
    max_score: float = Field(ge=0, le=1e13)
    post_observed: int = Field(ge=0, le=1000)


class BlindInput(Record):
    signals: list[SignalSummary] = Field(max_length=3)
    quality_issues: list[str] = Field(max_length=10)


class Candidate(Record):
    id: HypothesisID
    title: str
    hypothesis: str
    prediction: str
    basis: str
    source: Literal["deterministic_rules_not_meta"] = "deterministic_rules_not_meta"


class Selection(Record):
    kind: ExperimentKind
    rationale: str
    intervention: str
    replicates: int = Field(default=24, ge=24, le=24)
    max_steps: int = Field(default=24, ge=24, le=24)


Number = Annotated[float, Field(ge=-1e6, le=1e6)]


class Probe(Record):
    channel: Channel
    primary_before: list[Number] = Field(max_length=24)
    primary_after: list[Number] = Field(max_length=24)
    witness_before: list[Number] = Field(max_length=24)
    witness_after: list[Number] = Field(max_length=24)


class ExperimentResult(Record):
    id: str = Field(pattern=r"^EXP-[a-f0-9]{64}$")
    dataset_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    simulator: Literal["independent-relaxation-v1"] = "independent-relaxation-v1"
    kind: ExperimentKind
    probes: list[Probe] = Field(min_length=3, max_length=3)
    provenance: str = "Synthetic paired intervention replicates; independent witness sensor; no physical equipment."


class Proposal(Record):
    hypothesis_id: HypothesisID
    scope: Literal["synthetic_mechanism", "physical_cause", "correlation"] = (
        "synthetic_mechanism"
    )


class Assessment(Record):
    hypothesis_id: HypothesisID
    status: Literal["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"]
    evidence_refs: list[str]
    reason: str


class Interval(Record):
    estimate: float
    low: float
    high: float


class ProbeStatistics(Record):
    channel: Channel
    n: int
    primary_before: Interval
    primary_after: Interval
    witness_before: Interval
    witness_after: Interval
    witness_reduction: Interval


class Verification(Record):
    decision: Literal["SUPPORTED_SYNTHETIC", "REJECTED", "INCONCLUSIVE", "ABSTAIN"]
    finding: HypothesisID | None
    reasons: list[str]
    assessments: list[Assessment]
    statistics: list[ProbeStatistics]
    uncertainty: str
    causal_scope: Literal["synthetic_model_only"] = "synthetic_model_only"
