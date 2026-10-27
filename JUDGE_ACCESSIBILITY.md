# Final judge-accessibility checklist

Owner reports live application: `https://forge-judge.onrender.com/demo` at the verified deployment commit. The current proxy blocks independent external verification here; the redesign is not deployed.

Availability target: **through November18,2026**. Internal readiness target: **October30**. Official announced submission deadline: **November4,9PM Eastern**; confirm final guide.

## Live application gate — owner reports live; independent check pending

- [ ] Actual anonymous public HTTPS application URL recorded; not localhost, dashboard or repository URL.
- [ ] TLS verified externally, exact audited deployment commit/time recorded, no login needed.
- [ ] `/demo`, readiness and public security audit pass on the actual hostname; developer endpoints remain forbidden and inference credentials absent.
- [ ] Desktop and phone: cold load, fixed misleading-sensor case, complete two experiments, clear source/synthetic labels, reload and JSON/HTML export.
- [ ] Free-tier warm-up and possible SQLite loss explicitly disclosed beside the submitted app link.
- [ ] Account/service remain active, no paid add-ons, auto-deploy disabled, quota/suspension notices reviewed. Manually recheck before submission/judging and after any platform notice through November18; do not deploy keep-alive bots.
- [ ] Fresh anonymous browser after a missing/expired session can start a new investigation. Exported reports replay independently of server state.

## Recorded fallback and durable evidence

- [ ] Final three-minute recording has a public, logged-out accessible HTTPS link; include it in the submission alongside the app URL. A recording is fallback evidence, not proof of live hosting.
- [ ] Include a short note: “Free service may need about a minute to wake. If unavailable, watch the recorded walkthrough and inspect the replayable evidence.” Recheck wording against actual observed cold-start latency.
- [ ] Current rules-only rehearsal is labeled **SYNTHETIC / RULES-BASED / NOT META**, with no claims of industrial accuracy or genuine model vision.
- [ ] Once genuine Meta access exists, record exact provider/model provenance, actual response and verifier behavior; label prerecorded responses as recorded. Never relabel the existing rules rehearsal as Meta output.
- [x] Versioned sample JSON/HTML, hashes and replay instructions prepared under `docs/submission/`; genuine Meta execution remains pending.
- [ ] Final recording audio, readable labels, duration and public permissions checked by a logged-out viewer; download an offline backup.

## Submission evidence and model gate

- [ ] Record actual app/video URLs and HTTPS audit results only after verification; current evidence manifest deliberately keeps them null.
- [ ] Eligible exact Meta model, approved remaining credits and card-free entitlement confirmed; secret injected securely into the separate owner workflow. Public host stays credential-free.
- [ ] Dry smoke passes readiness checks, then exactly one approved genuine call is independently verified and reviewed. Retry only after provider usage inspection. See OWNER_ACTIONS.md.
- [ ] Real-model evaluation and contribution are honestly reported; model candidates/rationales are separate from deterministic experimental selection and verification.
- [ ] Public repo/branch/commit, CI, final guide rules/license attribution, demo and report links included. Save submission receipt.

Current blockers are protected BASETEN_API_KEY, an authenticated model smoke/evaluation, independent external app verification (proxy-blocked here), final recording and exact-commit owner approval for the redesign release. Baseten selection and existing Render deployment are participant-confirmed; they are no longer pending. Local checks do not substitute for genuine model or external HTTPS evidence.
