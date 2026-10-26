"""Evidence-backed model catalog. Owner-reported aliases are never allowlisted."""

import json
from dataclasses import asdict, dataclass
from typing import Literal


@dataclass(frozen=True)
class ModelCandidate:
    model_id: str
    status: Literal["documented_public", "owner_reported_disabled"]
    source: str
    endpoint: str = "https://inference.baseten.co/v1/chat/completions"
    family_eligibility: str = "Public event permits Meta open weights; authenticated event-specific terms still require owner confirmation"
    account_access_verified: bool = False


BASETEN_MODELS = (
    ModelCandidate(
        "meta-models/muse-spark-open",
        "documented_public",
        "https://www.baseten.co/library/muse-spark-open/",
    ),
    ModelCandidate(
        "meta-models/muse-spark-open-1026",
        "owner_reported_disabled",
        "https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details",
    ),
)
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
