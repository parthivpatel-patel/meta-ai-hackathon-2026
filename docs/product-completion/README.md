# FORGE product completion evidence

Candidate branch: `feature/forge-product-completion`, based on exact8f984c2. Resolve the final review SHA from the final report and Git ref; no moving-head approval or live deployment is implied.

- [Beginner guide and three-minute judge walkthrough](USER_GUIDE.md)
- [Engineering review, scenario ground truth, architecture, limitations and release gates](ENGINEERING_REVIEW.md)
- [Measured validation and performance](validation.json)
- [Seven complete browser workflows](browser-results.json)
- [All-width browser/accessibility observations](all-width-browser.json)
- [Local container boundaries](container-audit.json)
- [Python dependency audit](python-audit.json) and [npm audit](npm-audit.json)
- [Screenshot manifest](screenshot-manifest.json):54 unedited captures

## Example reports

Every report below was downloaded during the actual browser workflow, then its JSON replayed offline. HTMLs are generated from the same verified numerical evidence; no browser result is hardcoded into the product.

| Case | JSON | Readable HTML | Outcome |
| --- | --- | --- | --- |
| Pressure | [Record](misleading_sensor.json) | [Report](misleading_sensor.html) | Process and sensor change supported |
| Temperature | [Record](temperature_response.json) | [Report](temperature_response.html) | Process temperature change supported |
| Vibration | [Record](vibration_response.json) | [Report](vibration_response.html) | Process vibration change supported |
| Noisy signals | [Record](noisy_multifault.json) | [Report](noisy_multifault.html) | Vibration supported, overall inconclusive |
| Baseline | [Record](normal.json) | [Report](normal.html) | Consistent baseline |
| Missing data | [Record](insufficient.json) | [Report](insufficient.html) | Abstention |
| Confounding | [Record](confounded.json) | [Report](confounded.html) | Inconclusive |

## Visual review

The [temperature evidence view](screenshots/temperature_response-evidence.png), [mobile equipment view](screenshots/vibration_response-equipment.png), [pressure results](screenshots/misleading_sensor-Results.png) and [readable report](screenshots/readable-report.png) were inspected. The interface retains Geist typography, the six-stage flow and readable controls. Equipment provenance and selected-signal causes are now collapsed by default; uncertainty remains visible. No complete redesign or heavy graphics dependency was added. Four narrow equipment captures are named `equipment-320.png`, `equipment-375.png`, `equipment-390.png` and `equipment-430.png`. Other screenshots cover all seven case journeys. These are local candidate captures, not proof of the live site's commit.

## Reproduce

Use the existing frozen setup, `cd backend && uv run --frozen pytest -q`, frontend `npm run check:tests && npm test && npm run build`, and the existing Docker/container check procedure. The added scenario runner is `scripts/product-completion-browser.cjs`, using optional externally installed Playwright and Axe tooling via `NODE_PATH`; these are not application dependencies. It expects seven **local** restricted public containers on8040,8041,8042,8043,8045,8046,8047, one per case, with fresh temporary SQLite. Run the standard `scripts/product-v4-browser-check.cjs` against a separate fresh local container8044 with `FORGE_DEMO_URL=http://127.0.0.1:8044` and `FORGE_EVIDENCE_DIR=/tmp/forge-product-all-widths`. The original runner writes its observations under `/tmp`; the reviewed copy is `all-width-browser.json`. Preserve normal write limits and the built-in quota-window waits; do not run a replay loop against production or use keep-alive tricks.

For each exported record, from `backend`: `uv run --frozen python -m forge.phase3.replay ../docs/product-completion/<case>.json`. The evaluation CLIs remain `forge.evaluate`, `forge.phase2.evaluate`, `forge.phase3.evaluate`; they require no provider. Raw metrics and denominators in `validation.json` retain false negatives and inconclusive cases.

No production mutation or genuine inference occurred. This is a reviewed **demonstration candidate**, not industrial certification, enterprise multi-tenancy or guaranteed free-host availability. Anonymous synthetic sessions are accessible by possession of their random identifier; there is no per-user account authorization. Do not use this public mode for sensitive industrial data. Current model access, eligibility, final video and actual submission remain owner-dependent gates.
