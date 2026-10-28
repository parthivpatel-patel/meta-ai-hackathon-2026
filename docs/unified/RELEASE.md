# Exact-candidate release and rollback — no deployment performed

Follow [the Phase 5 boundary](../meta-final/RELEASE.md). This work preserves its approved commit `51e188dcf7c23fcb11fd3d8a3b556b349eec01d9`, main and `deployment/judge-access`. Phase 6 is a separate review candidate on `feature/forge-unified-workstation`; its final SHA is supplied in the handoff. Do not deploy this branch merely because it exists.

## Current deployment evidence and limitation

The owner reports Phase 5 currently deployed at `https://forge-judge.onrender.com/demo`. This environment cannot independently verify the live artifact or current settings: its enforced outbound policy excludes Render and the public host; HTTPS attempts fail at the proxy with 403 before a site response. No Render account credential or connector is available here. Do not treat a network-policy failure as application downtime.

Read-only GitHub deployment metadata identifies service `srv-dbfuq6ec6qcc73dopsb0`. The newest retrieved successful record points to Render deploy `dep-dbgkrgnb9u1s738jad10`, marked successful October 27, 2026 at 9:21:21 PM America/New_York, with GitHub SHA `5e2ad425b4a0f5781917020460f280f9b73c9179` and configured ref `deployment/judge-access`. The earlier owner-reported `0107579414f20e46d3919fcffbaf979fcb5296a9` remains historical, not an assumed rollback. GitHub's linked-ref metadata alone cannot resolve the exact artifact currently live after an owner manual deployment. **Do not override the owner's Phase 5 report with an unverified inference from these records.** The dashboard's actual live deploy ID/artifact SHA must be recorded before any future deployment.

Useful read-only dashboard links:

- [Existing service](https://dashboard.render.com/web/srv-dbfuq6ec6qcc73dopsb0)
- [Newest deploy referenced by GitHub](https://dashboard.render.com/web/srv-dbfuq6ec6qcc73dopsb0/deploys/dep-dbgkrgnb9u1s738jad10)

## Future owner dashboard actions — only after exact-SHA release approval

1. Open **forge-judge → Events**. Open the deploy marked **Live**. Record its full artifact commit SHA, Render deploy ID/URL, timestamp and visible result. Retain this screenshot/record externally. Confirm whether the artifact really is Phase 5 `51e188d…`. Verify the saved deploy remains available for rollback. If identity or rollback availability cannot be established, stop.
2. Inspect **Settings** and **Environment**, without changing them. Confirm the existing service is Docker/Free, the repository and configured branch are unchanged, auto-deploy is already off, health path `/api/v3/ready`, no paid disk/database, public synthetic mode, `FORGE_PROVIDER=mock`, `FORGE_INFERENCE_ENABLED=false`, request budget0, ephemeral SQLite under `/tmp`, and no Baseten/inference/owner credentials, secret files or inherited credential-bearing environment groups. Check names/presence without revealing values. If any prerequisite differs, stop and obtain review of a concrete remediation; this instruction does not authorize changing it.
3. Export necessary investigation JSON/HTML and retain the recording outside the host. Preserve source SHA/deploy ID and reports independently of SQLite. Free spin-down, restart, deploy and rollback may lose sessions. Public availability through November18 is a target, not a guarantee.
4. Open **Manual Deploy → Deploy a specific commit**. Enter the **full reviewed Phase 6 SHA from the handoff**. Confirm that exact commit is accepted while the configured Git branch stays unchanged. Do not choose latest branch head, switch branch, merge or upgrade. Stop if this control is unavailable, the SHA is rejected, or the operation requires settings/resource changes. Read the confirmation before the final Deploy action; actual execution requires separate owner release approval.
5. Once the owner executes the separately approved deployment, verify the new **Live** event identifies the approved SHA. Externally check `/api/v3/ready`, `/api/v3/capabilities`, `/api/v5/model-status` and `/demo`, then complete the machine/capture/test/verification/report/replay and legacy/fallback journey. Confirm inference remains disabled and no private endpoint is public. A frontend screenshot or green health alone does not identify a Git SHA.

Render's official open-source [CLI](https://github.com/render-oss/cli/blob/b7907fc0240eb96fb5bbdfa9b4a66e6c9bcefe35/cmd/deploycreate.go) and [API schema](https://github.com/render-oss/sdk/blob/main/python/render/public_api/models/create_deploy_body.py) document a specific commit override without a branch-update parameter. That establishes the platform capability, not this account's dashboard availability or cross-branch commit acceptance. No deploying CLI/API operation was invoked. Render documentation/dashboard access remains blocked here; the owner must confirm the actual control accepts this candidate without changing the service branch.

## Verified rollback boundary / future owner procedure

No automatic rollback has been triggered or claimed tested against the account. The required reference is the **actual prior Live artifact recorded in step1**, not a guessed branch head or GitHub linked ref.

If future acceptance fails, open **forge-judge → Events**, select that saved known-good deploy, verify its full artifact SHA and choose **Rollback** if the account exposes this control and retains the artifact. Confirm the resulting Live identity and repeat external readiness, no-inference and core workflow checks. Do not roll back service configuration or provision resources implicitly. If the control/artifact is unavailable, stop: rebuilding a prior exact commit is a different operation and needs its own approval/availability check. Never substitute “Deploy latest commit.”

Rollback restores application code/artifact only; it does not restore lost SQLite sessions, browser state, provider settings or every environment change. This candidate adds no storage migration, infrastructure or settings change. The original Phase 5 artifact and export/replay contracts remain valid rollback references. No public HTTPS result, Free plan state or account-specific rollback operation is certified by local Docker tests.
