# Phase 4 — submission-critical integration preparation

Baseline: Phase3 `89c53e1115a8b5787a489889611194e604f9f231`. Work stays on `feature/forge-phase-4`; main is unchanged.

Implemented:

- Evidence-backed model catalog holds both Baseten IDs with separate documentation/access status. The public documented ID remains allowed; owner-reported `…-1026` remains disabled. No environment switch bypasses the registry.
- `forge.submission.smoke`: dry by default, all access gates checked before provider creation, exactly one explicit request/no retries, fixed blinded synthetic case, independently replayed output and private exclusive artifact. Tests use labeled local transports; no real model execution occurred.
- `forge.submission.serve`: fail-closed public container launcher with no credentials/inference/developer mode, bounded single-worker server and no trusted forwarded headers.
- Public/private Host allowlist and exact public routes; no legacy developer endpoint is exposed by the public profile.
- `forge.submission.audit`: read-only deployment readiness/security audit with HTTPS/TLS verification and bounded probes. Loopback HTTP requires explicit opt-in and cannot be reported as public HTTPS.
- Hardened local Compose and disabled env references; private activation artifacts/local env files excluded from Git and Docker context. No new application dependencies.
- Owner-action checklist and a source-aware three-minute demo narrative. CI runs the harmless smoke dry-run/catalog in addition to preserved checks/evaluations; it never executes real inference.

## Verified documentation and unresolved access

Sources/status/hashes are recorded in `phase4-source-manifest.json`, including failed URLs rather than invented evidence. The public event allows Meta open weights and lists Baseten/Modal/Fireworks offers for selected participants. Public eligibility does not prove authenticated account access. The participant guide remains an application shell; event alias`meta-models/muse-spark-open-1026` remains owner-reported, not independently verified.

The current [Baseten Model APIs overview](https://docs.baseten.co/development/model-apis/overview) and [chat reference](https://docs.baseten.co/reference/inference-api/chat-completions) confirm `https://inference.baseten.co/v1/chat/completions` and `Authorization: Bearer <key>` (direct callers may also use `Api-Key`). The public model library documents`meta-models/muse-spark-open`. An earlier attempted chat-reference URL returned404; the correct source was found through the official overview.

The overview explicitly says Muse Spark Open does **not** support provider-native structured outputs/JSON mode. FORGE uses a schema-instructed prompt and independent strict JSON validation, never claims constrained decoding, and fails rather than falls back. Native vision/audio capabilities in provider docs do not establish FORGE model vision: raw visual/audio model integration has not been implemented or tested. Exact response identity, model-specific sampling/reasoning behavior, schema success and actual usage remain smoke-test gates. Muse licensing/Exhibit A obligations are summarized in `META_INTEGRATION.md`; add attribution only with actual use.

Baseten approval is pending and no inference credential is configured. Dry preflight reports blockers with zero requests; credit/card-free flags record operator attestations, not account verification. No account, card, credits redemption, paid request, weights download or public hosting was initiated.

## Deployment and validation

See `DEPLOYMENT_SECURITY_AUDIT.md` for findings and hosting decision. No verified free/no-card public HTTPS option is available from current evidence. Docker is tested locally with a read-only root and persistent volume; this is not public deployment.

Commands from `backend`:

```bash
uv run --frozen python -m forge.submission.models
uv run --frozen python -m forge.submission.smoke
uv run --frozen python -m forge.submission.audit --url http://127.0.0.1:7862 --allow-loopback-http
```

From repository root: `docker compose -f deploy/compose.yaml up -d --build` (managed proxy build requires the CA secret described in `DEMO_RUNBOOK.md`; prebuild the image and use `--no-build` there). Local profile serves port 7862; it does not activate model access. Full activation sequence: `OWNER_ACTIONS.md`.

## Executed validation

154 backend tests (including all 110 prior tests) and 13 frontend tests passed; TypeScript/production build and new Python lint/format checks passed. All three evaluation matrices ran (1,040 cases); all 280 deterministic Phase3 records and metrics match the committed baseline, excluding measured latency. The desktop/mobile sequential workflow, saved report replay, hardened image build, safe-startup refusals and 32 read-only loopback deployment checks passed. SQLite state remained available across container recreation. Python/npm dependency audits found zero known vulnerabilities. One existing FastAPI TestClient/httpx deprecation warning remains.

`phase4-validation.json` records local checks and the blocked zero-request preflight. No actual-model accuracy, provider token usage/cost or public HTTPS result is claimed. The model remains disabled and no payment information was requested. Hosted CI is checked separately after the verified branch is pushed.
