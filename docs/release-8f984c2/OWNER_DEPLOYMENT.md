# Owner deployment guide — exact candidate 8f984c2

**Review candidate:** `8f984c2b1ce27ba2fcd638b9f4089fa0ff7ccafd` on `feature/forge-final-engineering`.

**Known rollback:** `5e2ad425b4a0f5781917020460f280f9b73c9179`.

**Existing service:** `forge-judge`; URL **https://forge-judge.onrender.com/demo**.

This is preparation, not deployment approval. No live service, setting, plan, environment variable, branch or deploy hook was changed. The separate `feature/forge-release-preparation` branch contains validation documents/screenshots only and is **not a replacement application release candidate**. Do not deploy its head instead of the exact candidate above. Main and `deployment/judge-access` stay unchanged.

## What is verified, and what the owner must inspect

The public website cannot reveal the Render account's full configuration. No authenticated Render access is configured in this environment. Public HTTPS checks verify behavior, not billing, absence of every environment secret, auto-deploy settings or the actual deployed SHA. Never share environment values or credential panels in chat/screenshots.

| Item | Required configuration | Evidence / owner check still needed |
| --- | --- | --- |
| Service and hostname | Existing `forge-judge`, `forge-judge.onrender.com` | Existing external HTTPS readiness succeeds. Confirm service identity in dashboard. |
| Current deployed commit | Record exact live SHA before release | Not independently observable through public API. `5e2ad425…` is the preserved known-working rollback, not an attested current live SHA. |
| Runtime | Git-repository Docker build | Dockerfile built locally; dashboard service source/runtime must be checked. A prebuilt-image service has different controls. |
| Repository | `parthivpatel-patel/meta-ai-hackathon-2026` | Confirm linked repository. No new service or repository connection is required by this procedure. |
| Plan | **Free** | Repository blueprint says free; dashboard/account billing not independently verified. Do not upgrade or add payment information. |
| Auto-Deploy | **Off** | Repository blueprint says off; verify actual setting. Do not enable it. |
| Docker paths | Root directory unset/repository root, Dockerfile `./Dockerfile`, context `.` | Candidate Dockerfile expects both backend/frontend under repository root. Do not run a backend-only build. |
| Start command | Docker default, `python -m forge.submission.serve` through image venv | No override to `uvicorn forge.main:app`, developer server, multiple workers or private-mode launcher. |
| Health check | `/api/v3/ready` | Readiness tests passed. Check dashboard value. |
| Public settings | Values in the next section | Public capabilities report restricted mode/no real inference. Dashboard must confirm actual values and absence of provider/owner credentials. |
| Storage | Ephemeral SQLite, no paid disk/database | Public API reports ephemeral SQLite. Dashboard disks/resources must be checked; sessions can disappear on spin-down, restart or redeploy. |
| External services | No added paid database, disk, queue, inference or monitoring | None added by this work; owner verifies account resources. |
| Branch | Preserve existing branch if specific-commit deployment works | Candidate `render.yaml` still says `deployment/judge-access`; it was intentionally not rewritten. It is a historical blueprint, **not an instruction to resync/recreate this service**. |

The image runs as UID 10001. Local validation additionally used a read-only root, 64 MiB tmpfs, 512 MiB/one CPU, dropped capabilities and no-new-privileges. These are **local test restrictions**, not claims about Render's internal container settings. Render manages runtime isolation; this dashboard guide does not assume its UI exposes arbitrary `docker run` flags. Do not switch infrastructure to imitate local flags.

Do not apply `render.yaml` as a new Blueprint or resync settings during this release. It selects the old deployment branch. A manual exact-commit build of the existing service uses its actual service settings; the YAML does not silently promote the final engineering branch.

## Required public environment — inspect, do not change yet

| Variable | Required value |
| --- | --- |
| `FORGE_DEMO_MODE` | `public` |
| `FORGE_PROVIDER` | `mock` |
| `FORGE_INFERENCE_ENABLED` | `false` |
| `FORGE_INFERENCE_REQUEST_BUDGET` | `0` |
| `FORGE_DEMO_STORAGE_EPHEMERAL` | `true` |
| `FORGE_DEMO_DB_PATH` | `/tmp/forge-data/investigations.sqlite3` |
| `OPENBLAS_NUM_THREADS`, `OMP_NUM_THREADS`, `MKL_NUM_THREADS` | `1` each |

`BASETEN_API_KEY`, `FORGE_INFERENCE_API_KEY`, `FORGE_DEMO_ACCESS_TOKEN` and any other provider/owner credential must be **absent**, including shared environment groups/secret files. Do not reveal or copy their values. Preserve existing safe request/body/response/session/retention limits. Do not increase them to bypass a failed rehearsal. Keep Render's managed `PORT` and platform variables. The launcher configures exact allowed hosts from `RENDER_EXTERNAL_HOSTNAME` when no override is supplied; a custom allow-list must include the actual hostname and loopback, never `*`.

