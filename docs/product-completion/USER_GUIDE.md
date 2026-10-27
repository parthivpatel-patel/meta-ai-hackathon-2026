# Investigate a case in three minutes

FORGE compares explanations for unusual equipment measurements, runs controlled tests and checks what the results support. This public demonstration uses simulated data and rules-based proposals, not a live Meta connection.

1. **Choose a case.** Start with “An unusual pressure reading”. Temperature and vibration cases offer alternative incidents on the same simulated test rig. Select “Open investigation”.
2. **Overview.** Read the incident and check which signals need attention. An unusual reading alone is not a diagnosis.
3. **Evidence.** The chart opens on a flagged signal. Select another signal or use the minute slider to inspect individual observations. °C, mm/s and bar have separate scales. Gaps represent missing readings. New test-rig cases show the declared synthetic sample time in UTC; older cases use elapsed minutes.
4. **Equipment record.** Rotate or zoom the illustrative equipment. Select Motor housing, Bearing assembly or Pump housing to inspect its mapped sensor and verifier result. Blue means selected; yellow means unusual readings. Open the cause and evidence disclosures for details. Geometry and sensor placement are illustrative, not calibrated equipment.
5. **Possible causes.** Prepare suggestions and compare their evidence. Rankings are ordering, not probabilities. The demo clearly identifies rules-based proposals. No language-model claim can change the verifier's numerical result.
6. **Tests.** Choose the next test to ask the existing policy for an informative experiment. Review its predictions and confirm “Run the next test”. Tests run only inside the simulation. The policy chooses among supported tests; arbitrary user-authored interventions are not supported. New independent witness observations update the findings. Repeat until the investigation stops.
7. **Results.** Read the finding and uncertainty. The pressure example separates a process change from a simultaneous sensor error. The noisy case supports only part of its injected fault set; the missing-data case refuses a diagnosis. Neither is a product failure to hide.
8. **Report.** Download readable HTML and the JSON verification record. The HTML explains the case, evidence, causes, tests, observations, independent verification, uncertainty and limitations. Technical details remain in a disclosure. A technical helper can replay JSON from `backend` with `uv run --frozen python -m forge.phase3.replay /path/to/report.json` without a model connection.
9. **Restart.** Use “Change case” and open another investigation. This creates a separate session, preserving the previous one until retention/restart removes it. Refresh reloads the saved session. Export important reports first.

## Recovery

If the free host is asleep, allow normal startup and reconnect once. Do not repeatedly click an action. Requests waiting for response headers time out after 30 seconds with recovery instructions. After an interrupted test, reload the saved investigation before retrying: the server may have completed the operation. Version checks prevent stale updates. A rate limit asks you to wait; it does not switch analysis methods. An expired/missing session can be replaced with a fresh case; downloaded reports remain replayable. SQLite state is temporary and can disappear on host spin-down, restart or deployment.

## Three-minute judge walkthrough

- **0:00–0:30:** Choose pressure. Explain the question: process change, measurement error or both? State that the data are simulated and the public proposal source is rules-based.
- **0:30–1:00:** Inspect pressure telemetry and the equipment sensor. Show units and evidence sources; the diagram is illustrative.
- **1:00–1:45:** Prepare causes, inspect the reference-check proposal, run it, then run the proposed input-restoration test. Explain the new independent witness readings.
- **1:45–2:20:** Review the combined process/sensor result and its uncertainty. Numerical verification is independent of suggestions. Mention that the noisy case remains partially inconclusive and missing data causes abstention.
- **2:20–3:00:** Export the readable report and JSON. Demonstrate or show an explicitly recorded offline replay. Explain the protected Meta candidate-proposal interface as prepared, not activated. Do not claim the eligible-model requirement is fulfilled by this demonstration.

After authorized genuine activation, replace the prepared-interface explanation with actual retained model evidence and identity/usage, clearly distinguishing recorded inference from the anonymous public workflow. The current key and fresh authorization are pending.
