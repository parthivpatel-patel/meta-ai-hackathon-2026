# Exact-candidate release boundary

Candidate branch `feature/forge-meta-final-integration`, based on exact `0a26fea0d7336607c1fb70aa56be0642dab0e1df`. The final handoff supplies its exact pushed SHA. This work does not merge, deploy, change production settings or submit. Main `4f8c522b05ae3f64cb2871b8fe4601a9fe2e20e3` and `deployment/judge-access` `5e2ad425b4a0f5781917020460f280f9b73c9179` remain protected references.

The existing single-service Render Free architecture is preserved: non-root FastAPI plus compiled React assets, no provider/owner keys, inference disabled/zero public budget, restricted routes, read-only root and bounded resources. New v5 routes cannot call models even when replaying a claimed real response. No new paid infrastructure is required. SQLite and browser playback are not durable storage guarantees.

Only after explicit owner approval of the reviewed exact SHA:

1. Inspect actual live deploy identity/settings without changing them. Confirm Free, auto-deploy off, public mode, no provider/owner credentials, disabled inference and zero request budget; no paid disk/database. Stop if these prerequisites differ.
2. Export required reports and retain the recording outside the service. A deployment/rollback may lose SQLite sessions.
3. Use the supported **Manual Deploy → Deploy a specific commit** control for the existing service, if available. Verify the approved full SHA. Do not substitute latest branch head, switch service branches or upgrade resources without separate approval.
4. Verify actual live SHA and external HTTPS: readiness, anonymous machine and legacy library, component/rotor/fallback behavior, deterministic and recorded-fixture source labels, explicit experiments, exports/replay and public no-inference boundaries. Local Docker success is not HTTPS deployment evidence.
5. If acceptance fails, select the actual known-good prior deploy from the service's history after confirming its artifact/SHA. The owner previously reported `0107579414f20e46d3919fcffbaf979fcb5296a9` live; verify this rather than assuming it. Preserve code review baseline `0a26fea…` and older `5e2ad425…` as references. Code rollback does not restore every setting or lost SQLite state. Do not rewrite Git history.

Recommendation is GO FOR REVIEW of the bounded synthetic/fixture candidate only when final tests/audit pass. Genuine Meta submission, external industrial qualification and deployment remain separate gates. Public judge access through November 18 is a target, not a free-host uptime guarantee.
