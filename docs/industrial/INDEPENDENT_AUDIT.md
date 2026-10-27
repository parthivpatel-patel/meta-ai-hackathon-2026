# Adversarial acceptance audit

This is a separate adversarial pass by the same engineering agent, not an independent third-party industrial audit. Evidence comes from tests, generated records, actual browser interactions and source review.

Review axes: coupled pressure/flow/thermal/vibration behavior; observation-versus-process separation; closed component mappings; timestamp/sample units; no future evidence in capture; before/after preview accuracy; full-record replay/tamper checks; import trust boundary; public API limits; absent hardware writes/inference calls; cancellation/unmount behavior; no-WebGL/context-loss recovery; UI/legacy compatibility; resource bounds and license provenance.

Findings resolved during implementation:

- HIGH: counterfactual plot labeling could show the observed history while the inspector showed after-test values. Plots now use the corresponding captured-before and counterfactual-after frames, with explicit preview mode.
- HIGH: a new-capture button remained available while displaying a counterfactual after-state, although captures use observed history. Both UI and handler now reject new capture during preview; the browser asserts this after every experiment. Continuing the existing planned experiment remains supported.
- HIGH: a telemetry export could exceed its own original256KiB import limit. Telemetry JSON is compact; local import/validator is bounded at1MiB with5400 readings/600 timestamps. Public server body limits were not increased.
- HIGH: a coupled trial must not be accepted as evidence from the legacy simulator. A dedicated versioned subclass now carries `coupled-pump-1`; legacy parsing remains closed and original portable fixtures reproduce unchanged.
- HIGH: failed simulation loading during report import could attach a report to the previous recording. Loading now returns explicit success; import attaches only after reproduction and successful loading.
- HIGH: nondefault fault onset/sampling could produce correctly computed evidence with incorrectly defaulted window metadata. Report boundaries and time step now derive from the recipe; a regression test checks the actual first/last projected observations and full replay.
- MEDIUM: Python dictionary equality treats boolean values as equal to zero/one, weakening strict JSON reproduction. Coupled replay now compares canonical JSON digests; tests reject numeric-to-boolean substitution with either the original or a recomputed attacker-supplied seal.
- MEDIUM: short imported recordings exposed simulation-only focus/reset behavior. Focus is disabled for imports; reset preserves recorded-source mode and clears stale history.
- MEDIUM: the optional prepared-evidence CLI needed its explicit import. Both exclusive HTML/proposal output paths are exercised offline.
- LOW: camera reset could leave an outdated pressed preset indicator. Renderer recreation/reset now synchronizes the accessible state and has a component regression test.
- MEDIUM: renderer drag release could accidentally select a part. Pointer movement filtering now separates orbit from selection.
- MEDIUM: imported synthetic source could be obscured as generic operator data. Synthetic versus unverified replay labels and re-export source are retained distinctly.
- MEDIUM: graphics/lazy-workspace failure needed isolation. Renderer fallback and a workspace error boundary preserve inspection/library recovery.
- MEDIUM: configurable onset required a matching baseline/incident window. Projection follows onset minus80 through onset plus39; capture still requires the complete supported window.
- LOW: an oversized-request test assumed64KiB, but the established limit is1MiB. The test now exercises the actual boundary; the policy was not weakened.
- Environment: repeated Docker layers exhausted disk; disposable cache/images were reclaimed and builds retried.
- Validation: adding report reproduction/tamper checks exceeded the established ten-write quota in four-test browser journeys. The runner now waits for the normal window. No application limit was relaxed.

Remaining limitations are not hidden defects: no field calibration, unique mechanical-fault proof, real industrial dataset, hardware adapter, physical actuation, durable free-host storage or actual model inference. Camera CAD accuracy and photorealism are not claimed. Accessibility/performance evidence is bounded and does not replace external certification or physical-device testing. Final severity/release decision depends on the final validation matrix, not this narrative alone.

Final acceptance disposition: no known unresolved CRITICAL or HIGH finding in the documented synthetic scope. Remaining accepted risks are listed in the engineering report. Same-agent verification is not a substitute for an independently commissioned audit.
