"""Build reproducible public rules-based evidence, without any inference/network."""

import asyncio
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from forge.phase2.evidence import demo_assets
from forge.phase3.reporting import export, render, replay
from forge.phase3.service import PRESETS, run

output = ROOT / "docs" / "submission"
output.mkdir(parents=True, exist_ok=True)
files = []
for name in ("misleading_sensor", "insufficient"):
    session = asyncio.run(run(PRESETS[name][1], demo_assets()))
    report = export(session)
    replay(report)
    assert session.model_source in ("not_run", "deterministic_rules_not_meta")
    for suffix, body in [
        ("json", json.dumps(report, indent=2, sort_keys=True) + "\n"),
        ("html", render(report)),
    ]:
        path = output / (name + "." + suffix)
        path.write_text(body)
        files.append(
            {
                "path": path.name,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "bytes": path.stat().st_size,
                "source": session.model_source,
                "decision": session.decision.status,
            }
        )
manifest = {
    "schema": "forge-submission-evidence-1",
    "public_application_url": "https://forge-judge.onrender.com/demo",
    "public_application_url_source": "participant_reported_live_not_independently_verified_here",
    "external_https_verified": False,
    "availability_target_through": "2026-11-18",
    "availability_guarantee": False,
    "genuine_meta_inference": "not_run_missing_protected_key",
    "recorded_video_url": None,
    "limitations": [
        "Rules-based synthetic software evidence only",
        "No live Meta inference or public deployment is established by these files",
        "Hashes demonstrate consistency, not signed source authenticity",
    ],
    "files": files,
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(
    "Built and independently replayed public synthetic evidence; no model or hosting requests sent."
)
