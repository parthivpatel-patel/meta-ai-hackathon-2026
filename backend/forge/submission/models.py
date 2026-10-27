"""Evidence-backed model catalog. Event identifiers require explicit participant confirmation."""

import json
from dataclasses import asdict, dataclass
from typing import Literal


@dataclass(frozen=True)
class ModelCandidate:
    model_id: str
    status: Literal["documented_public", "participant_confirmed_event"]
    source: str
    endpoint: str = "https://inference.baseten.co/v1/chat/completions"
    family_eligibility: str = "Public event permits Meta open weights; participant confirms event-specific model/credential restriction in the redesign directive"
    account_access_verified: bool = False


BASETEN_MODELS = (
    ModelCandidate(
        "meta-models/muse-spark-open",
        "documented_public",
        "https://www.baseten.co/library/muse-spark-open/",
    ),
    ModelCandidate(
        "meta-models/muse-spark-open-1026",
        "participant_confirmed_event",
        "https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details",
    ),
)
EVENT_MODEL_ID = "meta-models/muse-spark-open-1026"
PARTICIPANT_CONFIRMED_BASETEN_IDS = frozenset({EVENT_MODEL_ID})

DOCUMENTED_BASETEN_IDS = frozenset(
    m.model_id for m in BASETEN_MODELS if m.status == "documented_public"
)


def main() -> None:
    print(
        json.dumps(
            {
                "models": [asdict(m) for m in BASETEN_MODELS],
                "warning": "Documentation is not credit entitlement or successful inference. No network requests were made.",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