If any setting differs, **stop before saving anything**. Record the setting name and expected/observed nonsecret state. Request approval for that specific correction; changing an environment variable or branch can trigger a redeploy. A candidate-only approval is not permission for an unspecified configuration change.

## Before asking for release approval

1. Open **https://dashboard.render.com/** in your own signed-in browser. On a phone, open the browser menu and enable **Desktop site** if the settings or deploy menu is hidden. Select your workspace, then the existing **forge-judge** service. Do not select **New**, create a service, add a database or choose a paid instance.
2. Open **Deploys** (or the service's deploy/event history). Find the currently live successful deploy, open it, and record its full Git SHA, deploy ID and time. Confirm that the known-working rollback SHA is available in history; do not assume it is the current deployment.
3. Inspect **Settings**, **Environment**, attached environment groups and storage/resource settings against the tables above. Do not click a save/apply/deploy button. Check the workspace's included build minutes, bandwidth and free instance-hour balance. Stop at any payment/upgrade prompt or exhausted allowance; do not authorize overages.
4. Preserve evidence before restart: open any completed investigation in its original browser, navigate to **Report**, download **verification record (JSON)** and **readable report (HTML)** to a durable phone/computer folder. Check that the files exist and are nonempty. Copy them to a second owner-controlled location if important. Record which commit and session they came from. Do not export a live database or rely on screenshots alone.
5. Have a technical helper run offline replay for each JSON: from the repository's `backend` folder, `uv run --frozen python -m forge.phase3.replay /path/to/report.json`. Keep the successful output with the report. Replay requires no provider key and sends no model request.
6. Record or retain the three-minute demonstration and its reports independently of Render. If sessions are already lost, start a new synthetic investigation and export it; do not pretend it is the previous session.
7. Review the test/visual evidence in this folder and approve **the full candidate SHA**, with no service-setting changes unless individually named. Example: “I approve deploying `8f984c2b1ce27ba2fcd638b9f4089fa0ff7ccafd` to the existing Free forge-judge service using its specific-commit control, keeping auto-deploy off, public mode, disabled inference, zero budget and no credentials.” This is example wording, not approval already granted.

## After explicit approval only — deploy the exact commit

Render's public [deploy documentation](https://render.com/docs/deploys) currently documents **Deploys → Manual Deploy → Deploy a specific commit** for a Git-linked service. It accepts a commit from the linked repository, including a pasted SHA, and disables auto-deploys. This is documented support, not a guarantee that every service/source/account exposes the same control.

1. Reopen the existing service's **Deploys** page. Confirm the approved service/hostname and auto-deploy **Off**.
2. Open **Manual Deploy** and choose **Deploy a specific commit**. Paste **`8f984c2b1ce27ba2fcd638b9f4089fa0ff7ccafd`**. Confirm the linked repository and full matching SHA in the dialog. Recent-commit lists may omit a commit from another branch; use the SHA field if present.
3. **Stop if the option is missing or the SHA cannot be resolved.** Do not choose **Deploy latest commit** while the service is linked to `deployment/judge-access`, because that deploys the older branch head. Do not deploy the documentation branch, change service type, use a deploy hook, create a paid service or change branches to make the button work.
4. If specific-commit deployment is unavailable, the supported fallback is a **separately reviewed branch-setting change** to `feature/forge-final-engineering`, with auto-deploy off and its remote HEAD still exactly equal to the approved SHA. Ask for explicit approval for that change and any automatic deploy it might trigger before saving. If the branch has advanced, stop and review the new SHA. Do not force-push, reset a branch, merge main, or modify `deployment/judge-access`. A prebuilt-image service requires a separately reviewed image/digest workflow; this guide does not authorize converting it.
5. If the exact-commit dialog matches the approval, click **Deploy Commit** once. This is the production mutation boundary. Wait for the result instead of repeatedly clicking deploy. Do not clear caches or make settings changes unless a diagnosed failure and separate approval require them.
6. Open the new deploy in **Deploys**. Check the commit link and full SHA. Read its build/deploy log: frontend `npm run build` must succeed, Python frozen dependencies must install, and the application must start successfully. Do not post logs without removing any unexpected credentials. A secret appearing is a security incident, not something to screenshot publicly.
7. The service must show the new deploy **Live/successful**, not merely “build succeeded”. Confirm the health check and **Auto-Deploy Off**. A failed build may leave the previous deploy serving; a working URL alone does not prove the candidate is deployed.
8. Run the acceptance checklist below immediately. Preserve the deploy ID/full SHA, check time, result and report exports. If it fails, use the rollback procedure. Do not activate inference to repair a deterministic demo.

## Post-deployment acceptance — not executed for this candidate yet

Fill in `post-deploy-record.json` only after approved deployment. Keep candidate tests distinct from actual external acceptance.

- [ ] Render deploy ID, full SHA exactly matching candidate, UTC and Eastern check time recorded; owner confirms **Live** status.
- [ ] `https://forge-judge.onrender.com/api/v3/ready` returns ready, storage and frontend bundle true; HTTPS certificate valid.
- [ ] In a private/incognito browser with no login, `/demo` opens. If cold, wait for the normal Render startup; do not install keep-alive traffic. Record time to access and any failures.
- [ ] Case selection works and every stage opens: **Overview, Evidence, Possible causes, Tests, Results, Report**.
- [ ] Complete a fresh synthetic investigation: prepare causes, review the diagnostic test, run sequential tests and inspect independent findings/uncertainty. Labels remain synthetic and deterministic.
- [ ] In **Evidence → Equipment record**, inspect the geometry, rotate and zoom, select Motor/Bearing/Pump, inspect actual sensor values, evidence/provenance, numerical tests and verification state. Confirm the illustrative/not-digital-twin text.
- [ ] On desktop, use Tab/arrow keys/sliders/buttons. On a phone, use touch controls, stage selector and report download. Check 320, 375, 390 and 430px layouts with browser emulation as well as an actual phone if available.
- [ ] Export JSON and HTML. Confirm file downloads and offline JSON replay. Save artifacts outside Render.
- [ ] Real Meta inference is unavailable to anonymous users. `/api/v3/capabilities` reports public restricted mode, `real_inference_permitted: false`, no uploads and no physical-causality claim.
- [ ] A technical helper runs, from `backend`: `uv run --frozen python -m forge.submission.audit --url https://forge-judge.onrender.com > /durable/path/public-audit.json`. Require all 32 checks pass. A timeout is a failed attempt; allow ordinary startup, then one bounded diagnostic retry and retain both results. Do not extend this into continuous polling.
- [ ] Developer docs/API paths are denied, security headers present, no public key/provider/owner credentials in dashboard groups/files or published assets, and zero public inference budget retained.
- [ ] Final screenshot/video, reports/replay, exact deployed SHA and acceptance evidence retained outside ephemeral storage.

A passing public audit is not a penetration test or proof that every server variable is absent. The owner dashboard review complements the fail-closed launcher and runtime behavior.

## Rollback after an approved release if acceptance fails

1. In **forge-judge → Deploys**, find the successful deploy whose SHA is **`5e2ad425b4a0f5781917020460f280f9b73c9179`**. Open it and verify the exact SHA. Do not select a similarly named or merely recent deploy.
2. If its retained artifact is available, select **Rollback**, review the confirmation, then **Rollback to this deploy**. Render documents artifact reuse; old artifacts might no longer be available. Treat this as part of the owner-approved release/rollback plan, not an authorization already given to this agent.
3. If Rollback is unavailable, use **Manual Deploy → Deploy a specific commit**, paste the full rollback SHA and verify it before deploying. This rebuilds and may fail if registry/network/dependencies are unavailable. Do not pay to overcome a quota/build problem.
4. Check **Live** status and actual rollback SHA, HTTPS readiness, all 32 boundary checks, an anonymous deterministic investigation and downloads/replay. Keep auto-deploy off and all public/no-key settings. No Git history or protected branch changes are needed.
5. Render rollback does not roll back every service setting: retained artifact/start/health configuration and deploy environment may be reused, while compute plan/domains/current environment-group values have separate behavior. Review public mode, disabled inference, zero budget and credential absence after rollback. A normal future deploy uses the service's current settings again. Restore any separately approved setting change explicitly; do not assume a rollback resets all settings.
6. SQLite sessions may be gone. Use pre-exported reports and the recorded-demo fallback. Record the failed release and rollback IDs/times/results. Stop further deployment attempts until the failure is understood.

## Free-tier and submission limits

[Render Free documentation](https://render.com/docs/free) states a service spins down after 15 idle minutes, may take about a minute to wake, and loses local files on spin-down, restart or redeploy. Workspace-wide free instance hours (750/month), build minutes and bandwidth are finite. A single service's theoretical hourly fit does not prove account quota or guarantee availability. No paid disk/database, keep-alive trick or guaranteed uptime through November 18 is part of this release.

The replacement Baseten key remains pending. Genuine inference has not run and must remain absent from Render. Eligible-model activation and the open development-window question are separate submission blockers, not reasons to change this credential-free demo. No organizer/provider was contacted. A deployable deterministic application does not by itself satisfy the Meta model requirement, resolve eligibility, complete the video or submit the project.

**Recommendation:** the tested application is ready for owner approval of the exact-commit deterministic release, subject to owner confirmation of the dashboard configuration/allowances above. This recommendation is not permission to deploy and is not a production-readiness or competition-eligibility certification.
