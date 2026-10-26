# Phase 3 — verified synthetic demo foundation

Implemented October 26,2026 from Phase2 commit3837024494f77c6f7296f502b95e2477e98ca499. Real Meta access is still pending; no real inference or paid requests occurred.

## Architecture and interfaces

`/api/v3` adds a sequential bounded workflow alongside unchanged local v1/v2 APIs. Session actions are observe → generate competing candidates → select reference → execute/verify → select informative remaining intervention → execute/verify → stop. Maximum four unique experiments,96 synthetic replicates each. A private oracle holds the recipe; neither candidate generation nor verification receives its answer labels. The verifier depends only on public telemetry and trials, recomputes data/trial bindings and statistical checks, and rejects contradictory cross-experiment controls. It does not import the oracle or model provider.

New modules: `safety` (mode/auth/rate boundary), `storage` (SQLite), `oracle` (drift/outliers/interference), `service` (typed state, ordinal ranking and selection), `verification` (independent sequential decisions), `reporting`/`replay` (portable recomputation), `routes`, and `evaluate`. The React `/demo` console calls the real backend. FastAPI serves the compiled Vite bundle; Docker packages both in one non-root process. No microservices, cloud database or GPU is required.

Endpoints: GET `/api/v3/{health,ready,capabilities,scenarios}`; POST `/api/v3/sessions`; GET `/api/v3/sessions/{id}`; POST `/{id}/advance` with `expected_version`; GET `/{id}/report.json` and `report.html`. Private/local creation may provide validated metadata and calibrated thermal/waveform assets; public creation only accepts fixed presets. Metadata provenance is operator-declared, not authenticated sensor origin. Modality hashes bind context; no temporal alignment, cross-modal causal validation or model vision is claimed.

SQLite uses parameterized SQL, WAL, optimistic versions,120-second operation leases, bounded session count and TTL. One worker is required for process-local rate and inference budgets. Two concurrent actions are permitted, with100-second action deadlines. Session IDs are opaque but public sessions are deliberately **public synthetic data**, not private user storage. Offline reports recompute decisions, hypothesis source/ranking, selection order and event provenance. An attacker who authors an entirely new internally consistent report can recompute its hash: these are not signed attestations.

## Statistical and evaluation policy

A fixed99% Bonferroni familywise t-interval policy covers at most63 planned comparisons under the synthetic replicate assumptions. Ordinal ranks are not causal probabilities. This does not calibrate industrial uncertainty or establish physical failure. Missing evidence, ambiguity, insufficient budget and conflicting controls lead to abstention/inconclusive outcomes. The noisy multifault preset intentionally remains inconclusive at its default seed; no tuning hides that limitation.

`backend/evaluation/phase3-results.json` contains280 cases across14 profiles and new seeds9000–9019, including drift, noise, outliers, missing data, multiple faults, confounding and intervention interference. All280 reports replay. Recorded results:

| Metric | Result |
|---|---:|
| Accepted exact-set precision |198/198 (100%)|
| Answerable exact-set recall |198/220 (90%)|
| Finding coverage |198/280 (70.71%)|
| Required abstention/inconclusive recall |60/60 (100%)|
| Detector false-positive / false-negative rates |0/20;39/260 (15%)|
| First targeted experiment relevance |199/200 (99.5%)|
| Fixed-prefix budget-matched finding coverage |78/280 (27.86%)|
| Fixed-prefix accepted precision |78/78|
| Forced observational baseline accuracy |61/280 (21.79%)|
| Mean experiments |2.425 (679 total)|
| Unsupported adversarial candidate supported |0|

The comparator uses identical consumed experiment counts and replicate counts on the same oracle; the prefix budget is matched **post hoc** to adaptive consumed work. It is not an independently optimized stopping baseline. There is no actual-model baseline. Profiles sharing seeds are correlated; previously unseen seeds/profiles are a development holdout, not an external blind industrial test. The detector's15% false-negative rate remains a material limitation.

