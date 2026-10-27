# Final engineering audit and evidence matrix

Audit baseline: `f5512c05c187733d1a69af86b399bc33175d6d5e` (FORGE 4.0). Work branch: `feature/forge-final-engineering`. Cosmetic changes are frozen. [The complete baseline inventory](final-audit-inventory.json) covers 232 tracked files, including executable modules, tests, build/deployment configuration, historical documents and evidence. Technical review focused on the full backend paths, current frontend state/API boundaries, numerical/report contracts, test suites, CI, deployment and current submission documentation. Historical screenshots were inventoried, not redesigned.

The status categories below describe evidence, not aspirations. Local fixtures, synthetic numerical results, successful HTTP readiness and genuine inference are distinct kinds of evidence.

| Capability | Classification | Evidence and practical limit |
| --- | --- | --- |
| Health, configuration, structured errors, input bounds and request logging | Implemented and verified | `forge/main.py`, configuration/body limits and backend regression tests. Public mode restricts developer routes. |
| Deterministic telemetry and ground truth | Implemented and verified | Simulation/oracle tests, fixed seeds and committed synthetic evaluation matrices. No industrial field data. |
| Robust anomalies and missing observations | Implemented and verified | NumPy/SciPy numerical tests, missing-data fixtures and explicit abstention. An anomaly is not proof of failure. |
| Sequential diagnostic tests and independent verification | Implemented and verified | Phase 3 service/verifier/replay tests, bounded four-test policy and unchanged 280-case benchmark. Model wording cannot select a verified finding. |
| FORGE 4.0 case selection, evidence, causes, tests, results and export | Implemented and verified | 22 frontend tests; desktop/mobile real-backend runner. No cosmetic changes in this phase. |
| Interactive equipment inspection | Implemented with explicit limits | Projected 3D SVG, rotation/zoom, selectable components, session sensor/evidence/test/verifier mapping, keyboard controls and mobile browser checks. No WebGL dependency; schematic geometry, not CAD or a digital twin. See `INTERACTIVE_EQUIPMENT.md`. |
| Session versions, recovery and capacity boundaries | Implemented and verified | SQLite leases, stale-action, restart/missing-session and transient failure tests. Free-host state remains ephemeral with finite retention. |
| JSON/HTML reports and offline replay | Implemented and verified | v1/v2/v3 replay and tamper tests. Digests establish consistency, not signed authenticity. |
| Baseten exact-model transport and structured candidates | Implemented and verified | HTTP fixtures test `meta-models/muse-spark-open-1026`, exact HTTPS endpoint, no redirects/tools/fallback, schema checks, budgets and redaction. This does not verify provider entitlement or genuine performance. |
| Genuine Meta authentication/inference | Blocked by external access | Replacement protected key is pending. Presence checks found neither inference key; zero genuine calls. Fresh explicit owner authorization is required even if a key appears. |
| Genuine model quality, latency and tokens | Blocked by external access | New dry-default matched suite is implemented and fixture-tested. No genuine measurements exist; fixture usage values are synthetic. |
| Model-directed experimental selection | Missing | The deterministic selector chooses tests; the model proposes competing causes. Do not claim the model optimizes the experiment policy or improves final numerical accuracy. This is outside the deadline scope. |
| Independent rejection of candidate support | Implemented and verified | Registered hypothesis IDs receive numerical support/contradiction states; assertions of confidence cannot override them. This is not a semantic verifier of every sentence in a rationale. |
| Deterministic thermal processing | Implemented and verified | Bounded calibrated arrays, median/MAD hot-pixel features, reproducible PNG/source hashes and integrity/replay tests. |
| Native model thermal interpretation | Partially implemented | Separately opted-in `image_url` PNG path is fixture-tested; actual event-model acceptance and interpretation are untested. Thermal/time alignment is not independently established. |
| Vibration ingestion, RMS and spectral peak | Implemented and verified | Bounded numerical arrays, sample-rate validation and known-frequency/RMS tests. It is numerical signal processing. |
| Native model audio | Missing | No real audio evidence/authorized endpoint test is available. Vibration in mm/s is not audio. Adding an unrelated audio path would jeopardize scope and evidence quality; limitation is explicit. |
| Smoke diagnostics and failure artifacts | Implemented and verified | New bounded attempt records retain valid returned identity, HTTP status, timing, usage and safe error codes. Malformed root envelopes now fail as controlled provider errors. No raw remote body, prompt, header or exception text is retained. |
| Matched evaluation implementation | Implemented and verified | Six fixed new-seed profiles, at most five model calls, equal four-test budgets, independent replay, case-level uncertainty, explicit failure/missing denominators, stop-on-first-failure. Fixture results are labeled and isolated. |
| Container release build | Implemented and verified | Audit found and fixed production type-checking depending on a docs-only test fixture. Production/test TypeScript configurations are now separate; CI checks both and builds/runs the actual image. |
| Public deployment boundaries | Implemented and verified | 32 HTTP checks against the local image and existing external Render origin, plus local non-root/credential-rejection tests. This is not a penetration test. |
| Candidate release to Render | Partially implemented | Image/configuration and rollback procedure are ready. The v4/final candidate has not been deployed. Exact-commit owner approval is required. |
| Public judge URL | Implemented and verified | `https://forge-judge.onrender.com/demo` and HTTPS readiness/public-boundary checks succeeded for the existing deployment. This does not prove its deployed Git SHA or candidate UI; owner must confirm the Render release. No uptime guarantee through November 18. |
| Public repository | Implemented and verified | GitHub reports PUBLIC. Main and live deployment branch remain unchanged; submit the reviewed branch/commit URL rather than imply main contains this work. |
| Exact competition eligibility, development window and form requirements | Implemented but insufficiently tested | Public official sources and prior research exist; the authenticated participant guide remains inaccessible here. Exact event ID, during-event and public-repository requirements are participant-confirmed. Public metadata shows a 17:00 UTC October 26 start while initial commits are 16:27/16:28 UTC; eligibility needs owner/organizer clarification, not a history rewrite. |
| Model licensing | Implemented but insufficiently tested | Official license retrieved, including Usage Policy and “Built with Muse Spark Open” attribution. Actual service usage/attribution and account terms require owner review before activation/submission. No redistributed model weights. |
| Three-minute script, recording fallback and submission fields | Implemented and verified | Current `DEMO_SCRIPT.md`, recording fallback and `SUBMISSION_PACKAGE.md`. Genuine-Meta segment remains gated on actual evidence. |
| Actual final video and submission | Missing | No final genuine-Meta recording or submitted form receipt exists. Never describe the submission as complete. |

