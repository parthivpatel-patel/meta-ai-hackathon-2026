# Safety boundaries

Every Start, Pause, Resume, Shutdown, Repair, Reset, Replay and test control affects simulation or replay only. No industrial actuator endpoints or connected-equipment credentials are implemented. Connected mode defaults to UNAVAILABLE. The UI labels synthetic provenance and distinguishes counterfactual results from observed history.

A component watch condition is not a diagnosis. A supported numerical channel finding applies to the declared simulator and its assumptions, not physical causality. Raw recipe ground truth is retained for reproduction, not supplied to candidate generation. Imported operator recordings remain unverified and have no intervention oracle; causal experiment controls are disabled for them.

Simulation state (STARTING/RUNNING/SIMULATED_FAULT/STOPPING/STOPPED) is distinct from paused/replaying browser playback state. Pausing freezes a recorded machine state; it does not shut down hardware or imply current telemetry freshness. Browser backgrounding pauses playback; restoration requires explicit resume. Playback speed changes rendering progression, not the equations' time step.

Real data is absent from repository evidence. Do not use anonymous public mode for sensitive industrial data. No industrial qualification, real hardware connectivity, validated twin, guaranteed uptime or independent third-party certification is claimed.