Latest recorded in-process rules workflow latency p50~22.57ms,p95~37.16ms on this shared development CPU excludes browser/network/storage and genuine inference. It must not be presented as deployed end-to-end model latency. Interval calibration covers50/50 independent Gaussian comparison families, Wilson95% interval[0.92865,1]; this is interval coverage under assumptions, not causal confidence. Cost/token usage is unmeasured because there were zero real inference requests.

## Deployment and access research

Official sources were fetched again under the published network policy; URLs/status/body hashes are in `phase3-source-manifest.json`. Baseten's public Muse library still does not verify event-specific alias`…-1026`. The participant-guide response is an application shell; no authentication bypass was attempted. Baseten credit application remains pending. The standard documented alias is`meta-models/muse-spark-open`, endpoint`https://inference.baseten.co/v1/chat/completions`, bearer-key chat schema. Only numeric summaries/features are implemented as model inputs; raw model-image ingestion is unverified.

The new token reservation cap reserves UTF-8 payload bytes plus requested maximum output tokens plus512 envelope units **before each network attempt**, along with an atomic request cap. It is a conservative local accounting unit, not provider-reported tokens or a billing guarantee. Counters reset on restart. Network calls remain disabled by default and always denied by public mode, even when credentials/config exist. No model access is necessary for health/readiness.

[Hugging Face Spaces overview](https://huggingface.co/docs/hub/spaces-overview) currently says Docker/Gradio compute Spaces require PRO/Team/Enterprise. CPU Basic's lack of hourly charges does **not** make Docker hosting free for an unpaid account. Static Spaces cannot host this FastAPI/SciPy backend. ZeroGPU's separate Gradio program has not been established compatible. Render's free-hosting documentation was policy-blocked in the earlier investigation; no terms or account eligibility were verified. No paid services or public deployment were activated. The tested local Docker image with a named volume is the reproducible $0 fallback.

## Validation and remaining gates

See `DEMO_RUNBOOK.md` for exact commands. Backend/frontend/component/API/security tests, all three matrices, legacy and new desktop/mobile workflows, exported report replay, non-root container startup, persistent state restart and dependency audits are validated separately. The browser runner respects the default write limit by waiting between viewport runs; a rapid second rehearsal correctly receives429. Local documentation is exempted from restrictive script CSP so existing Swagger/ReDoc assets work; public documentation routes remain forbidden. This is demo hardening, not industrial production certification.

Real-model execution, event alias confirmation, genuine model evaluation/visual reasoning, public hosting and a final competition-eligible recorded demo remain incomplete. See `SUBMISSION_CHECKLIST.md` for the October 30 priorities.

### Final local checks (October 26)

Backend110/110 tests and frontend13/13 component tests pass; TypeScript and production build pass. Python dependency audit checked26 installed packages with zero known vulnerabilities; npm audit reports zero. One existing FastAPI TestClient/httpx deprecation warning remains. V1 (480 cases),V2 (280),V3 (280) matrices executed successfully. Legacy desktop/mobile browser workflows, four real-process API workflows and all three report replay CLIs passed. The non-root image built and reported healthy; a complete version5 session survived container replacement with its named volume. No deployed-host/platform SLA or real inference result is claimed.

The Phase3 backend suite also passes with the frontend build directory absent, using an isolated fixture bundle; missing real bundles correctly fail public readiness. Both new desktop/mobile browser runs pass with no horizontal overflow or JavaScript errors, including restored state, modality provenance, JSON/HTML downloads and missing-data abstention. Screenshots are committed under docs/evidence/phase3-*.png.

### Additional simulator ground truth

Phase3 extends the documented Phase2 recipe. Drift adds a linear primary-sensor offset from0 to10 baseline scale units over minutes0–119 (scales0.8°C,0.08mm/s,0.12bar); controlled trial primaries retain a10-unit normalized offset before/after, while independent witnesses do not drift. Seeded outliers add either−8 or+8 scale units with configured probability up to0.1. Control interference adds6 normalized units to vibration primary and witness after a cooling intervention, contradicting the unchanged-control assumption. These are scripted stress tests, not physics. Evaluation expected labels are private and excluded from candidate/verifier inputs.
