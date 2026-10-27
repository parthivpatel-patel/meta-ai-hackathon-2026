# Interactive equipment inspection

The final engineering candidate adds an optional equipment inspector under **Evidence → Equipment record**, preserving the guided FORGE 4.0 flow. The model consists of three illustrative cuboids projected from 3D coordinates into SVG. It is not a calibrated asset, reconstructed geometry, physical simulation or validated digital twin.

Rotation and zoom use native sliders with keyboard support. Components can be selected from the diagram or equivalent named buttons. The selected component displays the actual session's latest temperature, vibration or pressure sample, missing-data state and anomaly count. Blue identifies selection; yellow identifies statistical anomaly flags. Text preserves these meanings independently of color. Candidate causes remain explicitly unlocalized investigation hypotheses.

The inspector maps actual evidence identifiers and provenance, the pending diagnostic test, completed experiments with before/after independent witness samples, and the selected channel's verifier status and reasons. It never computes a new diagnosis, creates evidence, overrides numerical verification or changes a report. Component and sensor placement is illustrative. Current candidates are shown as text; no inferred physical damage map is fabricated.

Rendering is bounded to 18 SVG faces and has no animation loop, third-party graphics dependency, GPU allocation or WebGL context. WebGL loss/recovery tests therefore do not apply: the same SVG implementation works when WebGL is unavailable. Rotation and selection are also available through native keyboard controls. No touch gesture library is required; the sliders and buttons provide phone controls.

Component tests cover projection changes/reset, selection, missing observations, evidence provenance, actual experiment witnesses and verification status. The full browser runner checks keyboard rotation, selection and layout/accessibility at 1440, 390, 320, 375 and 430 pixel widths. It also records a bounded 20-key rotation sample, DOM count and available Chromium JS heap measurement. These are viewport-emulated headless observations, not physical mobile-device performance, leak detection or a general memory guarantee.

Limitations: schematic cuboids rather than CAD; fixed elevation; no drag orbit/pinch gestures, validated component topology, physical localization or measured field equipment. The optional diagram must not be presented as a high-fidelity digital twin.
