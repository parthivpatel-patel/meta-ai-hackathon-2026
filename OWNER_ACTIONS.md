# Owner actions — submission activation gates

Internal target: **October 30, 2026**. Announced official deadline: **November 4, 2026, 9 PM Eastern**. Confirm final authenticated event terms for updates. Current state: Baseten approval pending; no inference credential configured; zero genuine model requests; no public HTTPS deployment.

## 1. Confirm eligibility and card-free entitlement

- [ ] Sign in to the approved participant guide. Confirm the exact model ID, event development window, eligible model/provider rules and submission format. Keep a dated source reference without publishing account/session information.
- [ ] Baseten public ID `meta-models/muse-spark-open` is independently documented. `meta-models/muse-spark-open-1026` is owner-reported and **disabled**. If the guide confirms the event alias, record the official evidence and have the catalog/registry and tests reviewed before activation; there is no runtime alias override.
- [ ] Obtain approved event/starting credits and confirm positive remaining Model API balance. Confirm **no payment method**, card-free use of this exact model, provider-side stopping at credit exhaustion, and applicable enforced Model API budget. Notification-only budgets do not stop requests. Stop if any payment method is required.
- [ ] Review Muse Model License and incorporated Exhibit A; record acceptance where required. Do not use the synthetic demo to operate heavy machinery. Add required “Built with Muse Spark Open” attribution when actual model use begins; current rules output must not claim it.

The public event permits Meta open weights and advertises selected-participant Baseten credits. This does not establish your account entitlement or independently confirm the event alias. FORGE's attestation flags record your confirmation; they do not query billing or prove free access.

## 2. Configure a separate trusted owner environment

- [ ] Keep the public service credential-free and inference-disabled. Inject `FORGE_INFERENCE_API_KEY` through secure environment settings only, scoped to `inference.baseten.co`; never paste it into chat, source, URLs or recordings.
- [ ] Use the reviewed values in `deploy/smoke.env.example`. These files are references, not automatically loaded. Set `FORGE_INFERENCE_ENABLED=true`, `FORGE_INFERENCE_FREE_ACCESS_CONFIRMED=true`, `FORGE_SMOKE_CREDITS_APPROVED=true`, and `FORGE_SMOKE_CARD_FREE_ENTITLEMENT_CONFIRMED=true` **only after step 1 passes**.
- [ ] Set request budget1, retry limit0, token reservation8192 (maximum16384), max output1024, timeout15s. These counters are per process and are not provider billing limits.
- [ ] Run the **dry** preflight from `backend`: `uv run --frozen python -m forge.submission.smoke`. Check `ready_for_explicit_execution`; exit0 alone does not imply readiness. This command never creates a provider or sends a request.

## 3. Run exactly one approved smoke investigation

Do not execute this section until steps 1–2 are complete. This workflow has been tested with local HTTP fixtures only; it has **not** been run against Meta/Baseten.

```bash
# From repository root; artifacts/ is ignored and stays private.
mkdir -p artifacts
cd backend
uv run --frozen python -m forge.submission.smoke --execute --output ../artifacts/meta-smoke-01.json
```

The command reserves a new file with mode `0600` before any network call and refuses overwrite/symlinks. It makes at most one request with zero retries, sends only synthetic blinded numeric/context summaries, validates at least two structured candidates, runs bounded synthetic interventions, and independently replays the report. Interruption/failure leaves a warning artifact; **inspect provider usage before any new attempt**. Do not automatically retry under a new filename. Output tokens, reasoning behavior, exact returned model identity and schema success remain unverified until this succeeds. Provider-native JSON/schema mode is not assumed for Muse Spark Open.

- [ ] Inspect artifact source: genuine transport must say `meta_http_response`; `test_transport` is never genuine Meta output. Record requested/returned model ID and report hashes.
- [ ] Check actual provider usage, remaining credits, tokens and any displayed cost. The artifact's byte/output reservation is not billed token usage. Never equate a synthetic supported finding with industrial accuracy.
- [ ] Review candidate quality/failures and measure model contribution. The current model contributes candidate choice/rationale; numerical selection and acceptance stay deterministic. No raw-image model vision is implemented.

## 4. Rehearse the truthful final demo

- [ ] Follow `DEMO_SCRIPT.md`. Keep source and synthetic labels visible. A genuine recorded response may be replayed, explicitly labeled recorded; never call it live inference.
- [ ] For live inference, authorize a **separate bounded run** after rechecking credits. Use a local authenticated private API and exact allowed hosts; retain public mode for all anonymous traffic. Do not treat the prior process's request counter as a shared cap.
- [ ] Evaluate actual model proposals versus rules on a predeclared small scenario set within newly approved free limits. Record exact-set correctness, invalid outputs, abstentions, latency and provider usage; no model advantage is established yet.
- [ ] Download JSON/HTML, replay independently, confirm recording readability/audio/timing and absence of credentials. Keep the three-minute narrative within the official format.

## 5. Public HTTPS deployment — optional, still blocked

- [ ] Obtain a provider's **current** documented $0/no-card entitlement for this FastAPI/NumPy/SciPy container. HF Docker Spaces currently requires a paid plan; Modal standard use requires a payment method. Render/Cloudflare pages are network-blocked here. No suitable public host has been verified.
- [ ] If a valid option exists, approve only required domains/account access through normal environment settings. Do not bypass proxy/TLS controls. This environment currently exposes no public HTTPS deployment capability or hosting credential.
- [ ] Deploy the public-only launcher, one worker, exact `FORGE_DEMO_ALLOWED_HOSTS` JSON list including the actual ingress hostname and127.0.0.1 health host. No wildcard, owner token or inference key. Keep developer/Vite/private endpoints off public ingress.
- [ ] Confirm TLS certificate, HTTPS redirect and appropriate HSTS at the ingress, restricted host ports, storage lifetime/backup, capacity/sleep behavior, access logs without secrets, and no external billing. Do not override the safe image entrypoint.
- [ ] Run `uv run --frozen python -m forge.submission.audit --url https://YOUR-VERIFIED-HOST` from `backend`. It is read-only, verifies TLS, rejects redirects, and checks public readiness/headers/CORS/blocked developer routes. This does not certify the host's billing or replace security review.
- [ ] Rehearse on the actual public URL, including a cold start, refresh, rate-limit recovery and report export. Local Docker alone does not prove public HTTPS availability.

## 6. Freeze and submit

- [ ] Before October30: real Meta artifact/evaluation, truthful recording, reproducible reports and final review. If access remains blocked, explicitly mark the Meta requirement unmet.
- [x] Repository visibility was independently confirmed public at the Phase3 checkpoint.
- [ ] Recheck public repository/branch links, CI, official submission form, licenses/attribution, development-window compliance and all demonstrated claims.
- [ ] Submit and save receipt before the official deadline; do not merge main automatically.
