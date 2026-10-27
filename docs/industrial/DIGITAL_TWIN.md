# Machine representation

The procedural centrifugal pump assembly has stable selectable parts: motor housing, cooling rings/fan, shafts, coupling, bearing housing/ring, casing, impeller representation, suction/discharge flanges, instrumentation, mounts and support base. Components share the actual simulator's sensor catalog and selected-component state across the inspector, plots and capture context. Amber is a display watch condition; teal is selection. Neither is a certified health assessment.

The model uses locally generated Three.js cylinders, toruses and boxes, with procedural cooling rings and impeller vanes. Dimensions are engineering approximations in arbitrary scene units, not manufacturer CAD. The asset origin is this repository; no third-party mesh was downloaded. Three.js MIT licensing is included in the shipped notices.

Orbit, wheel/touch zoom, pan, camera presets, bounded zoom, component focus and reset are available. Inspection view makes casing/bearing material translucent to show internal relationships. Named HTML selection and camera buttons offer keyboard alternatives. Pointer drags do not select components accidentally.

A manual Use 2D inspection control provides a lower-cost mode even when WebGL works. No WebGL or context loss switches to a selectable 2D schematic. Fallback camera controls adjust the schematic view; the inspector, simulation, investigation and exports remain functional. Retry recreates the renderer. Unmount removes observers/listeners and disposes geometries, materials, renderer and context. Render calls are demand-driven, not a perpetual animation loop; telemetry changes at a bounded two-Hz browser cadence.

This is an illustrative **simulation-linked machine representation**, not a calibrated physical digital twin. There is no CAD accuracy, vibration modal analysis, actual rotor tachometry, fluid surface visualization, validated NPSH solver or physical-machine actuation.
