# Phase 2 checkpoint — October 26, 2026

Continues `feature/forge-phase-1` from `e2213b819a1bebef2376b0289720c55795a2929d`. Main is unchanged. All original v1 routes, simulation contracts, and tests are retained; new capabilities live under `/api/v2` and `backend/forge/phase2`.

## Implemented architecture

- `inference.py`: provider-independent async protocol and bounded chat-completions transport. Exact documented HTTPS endpoints and a reviewed Meta model registry; default-disabled opt-in; explicit free-access attestation; absent-by-default secret; process-lifetime request budget (0 by default, maximum 10); bounded retry, timeout, input/output size; TLS verification retained, redirects/compressed responses/tool calls rejected; strict structured hypotheses; model-identity mismatch rejection; credential-echo rejection; sanitized errors; no fallback. Baseten and direct Meta identifiers are documented. Fireworks transport URL is documented but its model registry remains closed until an exact API identifier is independently checked.
- `evidence.py`: validated calibrated thermal images (8–64 rows/columns, Celsius) and vibration waveforms (128–4096 bounded samples, declared sample rate). Computes thermal hotspots, RMS, and FFT peak/resolution. Content digests and declared synthetic provenance are recorded. This is numerical multimodal ingestion, not arbitrary photo/video/audio interpretation or external vision inference. Assets are context, not mechanistic proof.
- `oracle.py`: private new simultaneous process faults, independent sensor biases, ramps, late onsets, missingness, weak departures, and noise. No recipe or answer label reaches inference inputs.
- `verification.py`: model-independent raw-evidence verification with window-level mean-shift checks, independent witness readings, targeted response, non-target intervention controls, stable sensor-offset checks, and explicit partial/inconclusive/abstain results. It imports no private oracle, generator, or inference transport. Up to 63 comparisons use a 99% familywise Bonferroni t-interval policy under synthetic Gaussian replicate assumptions. This is not a probability of a physical cause.
- `service.py`: reference plus three interventions ranked from observed evidence; 96 independent replicates each; per-model-proposal verification; portable schema-v2 reports and strict offline replay. Model rationale remains untrusted text; it cannot override numerical decisions.
- `body_limit.py`: 1 MiB ASGI prebuffer limit, including chunked bodies, before JSON parsing; 15-second body-read timeout and structured 413/408 errors.
- `Phase2Investigation.tsx`: independent noisy/multi-fault lab, JSON evidence upload (150 KB UI limit), thermal preview, feature summaries, explicit source labels, disabled-until-configured Meta checkbox, error handling, and JSON/HTML downloads. The original v1 workflow remains available.

## API and reproducibility

| Endpoint | Purpose |
|---|---|
| GET `/api/v2/model-status` | Configuration readiness, never an automatic inference probe |
| GET `/api/v2/evidence/demo` | Explicit synthetic thermal/waveform sample |
| POST `/api/v2/evidence` | Validate and summarize a bounded evidence bundle |
| POST `/api/v2/investigations` | `{recipe, evidence, use_meta:false}` runs a bounded synthetic investigation |
| POST `/api/v2/replay` | Recompute evidence, metadata, source consistency and verification from a complete report |
| POST `/api/v2/reports/html` | Replay first, then export escaped HTML with restrictive CSP |

A recipe specifies `faults`, `sensor_biases`, seed, noise/missingness, onset, shape, amplitude, and confounding **only at the private factory boundary**. Public reports contain observations and evidence, not those labels. Reports embed complete raw evidence and can be replayed without network or a private recipe. Digests establish consistency, not sensor authenticity or attestation that a provider actually ran the claimed weights. An uploaded report's provider identity is not a signed credential.

```bash
# From repository root:
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --project backend --frozen pytest backend/tests -q
npm test --prefix frontend
npm run build --prefix frontend
# From backend:
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.phase2.evaluate --output /tmp/forge-phase2-evaluation.json
UV_CACHE_DIR=/tmp/forge-uv-cache uv run --frozen python -m forge.phase2.replay /tmp/forge-phase2-report.json
```

The replay input above is produced by the browser runner:

```bash
# Both services running as described in README:
npm install --prefix /tmp/forge-browser --cache /tmp/forge-npm-cache playwright@1.56.1
NODE_PATH=/tmp/forge-browser/node_modules node scripts/browser-check.cjs
NODE_PATH=/tmp/forge-browser/node_modules node scripts/phase2-browser-check.cjs
```

System Chromium is used by default; `CHROMIUM_EXECUTABLE_PATH` can select another installed Chromium. No TLS verification is disabled. Local desktop/mobile evidence is saved as `docs/evidence/phase2-desktop.png` and `phase2-mobile.png`.

## Actual evaluation

[phase2-results.json](../backend/evaluation/phase2-results.json) records **280 cases**, seeds **7000–7019**, across 14 profiles not used in Phase 1: multi-fault combinations, same-channel sensor/process mixtures, ramps, late onsets, strong/weak noise, missingness, confounding and normal controls. The evaluator alone holds the answer key; inference receives summaries only. Published evaluation cases must not be treated as permanently unseen data.

