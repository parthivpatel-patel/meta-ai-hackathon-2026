# Investigation capture and resume repair

Review branch: `fix/forge-investigation-resume`, based on exact Phase 7 `4e40f41f6f5d777e664eb52b1ffc89a1d615baad`. The final handoff supplies the pushed fix SHA and exact CI result. No deployment, merge, genuine inference, paid resource or billing change is performed.

## Root cause

The original inspector's **Investigate selected component** button invokes `diagnose()` to create a **new** capture; it never resumes `report`. Its disable expression is `busy || replayed || !!preview || cursor < 319 || recipe.actions.length > 0 || !sensors.length`.

The reported bearing case is reproducible on the unchanged Phase 7 production image. The component is instrumented, the observed cursor is 319, the recipe has no manual actions, and one experiment already exists. Inspecting that experiment places its `after_frame` into `preview`. Consequently `!!preview` is true and the new-capture button is correctly disabled. Counterfactual outcomes cannot become a fresh observed acquisition. The misleading action name and missing inspector resume action made this legitimate restriction appear to block continuing the investigation. Existing top navigation and the proposed-experiment action were still available; no case reset was technically required.

## Resulting behavior

- **Resume existing investigation** appears in the component inspector whenever a report exists. It calls only `setTab("Investigation")`, remains enabled during counterfactual playback, incomplete observation windows, uninstrumented selections and pending work, and cannot send a capture/test request or change report data.
- The persistent journey action explicitly says **Resume investigation: review proposed experiment** or **Resume investigation: review verified findings**. Its existing destination remains unchanged.
- With no report, the inspector says **Capture selected component**. With a report, a separate **Capture new evidence** disclosure explains replacement/export consequences and contains **Capture new observation window**. Navigation no longer looks like recapture. An intentional successful new capture retains its established replacement semantics; it is not required to continue a case. A failed new capture preserves the current report.
- The counterfactual message explains that simulated experiment outcomes are not observed evidence. **Return to observed simulation** is beside that explanation in the inspector. It clears only transient `preview`; it does not reset the case, reload the recipe, recapture, change the cursor, execute a test or replace history.
- Capture becomes enabled on return only when all six original conditions permit it. Short windows, imported recordings, manual operating actions, missing instruments and busy work retain their guards.
- Checkpoint format and recovery implementation are unchanged. A restored report is independently reproduced before attachment. Recovery starts in observed playback because transient counterfactual preview was never persisted. The resume action is available immediately; legitimate capture guards still apply. Recovery reproduction recomputes existing synthetic history, not additional experiments or actual historical authenticity.

No backend runtime code, API schema, numerical verifier, report hash, model provenance or experiment authorization was changed. Repeated model-path tests use labeled offline transport fixtures only. Public inference stays disabled.

## Validation and evidence

See [validation.json](validation.json), [before and after screenshots](evidence/manifest.json) and raw transcripts in `evidence/checks/`. The new counterfactual resume regression fails on the exact baseline, then passes with the fix. All 278 backend tests and all 55 frontend tests pass; the frontend includes four new regression tests. Test TypeScript, Vite production build and restricted Docker/public-security checks pass. The existing Vite large-chunk advisory and backend Starlette/httpx deprecation remain.

The local production browser journeys use actual backend responses. They assert sample 319/bearing housing/one completed test/counterfactual state, disabled new capture, enabled resume, zero navigation/return mutation requests, unchanged report and trial data, restored report hash equality and successful continuation to two explicitly confirmed tests. They also check capture stays blocked at sequence 318 and navigation works after inspecting a different component. Recorded-fixture browser tests preserve proposal provenance, independent decisions, bounded repeated clicks, exports, tamper handling, accessible fallback and interrupted preparation behavior. Viewports/touch are emulated, not physical-device certification.

An interrupted multi-viewport browser runner stalled after writing desktop evidence. Its partial result is retained as interrupted evidence, not counted as a complete suite. The focused runner now uses one viewport per process and bounds its wait/teardown, with explicit progress logging. Final counts include only completed runs.

Reproduce unit/build checks:

```sh
cd backend
uv run --frozen pytest -q
cd ../frontend
npm ci
npm run check:tests
npm test
npm run build
```

The browser runner requires local production containers, Chromium and external Playwright/Axe tooling. It refuses a non-loopback base URL and blocks all off-origin application traffic. Run desktop/mobile separately against the local fix container (default port 8082):

```sh
NODE_PATH=/path/to/browser-tooling/node_modules FORGE_RESUME_WIDTH=1440 node scripts/investigation-resume-browser.cjs
NODE_PATH=/path/to/browser-tooling/node_modules FORGE_RESUME_WIDTH=390 node scripts/investigation-resume-browser.cjs
```

`FORGE_RESUME_MODE=before` and an unchanged Phase 7 container reproduce the original restriction; this mode is diagnostic and does not claim the baseline has the repair. Existing browser runners were updated only for the truthful capture labels and continue checking that counterfactual/imported evidence cannot acquire a capture oracle.

## Manual deployment after owner release approval

No deployment is performed or authorized by this review branch. Follow [RELEASE.md](RELEASE.md) using the **exact pushed fix SHA** from the final handoff. Existing browser storage and Render Free ephemeral-storage limits remain.
