# Coupled simulation model

Version: `coupled-pump-1`. Reproduction requires the version, scenario, seed, initial conditions, sample period, step count, fault onset and ordered interventions. Epoch is a fixed synthetic clock, not wall time. Initial RPM is zero; motor/bearing states start at65/55°C and evolve through the recorded startup. Frames are samples after each update, with sequence zero marking the first stored state.

Nominal speed is3000rpm. RPM relaxes toward the target; flow scales with RPM and falls with cavitation-like suction loss or a process restriction. Suction pressure depends on flow and suction loss. Differential head scales with RPM squared and a simple quadratic flow correction. Discharge pressure is suction plus head. Normal flow is about60m³/h and discharge about6bar. Load depends on speed and alignment; motor temperature relaxes toward an ambient/load/cooling target, bearing temperature toward a speed/mechanical target. Vibration depends on speed, mechanical degradation, alignment and suction disturbance. Instrument noise is seeded and clipped to three declared noise scales; differential pressure is derived from the observed pressure instruments.

The model implements normal, bearing degradation, misalignment, cavitation-like, pressure-sensor offset, cooling degradation and process pressure disturbance scenarios. The pressure-sensor case modifies observations by1.2bar without changing true process pressure. Other scenarios modify process relationships. Fault onset is sequence240–280; default280. Scenario reset reconstructs all state from the same seed. Sampling periods1/2/5seconds adjust relaxation and timestamps consistently.

All scenarios share the explicit initial conditions above, default seed 2026 and default onset 280. Reset regenerates the complete recipe without residual state. The following are injected ground truth and expected display responses, not independent diagnostic conclusions:

| Stable ID | Affected components and observations | Supported simulation intervention | Test expectation |
| --- | --- | --- | --- |
| `normal` | Motor/pump settle near nominal speed, flow, pressure and temperatures | Reference check; shutdown | Normal channel finding after reference |
| `bearing` | Bearing temperature and vibration increase | `balance_rotor` or `reset_fault` | Supported vibration-channel response; no unique bearing-failure proof |
| `misalignment` | Coupling/shafts: higher vibration/load, slightly lower RPM | `balance_rotor` or `reset_fault` | Overlapping temperature/vibration effects can remain inconclusive |
| `cavitation` | Impeller/suction: reduced feed/flow, oscillating vibration | `restore_feed` or `reset_fault` | Simplified multi-channel response can remain inconclusive |
| `pressure_sensor` | Pressure instrument adds 1.2 bar; true process is unchanged | Reference check identifies observation bias; `reset_fault` removes it | Sensor-pressure support; restoring feed is not sensor calibration |
| `thermal` | Cooling/motor: reduced cooling raises motor temperature | `restore_cooling` or `reset_fault` | Supported temperature-channel response |
| `process` | Pump: flow/head change in true process | `restore_feed` or `reset_fault` | Supported pressure-channel response |

The existing experiment policy offers only its supported reference/cooling/balance/feed tests. Reset/shutdown are operator simulation controls and cannot be proposed as arbitrary model tools. Independent verification may abstain despite the known scenario label.

Supported synthetic interventions restore cooling, balance mechanical degradation/alignment, restore feed, reset faults or simulate shutdown. Actions are ordered, unique, bounded and rejected after shutdown. A manual action invalidates diagnostic capture until reset. Shutdown reduces RPM and thermal/flow responses within the simulator, never on real equipment.

These relationships are pedagogical approximations. No energy balance, real pump curve, fluid-specific vapor model, plant calibration, variable geometry, field sensor specification or calibrated uncertainty is claimed. Overlapping signatures can remain inconclusive. Only approved repository resources were examined for datasets; the available evidence is synthetic. Real industrial data and authorized hardware remain external dependencies.
