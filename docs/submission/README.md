# FORGE judge evidence — current checkpoint

These are **actual independently replayed synthetic rules-based reports**, not Meta inference or proof of a live public application. Hosting and genuine-model activation are still pending. The manifest deliberately has no application/video URL until external verification.

- [Misleading sensor JSON](misleading_sensor.json) and [readable HTML download](misleading_sensor.html): pressure process departure plus sensor bias, two bounded experiments, `SUPPORTED_SYNTHETIC`.
- [Insufficient evidence JSON](insufficient.json) and [HTML download](insufficient.html): missing data causes `ABSTAIN`, zero experiments and no inference.
- [Manifest and SHA256 values](manifest.json). These hashes establish file consistency, not signed authenticity or industrial validation.

Download reports; from `backend` run `uv run --frozen python -m forge.phase3.replay PATH-TO-REPORT.json`. HTML may be displayed as source by the repository host; download and open locally. Keep the evidence available through November18,2026; it does not depend on the service filesystem.

See [hosting steps](../HOSTING_AND_ACCESS.md), [judge checklist](../../JUDGE_ACCESSIBILITY.md) and [recording fallback](../../RECORDED_DEMO_FALLBACK.md). Submission remains blocked until a real public app URL and genuine eligible Meta contribution are verified.