## Highest-priority judging gaps

1. **Meta contribution (25%)**: secure replacement key, confirmed remaining card-free promotional balance and separate authorization for one smoke request. Then inspect actual identity/schema/replay before requesting a separately bounded comparison.
2. **Demonstration (25%)**: approve the exact candidate release, confirm the deployed commit, rehearse the genuine/recorded provenance segment and record the final video. Keep deterministic fallback visibly labeled.
3. **Technical execution (20%)**: container build, public restrictions, model failure handling, report integrity and regression checks are locally verified; CI now includes the actual image. Provider account behavior remains unverified.
4. **Real-world impact (30%)**: explain the industrial investigation use case while acknowledging that all experiments and evaluations are synthetic. No industrial accuracy, operational safety or causal guarantee is supported.

## Audit findings resolved in this branch

- Missing genuine-model matched evaluation: added a separate gated suite; no real run performed.
- Generic malformed-envelope exceptions: normalized to safe provider failures and tested.
- Sparse failed-smoke evidence: added bounded per-attempt timing/status/usage diagnostics without remote bodies or secrets.
- Stale authorization/alias/deployment checklist statements: replaced current owner-facing instructions; historical research remains marked historical.
- Production Docker build failure due to a test fixture outside the frontend context: separated test type-checking and added container CI validation.
- Live audit compression mismatch: explicitly request identity encoding while preserving the bounded no-compression response policy.

## Timing clarification follow-up

The owner explicitly classifies the prestart foundation as an **OPEN ELIGIBILITY QUESTION**, neither confirmed compliant nor disqualifying. Three original pre-cutoff commits (including repository boilerplate) and their complete 28-path snapshot are separated from nine later recorded commits and their dependent changes in [the timing review](ELIGIBILITY_TIMING_REVIEW.md). [The organizer request](ORGANIZER_CLARIFICATION_DRAFT.md) is drafted, not sent. No history/timestamps were changed and no speculative deletion or rebuild was performed. Conditional remediation will follow actual organizer instructions and owner approval.