| Metric | Actual result |
|---|---:|
| Accepted exact-set precision | 212 / 212 |
| Finding coverage | 212 / 280 (75.71%) |
| Answerable exact-set recall | 212 / 240 (88.33%) |
| INCONCLUSIVE / ABSTAIN | 48 / 20 |
| Required abstention/inconclusive on out-of-policy cases | 40 / 40 |
| Detector false positives | 0 / 20 normal cases |
| Detector false negatives | 44 / 260 abnormal cases |
| Matched-data v1 exact-set precision | 60 / 66 |
| Matched-data v1 coverage | 66 / 280 |

V2 uses **16 times the raw experimental sample budget**: four trials × 96 replicates versus one × 24 for the v1 baseline. This is not an equal-compute comparison. The baseline uses identical observational data and the first 24 experimental replicates under its own original selector and verifier. Precision means an accepted *complete set* equals the answer key; it does not estimate component probabilities. Detection counts insufficient data as no detection. Profiles sharing seeds are correlated; these are descriptive synthetic results, not industrial accuracy estimates.

Clean pairs/triples, ramp pairs, late pressure, isolated sensor bias and 15%-missing pairs each have 20/20 supported findings. Noisy single/pair profiles each have 19/20; same-channel sensor/process mixture 14/20. All 20 weak/noisy cases are inconclusive, all 20 missing75 cases abstain, and all 20 confounded cases are inconclusive. Partial channel evidence in an inconclusive report is not an accepted complete finding. No real model outputs were evaluated in this matrix.

## Access and configuration

See [META_INTEGRATION.md](META_INTEGRATION.md). The best documented zero-card candidate is Baseten starting/event credits with **no payment method**, subject to actual account credit activation and model access. No account or inference request was created here.

All new transport settings use `FORGE_INFERENCE_`: `PROVIDER`, `ENDPOINT`, `MODEL_ID`, `API_KEY`, `ENABLED`, `FREE_ACCESS_CONFIRMED`, `REQUEST_BUDGET`, `MAX_TOKENS`, `TIMEOUT_SECONDS`, `RETRY_LIMIT`. API key values belong only in secure environment settings. Defaults are Baseten's documented model/endpoint, `ENABLED=false`, `FREE_ACCESS_CONFIRMED=false`, budget `0`, and retries `0`. Keys alone cannot enable inference. Process restart resets the client budget; it is a local request cap, **not a provider billing cap**. Confirm provider-enforced stopping/no-card behavior and an explicit zero-cost test authorization before enabling any call. No silent fallback is permitted.

The legacy `FORGE_PROVIDER=meta` path remains intentionally blocked to preserve v1 behavior. Only the explicit v2 path implements the new gated adapter. `/api/v2/model-status` reports configuration, not verified account eligibility or a guaranteed free response.

## Remaining limits and October 30 plan

No real Meta inference or participant-specific free account has been verified. The participant guide requires authenticated approved-attendee access; exact event alias `meta-models/muse-spark-open-1026`, public-repository requirement and detailed rules still need that source. Full Muse license/use-policy text links currently hit an unapproved Hugging Face host. No general media decoding/vision model, persistent storage, authentication, production hosting, physical validation, adaptive minimum-cost experimental policy, or universal multi-fault support is claimed.

October 27: verify card-free Baseten credits, event alias and license; provide a key securely and authorize one capped synthetic smoke request only after zero-cost access is established. October 28: evaluate actual eligible-model outputs and complete a meaningful model-assisted demo; improve ambiguous cases against new data rather than tuning the published matrix. October 29: freeze the demonstration flow, rerun security/regression/replay checks, and prepare the report/video. October 30: internal release freeze and submission-readiness review. The public event page lists November 4 at 9 PM Eastern for submission; check the authenticated rules for changes.


## Validation evidence

- Backend: **91 passed, 0 failed, 0 skipped**, including all 51 previous tests. One pre-existing FastAPI TestClient/httpx deprecation warning remains.
- Frontend: **9 passed, 0 failed, 0 skipped**, including all 6 previous tests.
- Strict TypeScript/Vite production build and targeted Ruff import/undefined-name checks: passed.
- Full v1 480-case and v2 280-case evaluation commands are included in CI. Locally regenerated matrices were compared with the committed JSON artifacts for exact parsed equality.
- Live HTTP API, v1 desktop/mobile workflows and v2 multimodal/multi-fault/download/abstention browser checks: passed. Downloaded JSON replays offline on current code. Browser tests use real local backend data, not component fixtures.
- End-to-end API tests exercise local HTTP model fixtures through structured output validation, independent rejection of an incorrect model candidate, report replay and escaped HTML. These fixtures are labeled `test_transport`, never real inference.
- Security checks cover endpoint/model registry restrictions, default-off gates, process request limits, bounded retries and total per-attempt wall-clock deadlines, response size/identity/tool/schema checks, credential echo and compressed responses, oversized chunked uploads, altered canonical report metadata, and HTML injection. No assertions were weakened.
- Full npm audit: **0 known vulnerabilities**. Installed-backend pip-audit: **no known vulnerabilities**. Credential-pattern scan found no matches in 52 source/documentation files; this is not a formal penetration test or proof that all possible secrets are absent.
- GitHub Actions status lookup was attempted again but `api.github.com` remains blocked in the current runtime; no remote CI outcome is claimed. A domain addition is saved for review, not applied automatically.

No real eligible-model request has executed; account-specific zero-cost availability is still a blocker. No production-readiness, physical safety, or generalized model-quality claim is made.
