# Component model and associations

The backend catalog is the source of stable IDs, names, categories, parent machine, sensors, procedural geometry, provenance and supported investigation scope. Frontend contracts validate catalog relationships before rendering. All components belong to `pump-104`; sensor IDs and component associations are closed and tested for dangling references.

Motor/cooling parts map to RPM, motor temperature and load where relevant. Bearing parts map to bearing temperature and vibration. Shafts/coupling map to RPM and vibration. Impeller and flanges map to flow/pressure/RPM as relevant. Instrument bodies map to their measured signal. Structural bases/mounts have no invented sensors and cannot initiate an instrument-based capture.

A selection updates the mesh/schematic, component inspector, associated readings, plots and subsequent capture context. Scenario/event selection can focus the associated component and recording position. A retained report always states its original capture component/time; inspecting another component does not rewrite the report's provenance. This distinction prevents a current selection from silently changing an already verified artifact.

Display watch thresholds are simple declared operator aids: temperature above70°C, bearing temperature above60°C, vibration above2.4mm/s, discharge outside5.6–6.4bar, low suction/flow/head or high load where supported. Startup/stopped states are identified separately. These thresholds are not a root-cause classifier, instrument validity range or industrial alarm standard.
