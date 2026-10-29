"""Reviewed immutable public evidence. No provider, uploads, sessions or inference."""

import hashlib
import json
import os
import stat
from functools import lru_cache
from pathlib import Path

from .phase3.reporting import render, replay

ARTIFACT = (
    Path(__file__).with_name("recorded_data") / "meta-pressure-investigation.json"
)
ARTIFACT_SHA256 = "8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f"
RUN_ID = "RUN3-a2664d56db115b51b24fdaa6333eaf959a2776ab5547c52c30732eca18d754fd"
MODEL_ID = "meta-models/muse-spark-open-1026"
LABELS = [
    "Genuine Meta model output",
    "Previously recorded",
    "Synthetic investigation",
    "Independently verified",
]


@lru_cache(maxsize=1)
def reviewed_bytes() -> bytes:
    # A user-supplied source label/hash can never promote an upload to this case.
    fd = os.open(ARTIFACT, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as file:
        info = os.fstat(file.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > 262144:
            raise ValueError("Reviewed evidence unavailable")
        raw = file.read(262145)
    if hashlib.sha256(raw).hexdigest() != ARTIFACT_SHA256:
        raise ValueError("Reviewed evidence integrity mismatch")
    report = json.loads(raw)
    s = report["investigation"]
    i = s["inference"]
    if (
        report["run_id"] != RUN_ID
        or s["model_source"] != "meta_http_response"
        or not s["metadata"]["declared_synthetic"]
        or i["source"] != "meta_http_response"
        or i["provider"] != "baseten"
        or i["requested_model"] != MODEL_ID
        or i["returned_model"] != MODEL_ID
        or replay(report).status != "SUPPORTED_SYNTHETIC"
    ):
        raise ValueError("Reviewed evidence provenance mismatch")
    return raw


def available() -> bool:
    try:
        reviewed_bytes()
        return True
    except (OSError, ValueError, KeyError, TypeError):
        return False


def snapshot() -> dict:
    # Return fresh objects so callers cannot mutate the cached immutable artifact.
    report = json.loads(reviewed_bytes())
    return {
        "provenance": {
            "review_id": "forge-meta-pressure-20261028",
            "labels": list(LABELS),
            "source": "meta_http_response",
            "mode": "previously_recorded",
            "synthetic": True,
            "independently_verified": True,
            "public_live_inference_enabled": False,
            "model_id": MODEL_ID,
            "recorded_utc": "2026-10-28T23:07:11.078810+00:00",
            "tested_commit": "c3075a376d288c0098fbe75189778ab8b10bd5e9",
            "artifact_sha256": ARTIFACT_SHA256,
            "input_hash": report["investigation"]["inference"]["input_hash"],
            "output_hash": report["investigation"]["inference"]["output_hash"],
            "basis": "Reviewed private HTTP 200 receipt and exact returned model; independent replay checks numerical consistency, not cryptographic provider authentication.",
            "scope": "This recorded pressure/sensor investigation has its own synthetic measurements. It is not the currently selected coupled 3D pump recording.",
            "attribution": "Built with Muse Spark Open",
        },
        "report": report,
    }


def replay_recorded() -> dict:
    report = snapshot()["report"]
    decision = replay(report)
    return {
        "verified": True,
        "status": decision.status,
        "findings": decision.findings,
        "report_run_id": report["run_id"],
        "artifact_sha256": ARTIFACT_SHA256,
        "network_requests_sent": 0,
        "new_experiments_executed": 0,
        "scope": "Recomputed numerical verification from recorded observations and tests; no new inference or physical experiment.",
    }


def report_html() -> str:
    document = render(snapshot()["report"])
    banner = (
        "<p><strong>" + " · ".join(LABELS) + "</strong></p>"
        "<p>Built with Muse Spark Open. Previously recorded on October 28, 2026. "
        "Public live inference is disabled. This case has its own synthetic "
        "measurements and is not the current 3D pump recording.</p>"
    )
    return document.replace("<body>", "<body>" + banner, 1)
