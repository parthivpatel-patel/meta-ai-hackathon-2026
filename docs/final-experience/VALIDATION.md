# Validation and reproduction

The engineering report and validation.json record actual counts and source scope. All browser/server-administration tests target disposable loopback containers, not Render. No automated test calls a genuine provider.

Run frozen backend pytest, forge.evaluate, forge.phase2.evaluate, forge.phase3.evaluate, forge.industrial.evaluate and forge.industrial.meta_evaluate. They retain 480 + 280 + 280 + 21 = 1,061 synthetic cases plus seven injected-transport comparisons. Preserve abstention, coverage, false negatives and inconclusive denominators; selective precision is not field accuracy or genuine Meta quality.

Run frontend check:tests, test, build and npm audit. The exact-pinned fake-indexeddb dependency is dev-only; production uses native IndexedDB. New tests cover all preset/stage reconstruction, tampering, numeric JSON/boolean handling, server-session loss, remaining budgets, storage denial, malformed IndexedDB, secret fields, explicit restore and stale hidden-workspace callbacks. Run pinned Ruff0.17.3 with the existing F,I,BLE001,RUF007 CI profile and Python dependency/credential scans.

Build the existing Dockerfile with managed proxy/CA trust. Test local containers with UID 10001, read-only root, 64 MiB tmpfs, 512 MiB memory, one CPU, cap-drop/no-new-privileges, ephemeral SQLite, public/mock/disabled inference/budget0 and single-thread numerical libraries. Wait for readiness. Stage groups because Docker VFS duplicates filesystems. Remove only own completed containers and disposable build artifacts; retain source/evidence/known-good images and unrelated containers.

Optional browser tooling uses NODE_PATH=/tmp/forge-browser/node_modules, actual Chromium and software SwiftShader or explicit WebGL failure. Actual screenshots are unedited. Hardware FPS, physical mobile and complete assistive-technology coverage are not claimed.

- final-experience-browser.cjs:8071–8073. Three full unified/recovery journeys, fixture provenance, deliberate deletion of only the local test container's SQLite sessions, fresh ID recovery, continued explicit tests, reports and malformed/private import rejection. Runner administration is not a public code-execution endpoint.
- checkpoint-portable-browser.cjs:8074, real native checkpoint download, explicit discard/reset and validated import, with zero newly executed experiments.
- industrial-browser-check.cjs:8050–8056, seven preserved coupled-machine scenarios.
- unified-browser-check.cjs:8060–8062, three preserved unified journeys; case-family switches now use Cases.
- meta-integration-browser.cjs:8059, explicitly offline private --fixture workflow; private operational receipts stay outside public evidence.
- product-completion-browser.cjs:8040/8041/8042/8043/8045/8046/8047, seven original cases.
- product-v4-browser-check.cjs:8044, retained all-width/keyboard/Axe checks. Copy only its completed /tmp/forge-v4-accessibility.json and exclude its five performance-only samples from Axe counts.
- industrial-lifecycle-check.cjs:8057–8058, context loss, hidden/reduced motion, short imports, repair/shutdown and offline recovery. Run separately from competing software-WebGL workloads.
- unified-layout-check.cjs:8057, additional 1920/1024/768/320 layouts; meta-selection-performance.cjs records thirty local component timings.

Respect normal quotas and scripted waits; never raise limits or run production keep-alives. Independently replay each downloaded JSON through forge.industrial.replay or forge.phase3.replay. Compare current-template HTML bytes with regeneration. Preserve historical submission fixtures without falsely asserting old templates match a newer renderer.

Only the existing zero-request smoke preflight ran. Financial/credential gates remain blocked. Never add --execute, retries or a genuine evaluation to automation.
