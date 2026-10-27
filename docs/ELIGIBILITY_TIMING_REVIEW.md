# OPEN ELIGIBILITY QUESTION — development timing

**Neither confirmed compliant nor confirmed disqualifying. No organizer approval has been received.** The owner has reviewed public event pages and has not verified wording permitting or prohibiting pre-kickoff development or preexisting code in the authenticated guide. This document records the question transparently; it is not a ruling.

Public sources: [Meta event](https://dev.meta.ai/events/global-hackathon), [Cerebral Valley event](https://events.cerebralvalley.ai/e/meta-ai-developer-hackathon), and the independently retrieved [canonical event page](https://cerebralvalley.ai/e/meta-ai-developer-hackathon). The public schedule identifies October 26 as the start date; structured metadata lists `2026-10-26T17:00:00Z`. The applicable development/preparation rule is still unknown. See [source evidence](final-event-evidence.json).

## Original recorded history

| Commit | Author and committer time | Recorded scope |
| --- | --- | --- |
| `4f8c522b05ae3f64cb2871b8fe4601a9fe2e20e3` | October 26, 11:59:03 −04:00 (15:59:03 UTC) | Repository boilerplate: `.gitignore`, `LICENSE`, `README.md`. |
| `03977072227b9b1e16436d061bb9b0d7de959ac2` | October 26, 16:27:32 UTC | Initial Phase 0 backend, simulation/statistics, mock provider, dashboard, tests, locks, CI and documentation. |
| `e7f90e93570c06c685d526b4766b03cfa4f17629` | October 26, 16:28:43 UTC | Formatting/import-normalization checkpoint across 14 existing source/test/configuration files. The complete snapshot remains pre-17:00 for this timing review. |
| `6498e24cb2eedd702219fdb7e995f687ee56c2fd` | October 26, 17:04:32 UTC | First recorded post-cutoff engineering commit: blind investigations, independent verification and reports. |

Original objects, authorship/commit timestamps and ancestry are preserved. No rebase, amend, timestamp alteration or speculative removal/rebuild is part of this work. Commit clocks do not independently attest when work began, and the public UTC timestamp does not establish the authenticated eligibility rule.

## Prestart functionality and exact files

The prestart snapshot is `e7f90e93570c06c685d526b4766b03cfa4f17629` and contains **28 exact paths**. The [machine-readable inventory](eligibility-timing-inventory.json) retains every path, Git blob, per-commit change status and Python top-level definition.

| Functionality present before the published UTC start | Exact paths |
| --- | --- |
| Repository scaffolding and license | `.gitignore`, `LICENSE`, `README.md` |
| Basic GitHub Actions checks | `.github/workflows/ci.yml` |
| Architecture, security, evaluation and planning documents | `ARCHITECTURE.md`, `DEVELOPMENT_ROADMAP.md`, `EVALUATION_PLAN.md`, `HACKATHON_BUILD_LOG.md`, `SECURITY.md` |
| Seeded 120-row pump telemetry, operating state and normal/cooling-loss/imbalance/pressure-loss shifts | `backend/forge/simulation.py` |
| Per-channel descriptive statistics, robust MAD anomaly scores, missing values and numeric/order/baseline validation | `backend/forge/analysis.py` |
| Validated settings, mock candidate schemas/provider, disabled legacy Meta placeholder and timeout/retry wrapper | `backend/forge/config.py`, `backend/forge/providers.py` |
| FastAPI application, validated errors, request IDs/logging, health/model-status, synthetic demo, analysis and mock hypothesis endpoints | `backend/forge/main.py`, `backend/forge/__init__.py` |
| Python dependencies/lock and foundational numerical/API/configuration/security/provider tests | `backend/pyproject.toml`, `backend/uv.lock`, `backend/tests/test_forge.py` |
| React dashboard, selectable scenarios, three SVG signals, anomaly/evidence display, mock model status and timeline | `frontend/src/App.tsx`, `frontend/src/style.css`, `frontend/src/main.tsx`, `frontend/index.html` |
| Frontend component tests, dependency locks and TypeScript/Vite/Vitest setup | `frontend/src/App.test.tsx`, `frontend/src/test-setup.ts`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts` |

This is substantive application foundation, not just an empty repository. **Do not represent it as eligible for judging before authoritative clarification.** The formatting checkpoint's subject is not treated as proof that the underlying foundation is exempt.

## Work recorded after the public timestamp

The inventory separately lists nine recorded post-cutoff commits through the verified v4 baseline and the full path-level delta from the prestart snapshot. These introduced the Phase 1 blind-input/oracle/verifier/reporting modules; Phase 2 multimodal ingestion and gated HTTP transport; Phase 3 sequential tests, independent control verification, session leases/recovery and restricted public mode; deployment/smoke/audit tooling; and subsequent product experiences including v4.

Current final engineering changes add diagnostics, a separately gated model pilot, production build repair/container CI and release/submission evidence after those commits. Their original timestamps will be retained when committed.

**Timing separation is not a clean-room or eligibility claim.** Later components still depend on foundation code/contracts and later changes to those files. For example, the numerical engines use the measurement and analysis structures, application routing/configuration builds on the initial FastAPI app, and later UI/API workflows use the same simulation/provenance contracts. Poststart additions are not presumed independently eligible merely because they were committed later.

## Clarification request and evidence preservation

Use [the organizer draft](ORGANIZER_CLARIFICATION_DRAFT.md). It is prepared only and has not been sent. Obtain written guidance identifying the permitted development window, treatment of preexisting foundation/boilerplate and dependent later work. Preserve that guidance with the final submission evidence; do not claim approval before receiving it.

Continue unrelated engineering/testing without deleting or rebuilding the app on speculation. Keep the current history, verified v4 interface, main and deployment branch intact.

## Conditional remediation, only if the organizers prohibit relevant work

1. Retain the actual written instruction and identify its exact scope: preparation/boilerplate, functional foundation, dependent later modules, demonstrations and any permitted disclosure/remediation. Ask follow-up questions if ambiguous.
2. Map the prohibited scope onto the recorded 28 paths, subsequent modifications and dependent demos. Keep the original repository/history as evidence; renaming, re-dating, cherry-picking or changing branches does not establish a fresh eligible implementation.
3. Prepare the specific remedy the organizers authorize, with owner approval before code or deployment changes. Possibilities must come from their instructions, not assumptions: excluding particular demonstrations, allowing disclosed foundation, or a prescribed separate implementation may have very different effects.
4. If a separate implementation is actually required and permitted, preserve the original application and make a clearly labeled remediation branch/repository only after approval. Do not represent prior work as newly developed or guarantee that a rewrite cures eligibility. Reassess feasibility before October 30 without weakening security, model evidence or numerical correctness.
5. Re-run affected regressions and update the demo/submission to show only the confirmed allowed scope. If no compliant path is confirmed, report that outcome rather than submitting a misleading compliance claim.

**Current action:** await authoritative guidance. No speculative remediation has been executed.
