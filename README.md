# FORGE

A verifiable multimodal AI investigation platform, starting with industrial equipment failure investigation. **Phase 3 adds a durable sequential investigation console and restricted public demo, not a physical diagnostic system.** No Meta inference is performed. Legacy Phase 0 suggestions are explicitly mocked. Phase 1 candidates are rules-based; conclusions are supported, rejected, inconclusive, or abstained under a synthetic evidence policy.

## Quick start

Requirements: Python 3.12+, uv 0.12.23, Node.js 24 and npm. No GPU, external database, API key, account, or paid API is needed. SQLite is embedded. Use this existing checkout; cloud tasks are already isolated and do not need a new worktree.

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

Vite listens on port 5173 and proxies `/api` to backend port 8000. For another checkout location, substitute its path. Use local HTTP requests for cloud validation; onboarding does not provide public localhost previews. Both processes must restart in future tasks. For the Phase 3 same-origin production bundle and Docker option, follow [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). FastAPI serves `/demo` and `/assets`; build before startup. Public hosting has not been provisioned.

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

## Phase 1 investigation engine

The dashboard includes a separate five-stage workflow: **observe → hypothesize → select → simulate → verify**. Click “Start investigation,” then advance each stage. Inspect seven competing candidates, choose an automatic or manual allowlisted intervention, inspect independent witness evidence, and verify the finding. Download portable JSON or readable HTML only after verification. Changing the demo scenario resets the current workflow view.

The investigator receives telemetry summaries only; scenario names, recipes, seeds, and evaluation answers remain outside its inputs. Experiment outcomes come from a separate bounded relaxation simulator. A generator-independent verifier recomputes intervals and evidence quality, detects contradictions, rejects physical-cause proposals, and abstains when evidence is insufficient. An accepted finding is labeled **SUPPORTED_SYNTHETIC**, never proof about physical equipment. The existing `/demo`, `/analysis`, `/hypotheses`, `/health`, and `/model-status` contracts are preserved.

New endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/investigations` | Factory creates a synthetic case from scenario/seed/perturbation settings; returns an opaque ID and blind observations |
| GET | `/api/v1/investigations/{id}` | Current process-local snapshot |
| POST | `…/{id}/hypotheses` | Generate rules-based candidates and competing predictions |
| POST | `…/{id}/selection` | `{}` for automatic selection; or an allowlisted `kind` |
| POST | `…/{id}/experiments` | Run the bounded synthetic intervention |
| POST | `…/{id}/verification` | Recompute support/contradiction; optional `{ "proposal": { "hypothesis_id": "normal", "scope": "synthetic_mechanism" } }` tests a proposed claim |
| GET | `…/{id}/report.json` / `…/{id}/report.html` | Download completed evidence and reproduction instructions |

Out-of-order actions return 409. Immediate retries of an identical completed action are idempotent; changing a committed choice requires a new investigation. Sessions expire after one hour and the store holds at most 64 cases. Sessions disappear on restart; exported reports remain independently replayable. The dashboard runs the default unperturbed seed-42 cases; missing/noisy/confounded cases are available through the API and evaluation harness.

```bash
# Both services running, from repository root:
python scripts/api-smoke.py
cd backend
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.replay /tmp/forge-phase1-report.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.evaluate --output /tmp/forge-evaluation.json
```

See [Phase 1 validation](docs/PHASE1_VALIDATION.md) for actual test results and browser reproduction, [evaluation results](EVALUATION_PLAN.md) for the 480-case matrix and measured limitations, and [Meta integration readiness](docs/META_INTEGRATION.md) for official-source findings and unresolved eligibility/free-access questions.

## Scope and next steps

No physical verification, multimodal uploads, durable investigation storage, authentication, live sensor integration, or eligible Meta model integration yet. Experiments and reports are synthetic and bounded; this is development software, not production equipment software. Competition model eligibility must be checked against official rules before integration. See [ARCHITECTURE.md](ARCHITECTURE.md), [EVALUATION_PLAN.md](EVALUATION_PLAN.md), [SECURITY.md](SECURITY.md), [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md), and [HACKATHON_BUILD_LOG.md](HACKATHON_BUILD_LOG.md).


## Phase 2: multimodal and multi-fault lab

The dashboard now has a separate Phase 2 panel for noisy, simultaneous process/sensor faults and missing-data cases. Attach the explicit synthetic thermal/waveform sample or upload bounded evidence JSON, run the four-intervention investigation, inspect independent verification and source labels, then save JSON/HTML. General photos/audio/video and physical diagnoses are not implemented.

New `/api/v2` endpoints provide evidence ingestion, a gated provider adapter, investigations, reports and offline replay. All `/api/v1` behavior remains intact. Real inference is disabled by default; even a supplied key does not enable it. A failed model call never silently falls back to mock/rules output. See [Phase 2 implementation and validation](docs/PHASE2.md) and [verified access research](docs/META_INTEGRATION.md). No new runtime dependencies are required; the frozen installation/startup commands above still apply.

## Phase 3 sequential demo

Open `/demo` for durable stepwise investigations, ordinal hypothesis ranking, adaptive experiment selection, cross-experiment controls, multimodal provenance and independently replayable JSON/HTML reports. Local v1/v2 workflows remain available through the original Vite dashboard. Public mode permits only fixed synthetic cases and blocks all real inference/uploads; private owner mode requires a secret token. Baseten approval is pending.

See [Phase 3 implementation and evaluation](docs/PHASE3.md), [demo runbook](DEMO_RUNBOOK.md), [three-minute script](DEMO_SCRIPT.md), [judging alignment](JUDGING_ALIGNMENT.md) and [submission gates](SUBMISSION_CHECKLIST.md). The280-case synthetic evaluation achieved198/198 accepted exact findings with70.71% coverage; this is not industrial diagnostic accuracy.

## Phase 4 submission preparation

[Phase4](docs/PHASE4.md) adds a dry-default one-request smoke workflow, an evidence-backed two-ID Baseten catalog, an HTTPS deployment audit and a guarded public-only container launcher. Exact allowed hosts are required outside local mode. No real inference or public hosting has been activated. Follow [OWNER_ACTIONS.md](OWNER_ACTIONS.md); never load inference credentials into the public demo.

## Judge deployment and submission

The current priority is an anonymous public HTTPS app through **November18,2026**. A free-only [Render Blueprint](render.yaml) deploys the existing Docker app from `deployment/judge-access`; account/network access and external URL verification are still pending. No public app URL is claimed. Follow [owner hosting steps](docs/HOSTING_AND_ACCESS.md), [judge checklist](JUDGE_ACCESSIBILITY.md), [recording fallback](RECORDED_DEMO_FALLBACK.md) and [actual replayable evidence](docs/submission/README.md). Render Free can sleep and lose SQLite state; the UI discloses these risks. No keep-alive bots, paid add-ons, Oracle A1 dependency or public inference credentials are used.


## Product redesign and event integration

The public `/demo` product is redesigned with six functional views, a locally bundled IBM Plex Sans token system, unit-labeled interactive charts, source-bound evidence, hypothesis comparisons and dedicated verification/reporting. Legacy local v1/v2 labs and all numerical APIs remain compatible. Baseten event selection is confirmed; the exact event model is meta-models/muse-spark-open-1026 and the protected key name is BASETEN_API_KEY. No key is available here and no genuine call has run. Read docs/PRODUCT_REDESIGN.md, MODEL_ACTIVATION.md and REDESIGN_DEPLOYMENT.md. The existing reported Render deployment is preserved; live promotion requires owner approval.
