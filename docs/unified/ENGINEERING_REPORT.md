# Phase 6 engineering handoff

**GO FOR REVIEW of the bounded synthetic workstation candidate.** The feature branch is `feature/forge-unified-workstation`, directly based on verified Phase 5 `51e188dcf7c23fcb11fd3d8a3b556b349eec01d9`. The final response supplies its pushed SHA and exact GitHub Actions conclusion. No merge or deployment is implied.

## Implemented product

The detailed motor-driven centrifugal pump is now the primary workspace. The scene adds cooling rings/end caps, terminal housing/fan, shafts/coupling, bearing details, volute/impeller/seal, flanges/fasteners, pipe/valve fittings, supports and instrument mounts. Instancing and shared geometry/materials keep it bounded. The responsive viewport fits and centers the actual assembly, with hover/selection, orbit/zoom/focus, presets, transparent inspection, exploded view and camera reset. Rotation follows existing sampled RPM/time, with explicit missing/counterfactual/reduced-motion handling and no continuous render loop.

Machine, Telemetry, Investigation, Experiments, Verification and Reports share the selected component, cursor, capture, proposal source, experiment history and results. Evidence and Replay stay directly accessible. A next-action strip explains capture and explicit test confirmation. Experiment response inspection actually opens Machine mode. Before/after display readings are distinguished from the 96-replicate numerical verifier. The report preview retains source, uncertainty, provenance, limitations and existing JSON/HTML/offline replay contracts.

The original multimodal case library and compatible URL are retained. Machine and library states now survive switches in memory; the hidden machine pauses. Thermal imagery, vibration waveforms and equipment-record cases remain clearly separate evidence sources rather than invented modalities of the coupled pump. No numerical, provider, report or public-route contract was rebuilt. Two small backend lint cleanups preserve existing behavior.

Desktop controls/typography and the machine's first-viewport framing were refined from actual screenshots. Narrow screens prioritize inspection before configuration. The scene remains a procedural teaching illustration, not CAD or a calibrated twin. [Design details](DESIGN.md) and [the exact changed-file inventory](changed-files.json) identify the implementation.

## Executed validation

| Check | Actual result |
| --- | --- |
| Backend unit/API/configuration/security regressions |265 passed; existing Starlette/httpx deprecation warning retained |
| Frontend component regressions |43 passed, including four added state/navigation/consent/failure tests |
| TypeScript tests and production / Vite |Passed; existing large lazy-chunk advisory retained |
| Ruff |Configured all-source pass and pinned explicit CI profile pass; exploratory legacy style findings disclosed in review |
| Preserved numerical panel |1,061 synthetic cases:480 +280 +280 +21 |
| Additional model fixture comparisons |7/7 matched independent decisions; zero genuine requests |
| Actual production browser flows |3 unified journeys,7 machine scenarios,7 retained library cases,2 recorded-fixture journeys, lifecycle/recovery and all-width checks |
| Automated accessibility |152 view/viewport checks, zero Axe violations; five performance-only samples excluded |
| Portable report verification |23 JSON reports replayed;18 current-template HTML downloads exactly regenerated |
| Production Docker/security |Final build, matching source/assets, UID 10001,32 HTTP boundary checks, credential-bearing public startup refused; additional inference/developer endpoints forbidden |
| Dependencies / credential review |Zero known dependency findings; bounded changed-source/bundle/evidence/own-log scan has zero matches |

The final image is `sha256:f2beb2738b59a12f9bcbfc1ed288791779005329e36140a1b9af9cb56895011e`. All final browser groups use that image. Source/hash maps, transcripts, numerical outputs,152-view counts and 153 unedited screenshots are preserved in [evidence](evidence/README.md), [validation.json](validation.json) and [the screenshot inventory](screenshots.json). No tests were fabricated. Reproduction and scope are in [VALIDATION.md](VALIDATION.md).

The coupled 21-case evaluation retains accepted exact 15/15 with coverage 15/21, all-finding precision 18/18, exact agreement 18/21, six inconclusive results and replay 21/21. The preserved sequential 280-case panel retains accepted exact 198/198, answerable recall 198/220, coverage 198/280, required abstention 60/60, detector false negatives 39/260 and false positives 0/20. These selective synthetic results are not physical-field accuracy or genuine Meta quality.

## Performance and adversarial review

Actual warm local controls readiness was 1,001–1,583 ms across the three unified contexts; median 1,047 ms. Six unified experiment UI observations had median 150 ms, maximum 197 ms. Thirty component-to-inspector observations had median 21.5 ms, maximum 52 ms. The scene reports 57 draw calls and 19,138 triangles. Software camera-step cadence was substantially slower than hardware presentation expectations: median 156.2 ms over 60 steps, with observed telemetry updates at about 1,289 ms and 2,431 ms. The 500 ms playback timer is not a real-time acquisition guarantee. Physical-GPU/mobile performance remains unverified; no hardware FPS claim is made.

A timing assertion missed updates under concurrent software-browser load; its original assertion passed in the isolated final rerun. The failure and final measurements are retained rather than discarded. Paused rendering is asserted idle; hidden rendering/playback is bounded. GC-assisted heap rose from 6,611,920 to 8,114,304 bytes across retained-workspace/context/fallback exercises; that is not proof of no leaks.

The [separate same-agent critical pass](REVIEW.md) resolved high-severity state-loss and hidden-response navigation findings, plus framing, label-size and responsive-camera issues. It is not an external independent audit. No unresolved critical/high issue was found within the reviewed scope.

## Release, cost and owner gates

**Genuine Meta inference: none. Deployment: none. Merge: none. Paid resources: none.** No Baseten/owner credential is shipped, exposed or added to a service. Public inference remains disabled; the unchanged Phase 5 private activation workflow requires separate authorization and verified card-free/credit/enforced-limit prerequisites. A prior discussion of approval does not authorize Phase 6 to execute it.

Main, the existing deployment branch and the Phase 5 branch are preserved; the final remote-ref check is reported in the handoff. Only this feature branch is pushed. The existing Free Docker/FastAPI/React architecture and ephemeral SQLite remain compatible; no infrastructure, migration or settings change was made.

The owner reports Phase 5 live. Network policy prevents independent HTTPS/dashboard verification here, and GitHub's linked deploy ref cannot settle the exact current manual artifact. [Release instructions](RELEASE.md) require the owner to record the actual Live ID/SHA and rollback availability before separately approving any exact-SHA deployment. No public-host uptime, card-free account state or rollback execution is certified by local tests.

Remaining owner/external work: review the candidate and physical-device rendering; separately activate and evaluate genuine Meta evidence if authorized; resolve the **OPEN pre-kickoff eligibility question** using authoritative guidance without altering history; record the final video; verify actual Render identity/settings/rollback; and inspect authenticated submission rules/form. [The 90-second/three-minute scripts and recorded fallback](DEMO.md) reflect the real product. The internal target remains October 30,2026; public availability through November 18 remains a target, not a Free-host guarantee.
