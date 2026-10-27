# Industrial workstation guide

This candidate adds the simulation workstation at `/demo`. It has not been deployed. Use the root [installation instructions](../../README.md) to start it locally. No model credential is needed. **Investigation library** opens the preserved six-stage workflow; switching views or refreshing resets the machine workspace. Export before leaving.

## Three-minute operator demonstration

1. **0:00–0:25 — Context and machine.** Say “FORGE tests competing explanations against independently calculated evidence. This is a synthetic pump simulation, with rules-based proposals and no genuine Meta inference.” Rotate/zoom the pump, select the bearing, show its instruments. Use **Use 2D inspection** to demonstrate the accessible fallback if needed.
2. **0:25–0:55 — Observe.** Select **Bearing degradation**, start playback, pause, then **Focus scenario window**. Show vibration/bearing-temperature changes and the event timeline. Explain that a display watch condition alone does not establish a physical failure.
3. **0:55–1:40 — Investigate.** Choose an instrumented component, **Investigate selected component**, compare channel hypotheses, then explicitly **Run proposed simulated test**. Repeat until terminal verification. The selector chooses a bounded test; the numerical verifier, independently of proposal text, checks primary/witness evidence. Counterfactual previews show actual simulated after-test frames and do not overwrite the recording.
4. **1:40–2:10 — Evidence.** Inspect the decision, uncertainty, experiment response and evidence. A supported vibration-channel explanation does not uniquely identify bearing, alignment or cavitation failure. Misalignment and cavitation examples can remain inconclusive.
5. **2:10–2:40 — Reproduce.** Download JSON and HTML. Import the JSON through **Evidence → Import recording** to recompute and compare the complete artifact. Show the offline CLI below. Telemetry JSON/CSV replay supports inspection but has no physical intervention oracle.
6. **2:40–3:00 — Model and limits.** Explain the intended eligible Meta contribution: proposing structured competing hypotheses from bounded evidence, subject to the same independent verifier. The protected Baseten integration is prepared, but no genuine inference has been verified in this work. Show that connected equipment is unavailable. Do not describe rules-based results as Meta output.

For a second example use **Pressure sensor offset**: the observed pressure changes while latent process pressure does not; reference evidence can support a sensor-channel explanation. Do not reveal simulator labels to a future model as diagnosis evidence.

## Export and recovery

From `backend`, run:

```sh
uv run --frozen python -m forge.industrial.replay /path/report.json \
  --html /path/new-report.html --proposal /path/prepared-evidence.json
```

The command performs no network requests and creates outputs exclusively. Prepared evidence is not an inference receipt. For library reports use `forge.phase3.replay`; formats are intentionally separate.

Pause or use the position slider for historical inspection. **Replay from start** resets playback; **Reset scenario** regenerates deterministically. Sampling interval and playback speed are distinct. Repair and shutdown controls affect simulation only and invalidate capture until reset. Imports are local and limited to 1 MiB, 5,400 readings and 600 timestamps with exact units/component mappings; prefer JSON for round trips. An import error preserves the prior recording. Offline load failure preserves data and offers retry. Backgrounding pauses playback; resuming is explicit.

## Review and owner actions

See [architecture](ARCHITECTURE.md), [engineering report](ENGINEERING_REPORT.md), [evidence](TEST_EVIDENCE.md), [audit](INDEPENDENT_AUDIT.md) and [release boundary](RELEASE_READINESS.md). This work does not merge or deploy. After review, the owner must separately approve an exact deployment SHA, verify actual HTTPS access and free-plan settings, authorize a bounded genuine eligible-model test/evaluation, obtain eligibility clarification, record the final walkthrough and submit. Preserve a downloaded recording and reports independently of ephemeral hosting. No uptime or industrial safety guarantee is made.
