# Exact-candidate release review

**Application candidate:** `8f984c2b1ce27ba2fcd638b9f4089fa0ff7ccafd`, branch `feature/forge-final-engineering`.

**Evidence branch:** `feature/forge-release-preparation`. This branch adds only this release-review folder. It is not a new application candidate. No application fixes were needed. No production deployment, setting change, provider request or organizer/provider contact was performed.

Start with the [owner deployment and rollback guide](OWNER_DEPLOYMENT.md). [Post-deployment acceptance](post-deploy-record.json) is an unfilled template; it must remain distinct from local validation and observations of the previous live service.

## Verification evidence

- [Validation summary](validation.json): 203 backend tests, 22 frontend tests, TypeScript checks/build, actual Docker build, desktop/mobile workflows and exported-report replay.
- [Backend test output](backend-tests.txt): all 203 passed, one existing TestClient deprecation warning.
- [Container audit](container-audit.json): UID 10001, 32 HTTP checks, no-key public launcher protection. Read-only root, 64 MiB tmpfs, one CPU/512 MiB, dropped capabilities and no-new-privileges verified locally. These are not assertions about Render's host runtime flags.
- [Safe local configuration observations](local-security-settings.json): effective public/disabled/zero values, no provider/owner credentials, retained rate/session limits. Presence booleans only, no secrets.
- [Browser observations](browser-checks.json): 66 Axe view checks, zero violations, desktop 1440px and mobile 320/375/390/430px; five bounded resource samples are separate from accessibility check counts. WebGL was disabled in the supplemental harness.
- [Touch observations](touch-checks.json): emulated phone taps on rotation, zoom and component selection at 320 and 390px. No physical phone was tested by the agent.
- [Desktop JSON export](desktop-report.json) and [mobile JSON export](mobile-390-report.json): downloaded from actual completed browser investigations and replayed offline. HTML downloads and scope text passed browser checks; the ephemeral HTML download files were not retained. Repeated synthetic recipes can produce identical reproducible run IDs.
- [Initial external audit](existing-live-audit-first.json), [one bounded retry](existing-live-audit-retry.json) and [public observations](existing-live-observations.json): initial probe did not complete within its bound; subsequent HTTPS readiness/capabilities and all 32 boundary checks passed. This is the **existing deployment**, not a deployed candidate or uptime promise. The initial failure cannot prove whether the cause was cold start or transient transport.
- [Official Render source checks](render-source-check.json): documentation fetched over HTTPS on October 27, 2026. The owner guide links the deploy, rollback and Free documents. HTTP success does not authenticate the owner's actual service settings.
- [Candidate CI](https://github.com/parthivpatel-patel/meta-ai-hackathon-2026/actions/runs/40550356064): all three jobs passed for the exact SHA.

## Visual review

All ten desktop views below were visually inspected, plus the 320px and 390px selected-equipment views. Text remained readable, the page retained the minimal guided structure, and no horizontal overflow or blocking layout defect was found. The equipment inspector is intentionally schematic and its full provenance can require substantial scrolling on a phone. That is a known usability limit, not a reason for another redesign. Automated accessibility passing is not full assistive-technology certification.

| View | Screenshot |
| --- | --- |
| Case selection | [Desktop](screenshots/desktop-choose.png) |
| Overview | [Desktop](screenshots/desktop-overview.png) |
| Evidence | [Desktop](screenshots/desktop-evidence.png) |
| Possible causes | [Desktop](screenshots/desktop-possible-causes.png) |
| Proposed diagnostic test | [Desktop](screenshots/desktop-test-proposal.png) |
| Completed tests | [Desktop](screenshots/desktop-tests.png) |
| Independent verification/results | [Desktop](screenshots/desktop-results.png) |
| Reports | [Desktop](screenshots/desktop-report.png) |
| Initial equipment view | [Desktop](screenshots/desktop-equipment-initial.png) |
| Selected component and sensor | [Desktop](screenshots/desktop-equipment-selected.png) |
| Mobile equipment | [320px](screenshots/mobile-320-equipment.png), [375px](screenshots/mobile-375-equipment.png), [390px](screenshots/mobile-390-equipment.png), [430px](screenshots/mobile-430-equipment.png) |
| Touch-emulated equipment | [320px](screenshots/mobile-320-touch.png), [390px](screenshots/mobile-390-touch.png) |

[SHA-256 screenshot manifest](screenshot-manifest.json) covers the 16 unedited captures. Screenshots represent the local candidate, not the existing Render UI.

## Reproducing the review

From the repository root, verify the candidate SHA and clean application paths, install frozen backend/npm dependencies, then run:

```sh
cd backend
uv run --frozen pytest -q
cd ../frontend
npm run check:tests
npm test
npm run build
cd ..
docker build -t forge:release-8f984c2 .
docker run -d --name forge-release-8f984c2 -p 127.0.0.1:8032:7860 \
  --read-only --tmpfs /tmp:rw,nosuid,nodev,size=64m --memory=512m --cpus=1 \
  --cap-drop=ALL --security-opt=no-new-privileges \
  -e FORGE_DEMO_DB_PATH=/tmp/forge-data/investigations.sqlite3 \
  -e FORGE_DEMO_STORAGE_EPHEMERAL=true \
  -e OPENBLAS_NUM_THREADS=1 -e OMP_NUM_THREADS=1 -e MKL_NUM_THREADS=1 \
  forge:release-8f984c2
python scripts/check-container.py forge-release-8f984c2 --image forge:release-8f984c2
```

Those Docker commands use a conventional local daemon. In the managed cloud, follow the cloud runtime skill's explicit local-socket selectors and proxy CA BuildKit secret; do not change registry credentials or bypass TLS. The release's build used cache and the same Dockerfile image ID recorded in `validation.json`; it was not a claim of byte-reproducible unpinned base images.

Optional Playwright and `@axe-core/playwright` are external development tooling, not new application dependencies. Set `NODE_PATH` to their installation, use `/usr/bin/chromium` or the documented executable override, then:

```sh
FORGE_DEMO_URL=http://127.0.0.1:8032 FORGE_EVIDENCE_DIR=/tmp/forge-release-browser \
  node docs/release-8f984c2/browser-validation.cjs
node docs/release-8f984c2/touch-validation.cjs
cd backend
uv run --frozen python -m forge.phase3.replay ../docs/release-8f984c2/desktop-report.json
uv run --frozen python -m forge.phase3.replay ../docs/release-8f984c2/mobile-390-report.json
```

The supplemental browser harness reads the candidate's existing runner and inserts bounded zoom/WebGL/selection assertions; it does not alter application source or relax limits. It retains the runner's one-minute pause between full journeys to respect rate limits. The touch harness uses loopback port 8032 only. Use a fresh **local** container for another full run; do not replace this with public keep-alive traffic. Browser JSON outputs are written under `/tmp` by the original runner and copied into this evidence folder after success. Rerunning captures overwrites local evidence files; commit hashes and manifests identify the reviewed copy.

## Decision and outstanding owner checks

No release-blocking application defect was reproduced. The deterministic/no-key candidate is ready for owner review and approval. The owner must first inspect dashboard Free/quota/source/auto-deploy/environment settings, record the actual current deployed SHA and preserve any required reports. If settings differ, approve specific corrections separately before changing them. Missing specific-commit controls require a separately approved fallback; never substitute latest/another branch head silently.

No genuine model metrics were created. Baseten access and the development-window eligibility question remain unresolved submission gates; original history and eligibility documents were preserved. The candidate is not deployed, the final video is not completed by this review, and no submission was made.

READY FOR OWNER APPROVAL.
