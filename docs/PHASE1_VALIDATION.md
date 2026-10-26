# Phase 1 validation and reproduction

Baseline: `e7f90e93570c06c685d526b4766b03cfa4f17629`. Feature branch: `feature/forge-phase-1`. Work is isolated to this project. No merge into main is performed.

## Commands

Use the existing checkout; do not create a worktree in an already-isolated cloud task. Requirements and startup commands are in the root README. No new runtime dependency or inference credential is needed.

```bash
cd /workspace/meta-ai-hackathon-2026
UV_CACHE_DIR=/tmp/forge-uv-cache uv sync --project backend --frozen
npm ci --prefix frontend --cache /tmp/forge-npm-cache
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --project backend --frozen pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
cd backend
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.evaluate --output /tmp/forge-evaluation.json
```

The committed `backend/evaluation/results.json` is the actual 480-case result, including answer-key fields held only by the evaluator. The evaluator output must not be used as investigation input. Regenerating the report gives the same parsed JSON; no timestamps or random session IDs are included.

With both services running, execute the real-process API smoke test and replay its downloaded report:

```bash
cd /workspace/meta-ai-hackathon-2026
python scripts/api-smoke.py
cd backend
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.replay /tmp/forge-phase1-report.json
```

Replay recomputes observational summaries, candidate predictions, automatic selection, experimental intervals, dataset/result digests, and the verification decision. It rejects altered metadata or derived conclusions. This establishes internal reproducibility, not authenticity of sensor readings. It does not regenerate a private simulator recipe from a hash: the portable report includes complete measured evidence, and the separately published evaluation matrix regenerates synthetic cases from seeds.

## Browser evidence

The checked-in browser runner uses optional tooling outside the application dependency graph:

```bash
npm install --prefix /tmp/forge-browser --cache /tmp/forge-npm-cache playwright@1.56.1
NODE_PATH=/tmp/forge-browser/node_modules CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node scripts/browser-check.cjs
```

Run from the repository root with Chromium installed and both services running. On a machine without system Chromium, install Playwright's Chromium and set `CHROMIUM_EXECUTABLE_PATH` to its executable. The runner checks 1440×1100 and 390×844 viewports, three Phase 0 telemetry charts, all four Phase 1 investigations, report downloads, horizontal overflow, and browser JavaScript errors. It records [desktop](evidence/phase1-desktop.png) and [mobile](evidence/phase1-mobile.png) screenshots of a completed live-backend investigation.

## Executed results

- Backend: **51 passed, 0 failed, 0 skipped**, including all 26 Phase 0 tests. One existing FastAPI TestClient/httpx deprecation warning remains.
- Frontend: **6 passed, 0 failed, 0 skipped**, including all 3 Phase 0 tests.
- TypeScript compilation and Vite production build: passed.
- Real-process API workflow, JSON/HTML export, and offline report replay: passed.
- Desktop and mobile Chromium checks: passed across four scenarios each.
- Hypothesis generator and verifier independence: static import-boundary tests and malicious/empty candidate-generator tests pass. Scenario labels and seeds are absent from `BlindInput`.
- Adversarial tests reject unsupported physical-scope proposals, incorrect conclusions, evidence binding changes, duplicate channels, and insufficient/misaligned replicates. HTML exports escape injected markup.
- CI configuration runs pytest, full blind evaluation, frontend tests, and production build. Remote GitHub Actions status lookup was attempted but denied by current network policy; no remote CI success is claimed.

These are development checks against synthetic systems, not industrial validation, a penetration test, or proof of physical-world causality.
