# FORGE

FORGE investigates abnormal equipment measurements by comparing possible causes, running controlled diagnostic tests and independently checking the results. The demonstration uses simulated industrial telemetry; it does not establish failures in real equipment.

**[Open the public demonstration](https://forge-judge.onrender.com/demo)** · [Phase 8 release candidate](docs/phase-8-final/README.md) · [Documentation](docs/README.md)

The candidate workstation at `/demo` connects a selectable 3D pump and motor to coupled synthetic telemetry, diagnostic captures, counterfactual tests and independently checked results. Use Cases → **Investigation library** (`/demo?view=investigations`) for the preserved seven-case workflow inside the shared navigation. The public URL may still run the earlier release; this branch has not been deployed.

## Capabilities

- Temperature, vibration and pressure analysis with missing-data handling.
- Sequential experiments and verification independent of hypothesis proposals.
- Interactive Three.js machine, component instruments and bounded telemetry playback, with an accessible 2D fallback.
- Seven coupled machine scenarios, counterfactual previews, simulation repair/shutdown, validated local JSON/CSV import and report reproduction.
- Explicit uncertainty, source labels and synthetic ground truth.
- JSON/HTML reports with offline numerical replay, explicit stopping reasons and validated browser-local checkpoint recovery.
- Four tests are a maximum: the default bearing case completes after two, while unresolved cases can legitimately exhaust the budget.

The public demo uses **rules-based proposals, not live Meta inference**. The candidate can also replay explicitly labeled recorded proposals; fixture imports are never presented as genuine inference. A protected Baseten adapter is prepared for `meta-models/muse-spark-open-1026`; genuine inference has not been verified. The owner reports a credential and $100 hackathon credits, but authoritative credit-only/no-overage protection remains unverified. Genuine inference is blocked, and Phase 8 does not reauthorize the unused smoke attempt. Provider credentials must never be added to the public server.

## Architecture

A modular Python/FastAPI monolith uses Pydantic validation, NumPy/SciPy analysis and SQLite session storage. React, TypeScript, Vite and locally bundled Three.js provide the workstation and preserved guided interface. The hypothesis provider, experiment policy and numerical verifier have separate contracts. [Architecture](ARCHITECTURE.md) and the [model integration architecture](docs/meta-final/ARCHITECTURE.md) explain the implementation and its limits.

## Run locally

Requirements: Python 3.12+, uv 0.12.23 and Node.js 24/npm. No API key, GPU or external database is needed. From the repository root:

```sh
uv sync --project backend --frozen
npm ci --prefix frontend
```

Start the backend in one terminal:

```sh
cd backend
uv run --frozen uvicorn forge.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Start the frontend in another:

```sh
cd frontend
npm run dev -- --host 127.0.0.1
```

Open **http://127.0.0.1:5173/demo**. The Vite proxy connects to the backend on port 8000. The root page retains earlier developer labs; it is separate from the public demonstration. Local development mode exposes developer APIs and must not be deployed publicly. The Docker image uses the restricted public launcher.

## Test and replay

```sh
cd backend
uv run --frozen pytest -q
cd ../frontend
npm run check:tests
npm test
npm run build
```

From `backend`, replay an exported report without a model connection:

```sh
# Machine workstation report:
uv run --frozen python -m forge.industrial.replay /path/to/report.json
# Established investigation-library report:
uv run --frozen python -m forge.phase3.replay /path/to/report.json
```

The [current validation evidence](docs/phase-8-final/validation.json) records expanded backend/frontend tests, machine and recorded-proposal browser journeys, preserved library regression, numerical evaluation, accessibility and production/security checks. See the [reproduction guide](docs/phase-8-final/VALIDATION.md) for exact commands and scopes. Baseline workstation evidence remains preserved under `docs/industrial/`. These checks do not certify industrial accuracy or complete accessibility.

## Public demo and release limits

The owner reports a Phase 7 deployment. Its actual Live SHA/settings/rollback artifact require dashboard verification; this Phase 8 candidate has not been deployed. Render Free can sleep when idle and lose SQLite state on spin-down, restart or deployment. Export JSON/HTML reports before relying on a session; keep a recorded demonstration independently. Availability through November 18 is a target, not a guarantee.

The equipment geometry and sensor locations are illustrative. Thermal/waveform evidence is descriptive context, not verified model vision/audio or physical causal proof. Public mode exposes bounded synthetic workflows, has no per-user account isolation and must not hold sensitive industrial data.

See [security](SECURITY.md), [current release and rollback](docs/phase-8-final/RELEASE.md), [model activation gates](MODEL_ACTIVATION.md) and the [submission checklist](SUBMISSION_CHECKLIST.md). The development-window eligibility question remains [unresolved](docs/ELIGIBILITY_TIMING_REVIEW.md). Historical evidence, attribution and original Git timestamps are preserved; no organizer approval or completed submission is claimed.

## Unified workstation candidate (Phase 6)

The exact Phase 5 baseline is preserved. The [unified workstation handoff](docs/unified/README.md) documents coordinated machine/investigation modes, detailed procedural geometry, retained library state, actual local production evidence and explicit release gates. No Phase 6 deployment or genuine inference is implied.

## Phase 7 final experience candidate

The [unified case/recovery handoff](docs/final-experience/README.md) records the latest candidate, native browser checkpoints, independent session recovery, actual browser evidence and explicit financial block on genuine inference. No deployment or active public Meta inference is implied.
