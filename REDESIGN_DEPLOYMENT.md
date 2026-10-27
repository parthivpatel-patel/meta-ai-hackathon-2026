# Safe Render release and rollback

The participant reports the live service at `https://forge-judge.onrender.com/demo`, running verified commit **5e2ad425b4a0f5781917020460f280f9b73c9179** from `deployment/judge-access`. The redesign is isolated on `feature/forge-product-redesign`; `main` and the deployment branch are unchanged. No Render API call, deploy hook or automatic live update has been invoked. The live hostname is proxy-blocked from this runtime; it has not been independently retested here.

## Review before approval

- Review `docs/PRODUCT_REDESIGN.md`, validation results and desktop/mobile before-and-after screenshots. Confirm the actual provider/model smoke separately when the protected key exists.
- Keep Render Free, current Docker build context and guarded image command. `render.yaml` still targets the existing stable deployment branch with auto-deploy off; pushing this development branch cannot silently promote it.
- Keep public mode, exact Render hostname validation, inference disabled/request budget0, no API/owner keys, ephemeral-storage notice and one worker. Fonts are bundled and served by the same app; no new runtime service, GPU or paid infrastructure is needed. Do not enable public inference as part of this UI release.
- Test a local image/private preview without touching the live service: build Dockerfile with frozen dependencies; managed cloud builds require the existing proxy CA secret/BUILDX_CONFIG instructions. Run with local-bound host port,512MiB limit, public mode and ephemeral notice. Use the existing security audit, redesigned browser runner and offline replay.
- External HTTPS verification of an actual preview requires its exact host in the network policy. A local Render-contract test does not prove external cold-start latency or service availability. Preserve anonymous judging access through November18, with the existing recorded/report fallback and no keep-alive tricks.

## Owner-approved promotion only

After tests, screenshots, security/budget review and real-model validation are complete, request/record explicit owner approval for the exact reviewed commit. Then the owner may select that commit/branch through Render's manual deploy controls; do not merge main. If a stable deployment branch must be advanced, do that only as an approved release action, not routine development. Confirm Free/no added disk or database and unchanged public secret policy before deployment.

After deploy: wait for `/api/v3/ready`, audit actual HTTPS origin, open `/demo` anonymously on desktop/mobile, run one fixed case and export/replay it, confirm blocked developer routes and source/storage labels. Record URL, commit, check time and screenshot evidence. Export any session evidence before deployment because SQLite may disappear.

## Rollback

If deployment or judging access fails, use Render's rollback/manual-deploy control to redeploy the known-good commit **5e2ad425b4a0f5781917020460f280f9b73c9179**. Restore the previous service branch/config without a force push or main change. Restore public/no-key settings and verify HTTPS/readiness and a fresh deterministic case. Prior SQLite sessions are not guaranteed to return; retain exported JSON/HTML and the recording independently. Never restore inference credentials into the public host to solve a UI issue.
