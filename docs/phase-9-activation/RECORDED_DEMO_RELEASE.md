# Reviewed recorded Meta case — release handoff

This completes the interrupted integration on `feature/forge-phase-9-meta-activation`, based on evidence `2cf71c6a87fdbbdda7ae40440648e4a2e5c87803` and tested adapter `c3075a376d288c0098fbe75189778ab8b10bd5e9`. All interrupted implementation changes were preserved and completed; no reset, main-branch change, redesign or new inference authorization was introduced. The handoff supplies the exact final pushed SHA.

## What is integrated

Open **Recorded Meta** in the existing workstation navigation or `/demo?view=recorded-meta`. This read-only pressure/sensor case displays its own 120 synthetic measurements, three genuine Meta hypotheses, two recorded numerical tests, independent findings, replay and JSON/HTML exports. It clearly says **Genuine Meta model output**, **Previously recorded**, **Synthetic investigation**, and **Independently verified**. It is not the selected coupled 3D pump capture. Thermal/waveform summaries are context; no genuine model vision/audio is claimed.

The original machine/library views remain available. Switching to the recorded case suspends the hidden machine, preserves its selected component/capture/counterfactual/test history, and offers **Return to existing workspace**. Opening the recorded deep link does not initialize a different machine case. Existing captures, explicit experiment authorization and diagnostic algorithms are unchanged. Recorded replay recomputes numerical consistency from observations/tests; it never reruns the model or adds an experiment.

The fixed report is packaged in the Docker image rather than temporary SQLite. Four fixed GET routes serve metadata, JSON, escaped HTML and replay under `/api/v3/recorded-meta`. They accept no uploaded replacement or mutation. Backend and browser pin the exact report SHA-256:

```text
8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f
```

The packaged JSON equals the private validated report export semantically; only JSON formatting changed. The original receipt and first ledger remain unchanged and private. The source is the separately authorized HTTP200 response recorded at **7:07:11 PM Eastern, October 28, 2026** (`2026-10-28T23:07:11.078810+00:00`), returned model `meta-models/muse-spark-open-1026`, finish `stop`. [Original sanitized evidence](evidence/second-genuine-smoke.json) remains authoritative. Hash consistency is not signed provider authentication. Numerical support is scoped to the synthetic mechanism.

**Additional genuine requests: 0. Cumulative genuine requests: 2. Remaining authorized requests: 0.** No retry, fallback or public activation occurred. Public mode still requires `FORGE_PROVIDER=mock`, inference disabled/budget0 and no provider/owner credentials. Only the fixed reviewed view gets genuine source status; arbitrary imports/rules/test fixtures do not. Attribution is **Built with Muse Spark Open** and the existing license text is included in public assets.

## Validation and evidence

[Machine-readable validation](evidence/recorded-demo/validation.json), backend/frontend/type/build logs, production-container audit, screenshots and desktop/mobile browser results are stored beside it. The production Docker image tested locally is `sha256:4007d70186993cd400daeecb5018eab10c679f777e7f2076c1ef2ca2b2db73ab`. Render builds its own image from the reviewed commit; do not assume image identity there.

- Full backend: **370 passed**, including 15 new artifact/provenance/replay/security cases. Full frontend: **90 passed**. TypeScript, Ruff, Vite and Docker production builds passed.
- Real Chromium at 1440px and 390px: reviewed labels/telemetry, keyboard replay, exports, reload, no mutation on recorded navigation, existing one-test counterfactual resume/history preservation, replay failure, and tampered report rejection. The 390px run forces the existing accessible 2D fallback; desktop uses software WebGL. Five checked views per viewport had zero axe WCAG2/2.1/2.2 A/AA violations and no horizontal overflow. This is not complete accessibility certification or physical-device/GPU testing.
- The existing production acceptance runner additionally checks the default bearing case, bounded tests, exports, counterfactual resume, browser checkpoint refresh/process restart and graceful recovery failures. See its saved result for actual completion/status.
- Restricted production container: non-root UID10001, read-only root, bounded memory/CPU, security headers, blocked developer routes, four read-only recorded APIs, exact export hash, successful numerical replay and refusal to start with a credential. No credential value is printed or passed to the image. No critical/high defect was found within this reviewed scope; this is not a penetration test.
- Interrupted frontend failures were fixture-loading issues (Vite denied an outside-root fixture; a rewritten Vite URL was not an OS path). The test now reads the exact packaged artifact offline through Node, without weakening the dev server. A browser harness assertion initially used the wrong report field; corrected to the existing `source`/`provider` contract. A regression browser started before its new test container was ready; rerun after readiness. These were corrected, not counted as passing runs.

Reproduce from the root using the existing Python/npm setup:

```sh
cd backend
uv run --frozen pytest -q
cd ../frontend
npm run check:tests
npm test
npm run build
```

Build the existing Dockerfile, start it without credentials using the restricted invocation in `.github/workflows/ci.yml`, then `python scripts/check-container.py CONTAINER --image IMAGE`. Managed environments must use the documented local Docker socket/proxy CA. The focused browser command is `NODE_PATH=/path/to/installed/browser-tools/node_modules FORGE_RECORDED_WIDTH=1440 node scripts/recorded-meta-browser.cjs` (repeat with 390); it permits only literal-loopback HTTP and blocks external traffic. Save artifacts using `FORGE_RECORDED_EVIDENCE`. Tool versions used: Playwright/axe from the existing browser workspace and Chromium `/usr/bin/chromium`; no product dependency was added.

