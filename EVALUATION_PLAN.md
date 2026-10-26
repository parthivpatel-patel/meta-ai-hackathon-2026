# Evaluation plan

## Phase 0 acceptance checks

1. Install using `uv sync --project backend --frozen` and `npm ci --prefix frontend`.
2. Run pytest for deterministic scenarios, seed variation, analytic mean/std/MAD references, constant baselines, missing values, insufficient baseline values, nonfinite data, ordering, API routes, configuration rejection, safe error/log handling, retries, timeout, and the Meta network gate.
3. Run frontend Vitest for fetched evidence rendering and provenance labels, scenario requests, actionable error retry, and disconnected chart segments for missing samples.
4. Run `npm run build` for strict TypeScript checking and production bundling.
5. Start both services. Request every scenario through the Vite proxy and verify seed-42 flags: normal none; cooling_loss temperature 80–119; imbalance vibration 80–119; pressure_loss pressure 80–119.
6. In a real browser at desktop and mobile widths, verify the data loads, three charts render, scenario transitions update evidence, and the page does not overflow horizontally or emit JavaScript errors.

Automated CI covers steps 1–4. The current-task live proxy and Chromium checks cover steps 5–6; they are not yet checked into CI as a browser suite. No Meta endpoint is called by any check. API tests run through FastAPI TestClient; this is distinct from the actual-process smoke checks.

## Phase 1 investigation evaluation

Create hidden-label synthetic cases spanning seeds, noise scales, missingness, sensor bias, operating-state changes, combinations, and near-threshold effects. Separate baseline/calibration, development, and holdout sets. Measure channel-level precision/recall, onset delay, false positives, hypothesis diversity, experiment discrimination, reproducibility, and correct abstention. Estimate confidence intervals across independent seeds rather than treating correlated samples as independent cases.

Compare robust scoring against fixed thresholds and standard z-scores. For model-assisted work, compare mock, an eligible Meta model, and numerical-only baselines with the same evidence budget. Blind the inference input to scenario names and injected ground truth. Verify model eligibility, free access, provenance, model version, prompts, and usage before calling an endpoint.

No industrial dataset benchmark, validated diagnosis accuracy, safety certification, real-world generalization, or model quality claim is established by Phase 0. Multimodal, experiment verification, contradictory evidence, and reproducible report evaluation remain unimplemented.
