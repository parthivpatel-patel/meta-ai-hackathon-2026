# FORGE

FORGE investigates abnormal equipment measurements by comparing possible causes, running controlled diagnostic tests and independently checking the results. The demonstration uses simulated industrial telemetry; it does not establish failures in real equipment.

**[Open the public demonstration](https://forge-judge.onrender.com/demo)** · [User guide](docs/product-completion/USER_GUIDE.md) · [Documentation](docs/README.md)

Choose a pressure, temperature or vibration case, inspect the evidence, review proposed tests, then export the findings. Other cases demonstrate noisy signals, normal operation, missing observations and inconclusive evidence. The six stages are Overview, Evidence, Possible causes, Tests, Results and Report.

## Capabilities

- Temperature, vibration and pressure analysis with missing-data handling.
- Sequential experiments and verification independent of hypothesis proposals.
- Interactive charts and an illustrative equipment inspector with keyboard controls and no WebGL requirement.
- Explicit uncertainty, source labels and synthetic ground truth.
- JSON/HTML reports with offline numerical replay.

The public demo uses **rules-based proposals, not Meta inference**. A protected Baseten adapter is prepared for `meta-models/muse-spark-open-1026`; genuine inference has not been verified. Replacement credentials, confirmed card-free access and explicit owner authorization remain required. Provider credentials must never be added to the public server.

## Architecture

A modular Python/FastAPI monolith uses Pydantic validation, NumPy/SciPy analysis and SQLite session storage. React, TypeScript and Vite provide the guided interface. The hypothesis provider, experiment policy and numerical verifier have separate contracts. [Architecture](ARCHITECTURE.md) and the [current engineering review](docs/product-completion/ENGINEERING_REVIEW.md) explain the implementation and its limits.

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
uv run --frozen python -m forge.phase3.replay /path/to/report.json
```

The [validation evidence](docs/product-completion/validation.json) records 209 backend tests, 25 frontend tests, all seven browser investigations,105 accessibility view checks and 1,040 synthetic evaluation cases. Browser scripts under `scripts/` use optional Playwright/Axe tooling and local test containers; see [reproduction instructions](docs/product-completion/README.md). These checks do not certify industrial accuracy or complete accessibility.

## Public demo and release limits

The owner reports commit `0107579414f20e46d3919fcffbaf979fcb5296a9` deployed at the public URL. This cleanup branch is a separate candidate and has not been deployed. Render Free can sleep when idle and lose SQLite state on spin-down, restart or deployment. Export JSON/HTML reports before relying on a session; keep a recorded demonstration independently. Availability through November 18 is a target, not a guarantee.

The equipment geometry and sensor locations are illustrative. Thermal/waveform evidence is descriptive context, not verified model vision/audio or physical causal proof. Public mode accepts fixed synthetic cases, has no per-user account isolation and must not hold sensitive industrial data.

See [security](SECURITY.md), [current release and rollback](docs/CURRENT_RELEASE.md), [model activation gates](MODEL_ACTIVATION.md) and the [submission checklist](SUBMISSION_CHECKLIST.md). The development-window eligibility question remains [unresolved](docs/ELIGIBILITY_TIMING_REVIEW.md). Historical evidence, attribution and original Git timestamps are preserved; no organizer approval or completed submission is claimed.
