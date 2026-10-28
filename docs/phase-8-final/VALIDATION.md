# Reproduction and evidence scope

Read `validation.json` for actual totals and `evidence/manifest.json` for file hashes/screenshots. Every final browser group uses production image `sha256:99ddd0e957b4e88f3f232cdf5512c36918677590ebb56cb5d55a80108435d7cc`; runtime/backend/frontend-bundle identity is recorded in `evidence/checks/runtime-hashes.json`. Historical phase artifacts are unchanged. Exploratory quota/restart failure output is separate and excluded from completed acceptance totals.

## Frozen checks

From the repository root, use Python 3.12+, uv 0.12.23 and Node 24:

```sh
uv sync --project backend --frozen
npm ci --prefix frontend
cd backend
uv run --frozen pytest -q
uv run --frozen python -m forge.evaluate --output /tmp/forge-v1.json
uv run --frozen python -m forge.phase2.evaluate --output /tmp/forge-v2.json
uv run --frozen python -m forge.phase3.evaluate --output /tmp/forge-v3.json
uv run --frozen python -m forge.industrial.evaluate --output /tmp/forge-coupled.json
uv run --frozen python -m forge.industrial.meta_evaluate --output /tmp/forge-fixtures.json
uv run --frozen python -m forge.submission.smoke
uv run --frozen python -m forge.submission.model_evaluation
uv run --frozen python -m forge.submission.models
cd ../frontend
npm run check:tests
npm test
npm run build
npm audit --json
```

Ruff uses the CI profile: `ruff==0.17.3`, `--isolated --select F,I,BLE001,RUF007 backend/forge`. Python audit uses frozen exported requirements and `pip-audit==2.9.0`; both current dependency scans report zero known vulnerabilities, with scope/tool versions retained. Managed environments may need writable tool/cache directories and system CA trust; do not disable TLS verification or print secrets.

## Production and browser groups

Build `docker build -t forge:phase8 .`; in the managed proxy environment supply the optional BuildKit `proxy_ca` secret using the system trust bundle, without copying it into image layers. Run only disposable **local** public containers, for example:

```sh
docker run -d --pull=never --name forge-phase7-8088 \
  --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m --memory=512m --cpus=1 \
  --cap-drop=ALL --security-opt=no-new-privileges -p 127.0.0.1:8088:7860 \
  -e FORGE_DEMO_DB_PATH=/tmp/forge-data/investigations.sqlite3 \
  -e FORGE_DEMO_STORAGE_EPHEMERAL=true -e OPENBLAS_NUM_THREADS=1 \
  -e OMP_NUM_THREADS=1 -e MKL_NUM_THREADS=1 forge:phase8
```

Wait for loopback `/api/v3/ready`. No provider/owner credentials, paid resources, production table mutation or public-host keep-alive traffic. The `forge-phase7-PORT` test name is retained solely for compatibility with the existing recovery runner; the actual image is the Phase 8 hash above. Before removing/replacing a container, verify that it is one you created and has that image. Preserve evidence/logs; do not prune unrelated containers or data.

Browser tooling used: system Chromium, Playwright **1.64.1**, `@axe-core/playwright` **4.14.0**, installed outside production dependencies. Set `NODE_PATH` to that tooling. Each acceptance viewport uses a fresh owned container to avoid unrelated quota state:

- `FORGE_PHASE8_WIDTH=1440 node scripts/phase8-acceptance-browser.cjs` on 8088: support after two, no-mutation resume, incomplete/complete recovery, actual persistent Chromium restart, export and failure preservation. Repeat separately with widths 1366/768/390 for exhausted, normal and inconclusive states, tablet missing data and mobile no-WebGL behavior.
- `FORGE_INDUSTRIAL_SCENARIO=CASE node scripts/industrial-browser-check.cjs`: all seven cases, original ports 8050–8056. The optional filter skips no assertion; omit it to run all seven against seven fresh containers.
- `FORGE_LIBRARY_CASE=CASE node scripts/product-completion-browser.cjs`: all seven retained library cases, original ports8040/8041/8042/8043/8045/8046/8047. Includes all stages, actual reports, session refresh and fresh-case isolation. Omit the optional filter to run the original complete matrix.
- `FORGE_FINAL_JOURNEY=library node scripts/final-experience-browser.cjs` on 8072: incomplete library checkpoint, deletion of **only that owned local container's sessions**, 404, fresh-ID reconstruction and continuation. Never run its deletion against production data.
- `node scripts/meta-integration-browser.cjs` on 8059: explicit offline `--fixture` CLI, structured proposals, unchanged independent verification, bounded repeated clicks, tamper handling, mobile fallback and interrupted preparation. The private fixture receipt remains outside public evidence.
- `node scripts/checkpoint-portable-browser.cjs` on 8074: actual native checkpoint download, explicit reset and validated import/reproduction without an additional experiment.
- `node scripts/industrial-lifecycle-check.cjs` on 8057/8058: narrow-width Axe, pointer/keyboard, reduced motion, hidden-document pause, context loss, bounded telemetry progress, repair/shutdown and offline recovery. `node scripts/unified-layout-check.cjs` adds 1920/1024/768/320 layouts. `FORGE_DEMO_URL=http://127.0.0.1:8057 node scripts/meta-selection-performance.cjs` records 30 actual selection samples.
- `python scripts/check-container.py OWNED_CONTAINER --image forge:phase8 --local-socket` verifies non-root/public security and dummy-credential startup refusal. The managed local-socket option is unnecessary for an ordinary local Docker setup.

Redirect each runner's documented evidence environment variable (`FORGE_INDUSTRIAL_EVIDENCE`, `FORGE_PRODUCT_EVIDENCE`, `FORGE_FINAL_EVIDENCE`, `FORGE_META_EVIDENCE`, `FORGE_PORTABLE_EVIDENCE`, `FORGE_LAYOUT_EVIDENCE`, `FORGE_SELECTION_EVIDENCE`, `FORGE_PHASE8_EVIDENCE`) to a new directory to preserve committed artifacts. `FORGE_PHASE8_URL` accepts literal loopback only. The real public write quota is unchanged; the acceptance runner waits between rapid reproduction/restart phases instead of retrying uncertain actions or raising limits.

## Replay and performance

Machine/model JSON: `uv run --frozen python -m forge.industrial.replay report.json --html NEW.html` from backend. Legacy JSON: `uv run --frozen python -m forge.phase3.replay report.json`; its existing reporting renderer reproduces current legacy HTML. `evidence/checks/replays.json` records actual function/CLI checks and available current-template HTML byte comparisons. Historical HTML templates are not falsely asserted identical to new presentation.

Browser timing/heap/renderer observations, 30 selection samples, 100 actual-checkpoint serialization samples and a local container create-to-readiness sample are retained. Software SwiftShader, emulated viewports/touch, finite heap samples and automation overhead are explicit. They are not physical-device FPS, public Render cold-start performance, durability or industrial accuracy.

GitHub Actions runs backend, frontend and production-container jobs, including frozen numerical/fixture checks and preservation of original submission evidence. The final handoff supplies the **actual exact-commit** run URL/conclusion after push; this document does not fabricate a pending CI result.
