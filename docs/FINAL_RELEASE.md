# Final engineering release procedure

## Release candidate and immutable review

Use `feature/forge-final-engineering`, derived from FORGE 4.0 `f5512c05c187733d1a69af86b399bc33175d6d5e`. Resolve and record the exact reviewed SHA from the final report/remote ref. Approval applies to that SHA, not an unreviewed future branch head. Main and `deployment/judge-access` remain unchanged. No Render deploy hook/API/manual deployment was invoked.

Current external origin: **https://forge-judge.onrender.com/demo**. Readiness and all 32 read-only public-boundary checks succeeded on October 27; `final-live-check.json` and `final-live-audit.json` retain the evidence. The audit now explicitly requests identity encoding while continuing to refuse compressed/unbounded responses. Those checks verify the existing deployment's HTTP behavior, not its Git commit or the final candidate UI. The owner must confirm the actual deployed SHA in Render.

## Verified build and security gate

1. Install frozen backend/npm dependencies and run backend tests, frontend component tests, `npm run check:tests` and production build. The new `tsconfig.tests.json` preserves test type-checking while production TypeScript excludes test-only fixtures. This fixes the previously undiscovered Docker build failure; it does not remove tests from CI.
2. Build the real Dockerfile. Managed cloud builds require the existing proxy CA secret and explicit local Docker socket; follow the cloud runtime instructions with TLS verification enabled. Keep registry credentials unchanged. No credentials or session CA are copied into image layers.
3. Run the image with a non-root user, read-only root filesystem, a bounded `/tmp` tmpfs, dropped capabilities, no new privileges, one CPU/512 MiB, loopback-only host port and a `/tmp` SQLite path. Public mode, inference disabled, request budget zero and no owner/provider keys must remain in effect.
4. Run `python scripts/check-container.py <local-container> --image <local-image>` to verify bounded readiness, 32 public HTTP checks, non-root configuration and rejection of credential-bearing public startup. This is local validation, not a public preview or penetration test. CI now builds/runs this real image on every branch check.
5. Run the current public browser workflow against that image. Use `FORGE_EVIDENCE_DIR=/tmp/forge-final-browser` to keep validation captures separate from the frozen design review. Desktop/mobile sequential tests, all five viewport sizes, exports/replay and explicit insufficient-evidence states must pass.

## Owner-approved promotion only

Genuine model/account/eligibility checks are separate submission gates. The owner can review a credential-free deterministic UI release independently; it must remain explicitly labeled and does not satisfy the eligible-model requirement. Public Render must never receive the inference key even after a genuine smoke succeeds.

- Export any evidence needed from the existing host. Free-host SQLite and 24-hour application retention do not provide durable archival storage.
- Confirm Render **Free**, auto-deploy **off**, no paid disk/database, and the exact public hostname. Keep `FORGE_DEMO_MODE=public`, disabled inference and request budget0. Preserve all existing security/body/rate/capacity limits.
- After explicit approval, use Render's manual deploy controls for the exact approved candidate commit. If selecting the final engineering branch is necessary, do so only as the approved release action and keep auto-deploy off. Do not merge main or advance `deployment/judge-access` as part of routine engineering.
- Record the deployed SHA shown by Render. Recheck actual external HTTPS readiness and run the read-only audit. Then anonymously rehearse a complete case, each stage, mobile navigation, downloads and offline replay. Confirm no active real-inference control or developer-mode API is exposed.
- Keep the final video, reports, commit and validation evidence outside the ephemeral host. Check access again before submission and retain the service/fallback through November 18. Free-tier cold starts and interruptions remain possible; no unsupported keep-alive technique or uptime guarantee is part of this plan.

## Rollback

If any release check fails, manually redeploy known-good **5e2ad425b4a0f5781917020460f280f9b73c9179** and restore the previous service branch/settings with auto-deploy off. Recheck readiness, restricted public capabilities, an anonymous deterministic case and exports. Do not force-push either preserved branch. Prior SQLite sessions may not return; use previously exported records and the recording fallback. Never add provider credentials to the public host to repair a release.
