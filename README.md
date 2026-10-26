# FORGE

A verifiable multimodal AI investigation platform, starting with industrial equipment failure investigation. **Phase 0 is a synthetic-data foundation, not a verified diagnostic system.** No Meta inference is performed. Hypotheses are explicitly mocked and unverified.

## Quick start

Requirements: Python 3.12+, uv 0.12.23, Node.js 24 and npm. No GPU, database, API key, account, or paid API is needed. Use this existing checkout; cloud tasks are already isolated and do not need a new worktree.

```bash
cd /workspace/meta-ai-hackathon-2026
UV_CACHE_DIR=/tmp/forge-uv-cache uv sync --project backend --frozen
npm ci --prefix frontend --cache /tmp/forge-npm-cache
```

Start backend in one terminal:

```bash
cd /workspace/meta-ai-hackathon-2026/backend
.venv/bin/uvicorn forge.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Start dashboard in another terminal:

```bash
cd /workspace/meta-ai-hackathon-2026/frontend
npm run dev -- --host 127.0.0.1
```

Vite listens on port 5173 and proxies `/api` to backend port 8000. For another checkout location, substitute its path. Use local HTTP requests for cloud validation; onboarding does not provide public localhost previews. Both processes must restart in future tasks. The frontend production bundle requires a same-origin `/api` reverse proxy; deployment is outside Phase 0.

```bash
curl --fail http://127.0.0.1:8000/api/v1/health
curl --fail 'http://127.0.0.1:5173/api/v1/investigations/demo?scenario=cooling_loss'
cd /workspace/meta-ai-hackathon-2026/backend
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen pytest -q
cd ../frontend
npm test
npm run build
```

## Implemented

- FastAPI `/api/v1` health, model-status, investigation demo, analysis, and mock hypotheses endpoints; OpenAPI at `/docs`.
- Deterministic 120-sample telemetry with temperature (°C), vibration (mm/s RMS), pressure (bar), and equipment state (`running`). Four selectable scenarios.
- Robust normal-scaled median absolute deviation scores, descriptive statistics, explicit missing-value counts, deterministic threshold flags.
- React/TypeScript dashboard with SVG telemetry, evidence ledger, timeline, scenario selection, loading/error handling, and explicit simulation/mock status.
- Provider protocol, structured schemas, bounded timeout/retry execution, and hard-disabled Meta adapter. Meta mode never falls back silently to mock.
- Locked dependencies, numerical/API/security/component tests, and GitHub Actions.

## Simulation ground truth

This is a synthetic signal generator, **not a validated physical pump model**. NumPy `default_rng(seed)` generates 120 independent rows with normal means `[65, 2, 6]` and standard deviations `[0.8, 0.08, 0.12]`. All measurements are in a fixed running state. At minute 80 through 119 inclusive, additive shifts are injected:

| Scenario | Temperature | Vibration | Pressure |
|---|---:|---:|---:|
| normal | 0 | 0 | 0 |
| cooling_loss | +14 °C | 0 | 0 |
| imbalance | 0 | +2 mm/s RMS | 0 |
| pressure_loss | 0 | 0 | −2 bar |

Scenario names describe the injected test case, not a diagnosis. Baseline uses the first 60 available rows (or all rows for input lengths 30–59), requiring at least 20 observed values per channel. Scale is `max(MAD / 0.6744897501960817, 1e-6)`. Flag when `abs(value − baseline_median) / scale > 6`. The scale floor prevents division by zero; it is not a sensor accuracy estimate. Summary standard deviation is population (`ddof=0`). Missing values are excluded, not filled; their scores are null. Strictly increasing minute indices and finite numeric bounds are enforced.

Default seed 42 produces no normal-case flags and exactly minutes 80–119 flagged on the shifted channel for each abnormal scenario. These expectations are tested. Other seeds are reproducible but may produce incidental flags; no false-positive guarantee is made. Operational data needs a separately curated clean baseline; using an already-abnormal baseline can hide anomalies.

## Configuration

Pydantic validates `FORGE_PROVIDER` (`mock`, default, or `meta`), `FORGE_META_ENDPOINT` (HTTPS required for Meta), `FORGE_MODEL_ID`, `FORGE_TIMEOUT_SECONDS` (0–60, exclusive zero), and `FORGE_RETRY_LIMIT` (0–3). Invalid settings fail startup. Meta mode requires an explicit non-mock model ID and endpoint but always returns a structured 503 for inference; no HTTP client is used by that adapter. Timeout and retry behavior are tested using local fake providers. No credentials are currently required or read. Do not configure paid inference.

## Scope and next steps

No experiment execution, physical verification, multimodal uploads, report export, persistent investigations, authentication, live sensor integration, or eligible Meta model integration yet. Competition model eligibility must be checked against official rules before integration. See [ARCHITECTURE.md](ARCHITECTURE.md), [EVALUATION_PLAN.md](EVALUATION_PLAN.md), [SECURITY.md](SECURITY.md), [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md), and [HACKATHON_BUILD_LOG.md](HACKATHON_BUILD_LOG.md).