For a downloaded recorded report, from `backend` run `uv run --frozen python -m forge.phase3.replay /path/to/forge-recorded-meta-investigation.json`. Use the separate `forge.industrial.replay` for coupled-machine exports. Both are numerical replay, not inference.

## Deployment status and exact owner steps

**Prepared locally, not deployed from this runtime.** No Render credential, deploy hook, CLI session or authenticated deployment connector is configured. No new credential is requested. Read-only external probes found the existing `/demo?view=recorded-meta` HTML route returns200 but both new recorded APIs return403; that does **not** prove the new view is published. Readiness/capability probes timed out during that observation. [Actual probes](evidence/recorded-demo/public-status.json) preserve the distinction.

The owner authorized deploying this recorded-only candidate if checks pass. The existing Free Docker architecture and `render.yaml` are unchanged. Do not enable public inference, add secrets/resources, merge branches or change the configured Git branch.

1. Open **Render Dashboard → existing `forge-judge` → Events**. Record the actual current **Live deploy ID, full Git SHA and timestamp** externally. Confirm its artifact is retained and whether **Rollback** is supported. A previously reported SHA is not verification of the current deploy. Export any needed SQLite-backed reports/browser checkpoints before proceeding.
2. Inspect the existing settings/environment without changing them: Free Docker service; correct repository; auto-deploy off; health `/api/v3/ready`; existing ephemeral SQLite path under `/tmp`; `FORGE_DEMO_MODE=public`, `FORGE_PROVIDER=mock`, `FORGE_INFERENCE_ENABLED=false`, `FORGE_INFERENCE_REQUEST_BUDGET=0`. No Baseten/provider/owner keys or credential-bearing environment groups. If these differ, stop rather than introducing unreviewed settings/paid resources.
3. Select **Manual Deploy → Deploy a specific commit**. Paste the **full final SHA from the handoff**, not the old evidence/repair SHA or latest configured branch head. Confirm the commit belongs to this repository, then deploy it through the existing service. This control is intended to deploy a particular commit without switching the configured branch. If unavailable or rejected, stop; do not substitute another commit or modify the branch/settings. [Render manual deploy documentation](https://render.com/docs/deploys#manual-deploys).
4. Wait for the deploy event to become **Live** and verify its **full SHA**. Visit `https://forge-judge.onrender.com/api/v3/ready`: `status=ready`, `recorded_meta_evidence=true`, `inference_required=false`. At `/api/v3/capabilities`, require `mode=public`, `reviewed_recorded_meta_available=true`, `recorded_meta_is_live=false`, `real_inference_permitted=false`, `real_inference_verified=false` (that last field refers to the disabled runtime, not recorded provenance), and uploads disabled.
5. Download `https://forge-judge.onrender.com/api/v3/recorded-meta/report.json`, verify the SHA above, and GET `/api/v3/recorded-meta/replay`: verified, `SUPPORTED_SYNTHETIC`, findings process-pressure/sensor-pressure, `network_requests_sent=0`, `new_experiments_executed=0`. Visit **`https://forge-judge.onrender.com/demo?view=recorded-meta`** anonymously on desktop/phone. Verify all four labels, three proposals, two recorded tests, telemetry, replay and exports. Reload and confirm the same case. No sign-in/key is needed.
6. Verify `/demo`: interact with the pump, select bearing, focus319, capture, run an explicit test, inspect the counterfactual, open Recorded Meta, return and **Resume existing investigation** without new capture/test/history changes. Finish the legitimate two-test case if needed, export/replay and check browser recovery/fallback. Fixed library cases and mock/rules labels must remain clear. Run the existing read-only deployment audit from `backend`: `uv run --frozen python -m forge.submission.audit --url https://forge-judge.onrender.com`. Developer/private APIs must still return403. Respect public quotas; do not use keep-alive traffic.
7. Save actual Live SHA, URL, hash/replay result, screenshots and final recording outside Render. Complete the [recording/submission checklist](RECORDED_DEMO_SCRIPT.md). A free service may sleep on idle and its SQLite is ephemeral; no guaranteed uptime through November18 is claimed. The packaged case survives process/session loss, but not removal of the deployed artifact/service.

## Rollback

If acceptance fails, select the **actual previous Live deploy recorded in step1**, confirm its full SHA/deploy ID and retained artifact, then use its supported **Rollback** control. Verify the resulting Live SHA, HTTPS readiness, prior machine/library workflows and disabled-inference/key-free configuration. If Rollback is unavailable or the artifact is missing, stop; rebuilding an old SHA is a separate recovery decision, not a verified artifact rollback. Do not rewrite history or change the service branch. Code rollback does not restore lost SQLite data or every environment setting.

**Recommendation:** GO for the reviewed recorded-demo release through the existing exact-commit workflow after dashboard prerequisites are verified. Public availability remains unverified until the checks above pass. Live public inference remains NO-GO. The [open development-window eligibility question](../ELIGIBILITY_TIMING_REVIEW.md) still needs authoritative organizer guidance; no approval is invented.
