# Reproduce and interpret validation

The final handoff and [validation.json](validation.json) report actual counts, denominators, image IDs and scope. Evidence is under [evidence](evidence/). No genuine inference or production mutation is a validation prerequisite. All endpoint/browser testing described here targets local literal-loopback public containers, not the live service.

## Automated checks

From `backend`:

```sh
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen pytest -q
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.evaluate --output /tmp/v1.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.phase2.evaluate --output /tmp/v2.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.phase3.evaluate --output /tmp/v3.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.industrial.evaluate --output /tmp/coupled.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.industrial.meta_evaluate --output /tmp/fixture.json
uvx --from ruff==0.17.3 ruff check --isolated --select F,I,BLE001,RUF007 forge
```

The numerical suites cover 480 +280 +280 +21 =1,061 preserved synthetic cases. The additional7 injected-transport comparisons test integration/independent replay, not genuine model accuracy. Preserve false negatives, coverage and inconclusive denominators in evaluation summaries; do not present accepted-result precision alone as general accuracy.

From `frontend`: `npm run check:tests`, `npm test`, `npm run build`, `npm audit --json` and `npm audit --omit=dev --json`. Python dependency auditing uses the frozen environment's site-packages with `pip-audit`, a disposable cache and normal TLS verification. Tool install/cache output is not a vulnerability finding. The source scan is bounded and excludes binary screenshots/private receipts; it does not prove that no secret could exist anywhere.

Private smoke/workstation CLI checks must remain dry: `python -m forge.submission.smoke`, `python -m forge.industrial.meta_cli`. **Do not add `--execute`.** The browser model fixture uses only the explicitly injected offline `--fixture` path, retains its private0600 receipt under `/tmp` and exports only the sanitized public proposal report.

## Production/browser matrix

Build the exact checkout using the existing Dockerfile. In the managed environment use its documented Unix socket/proxy/CA secret, e.g. `--secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt`; no proxy credentials or CA are copied into layers. Run local containers with read-only root, `/tmp` tmpfs64MiB, UID10001 from the image, one CPU, memory512MiB, cap-drop and no-new-privileges, loopback port mapping, mock/disabled inference/zero public budget, ephemeral SQLite and single-thread numerical libraries. The Render-hostname compatibility profile can use `RENDER=true`, `RENDER_EXTERNAL_HOSTNAME=forge-judge.onrender.com` while still probing only loopback.

Wait for `/api/v3/ready` before launching browsers. Stage container groups: Docker VFS copies filesystems and simultaneous replicas can exhaust workspace disk. Remove only your own completed test containers after preserving evidence, and disposable unused build cache if needed; retain source, reports, known-good images and unrelated containers.

Optional browser tooling is Playwright + Axe, supplied through `NODE_PATH=/tmp/forge-browser/node_modules`; actual `/usr/bin/chromium` uses local software SwiftShader for 3D. These are not application runtime dependencies.

- `scripts/unified-browser-check.cjs`: fresh public containers8060–8062. Actual1440×900,1366×768,390×844 captures; operator actions, selection/camera, no idle render while paused, capture/next-test consent, mode/library state retention, machine response, report download/import, malformed input, missing RPM and accessible2D. Set `FORGE_UNIFIED_EVIDENCE` to an output path.
- `scripts/industrial-browser-check.cjs`: fresh8050–8056; all7 established coupled-machine scenarios, supported/inconclusive results, exports, report/telemetry replay and tamper handling. `FORGE_INDUSTRIAL_EVIDENCE` controls output.
- `scripts/industrial-lifecycle-check.cjs`: fresh8057–8058; narrow touch widths320/375/430, keyboard camera, pointer drag/wheel without selection, reduced motion, hidden-page pause, five retained-workspace switches, context-loss/2D recovery, short/missing imports, repair, shutdown and offline recovery. These are now workspace switches, not five unmounts.
- `scripts/meta-integration-browser.cjs`: fresh8059; desktop/mobile recorded fixture proposals, independent tests, JSON/HTML, bad import preservation, zero-call preparation and interrupted refresh. `FORGE_META_EVIDENCE` controls output. It uses no external provider transport.
- `scripts/product-completion-browser.cjs`: fresh8040/8041/8042/8043/8045/8046/8047; all7 retained original library cases and thermal/waveform/equipment/evidence/test/results/report workflows. `FORGE_PRODUCT_EVIDENCE` controls output.
- `scripts/product-v4-browser-check.cjs`: fresh8044, `FORGE_DEMO_URL=http://127.0.0.1:8044`, `FORGE_EVIDENCE_DIR=...`; all-width library views/keyboard/Axe. Copy its actual `/tmp/forge-v4-accessibility.json` result into the evidence package; exclude its5 performance-only samples from Axe totals.
- `scripts/unified-layout-check.cjs`: final local8057, four additional1920/1024/768/320-width views with keyboard component focus, Axe and overflow checks; no inference. Run after prior browser jobs finish, within the normal quota window.
- `scripts/meta-selection-performance.cjs`: an isolated fresh local image origin;30 selected-component-to-inspector observations. Do not run against production or treat automation latency as physical-device input latency.

Respect the existing public quotas and scripted61-second quota-window waits; never increase budgets to make a test pass. Test containers/browsers make actual requests, not mocked diagnostic responses. Small readiness races or tests looking for a now-collapsed disclosure were fixed in the harness without weakening result/source/security assertions. Failed exploratory runs are not counted as passing evidence.

For every exported machine/model JSON run the existing `forge.industrial.replay`; for retained library/submission records use `forge.phase3.replay`. Replay must make no model call. Regenerate HTML and compare bytes where the browser downloaded an HTML artifact. Preserve the original submission fixtures unchanged.

## Performance and review limits

Measure actual warm local readiness, component selection, experiment UI latency, sampled telemetry updates, software-renderer calls/triangles and bounded paused/hidden rendering. RAF camera-step cadence is not hardware presentation FPS. Heap snapshots before/after retained-workspace and context-loss cycles are observations, not a proof of no leaks. Concurrent software-browser workloads can distort timings. No public cold-start, uptime, free-account entitlement or physical-mobile performance guarantee follows.

Review genuine unedited screenshots at the required dimensions and the full-page captures; do not substitute concept art. The detailed assembly must be visible and prominent, source labels readable, actions discoverable and narrow views bounded. A separate same-agent adversarial pass is documented in [REVIEW.md](REVIEW.md).
