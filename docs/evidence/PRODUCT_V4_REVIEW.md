# FORGE 4.0 visual review

These full-resolution captures use the local backend and synthetic cases. They do not show a live release or genuine Meta inference. Open PNG files at native resolution; long mobile captures are scaled in some previews.

## Direct comparison with Design 3.0

| Stage | Design 3.0 desktop | FORGE 4.0 desktop | Design 3.0 mobile | FORGE 4.0 mobile |
| --- | --- | --- | --- | --- |
| Overview | [Before](design-v3-desktop-workspace.png) | [After](product-v4-desktop-overview.png) | [Before](design-v3-mobile-workspace.png) | [After](product-v4-mobile-390-overview.png) |
| Evidence | [Before](design-v3-desktop-evidence.png) | [After](product-v4-desktop-evidence.png) | [Before](design-v3-mobile-evidence.png) | [After](product-v4-mobile-390-evidence.png) |
| Possible causes | [Before](design-v3-desktop-hypotheses.png) | [After](product-v4-desktop-possible-causes.png) | [Before](design-v3-mobile-hypotheses.png) | [After](product-v4-mobile-390-possible-causes.png) |
| Tests | [Before](design-v3-desktop-experiments.png) | [After](product-v4-desktop-tests.png) | [Before](design-v3-mobile-experiments.png) | [After](product-v4-mobile-390-tests.png) |
| Results | [Before](design-v3-desktop-verification.png) | [After](product-v4-desktop-results.png) | [Before](design-v3-mobile-verification.png) | [After](product-v4-mobile-390-results.png) |
| Report | [Before](design-v3-desktop-reports.png) | [After](product-v4-desktop-report.png) | [Before](design-v3-mobile-reports.png) | [After](product-v4-mobile-390-report.png) |

The prior overview combines telemetry, ranking, audit timeline and verdict in a permanent sidebar dashboard. The new overview explains the problem and next step; detailed evidence, causes, tests and findings each have a dedicated stage. Side-by-side chart miniatures become one readable selected instrument. A mobile stage selector and compact action area replace the sidebar/hamburger pattern and stacked dashboard.

## All required mobile sizes and desktop

| Screen | Desktop 1440 | Mobile 320 | Mobile 375 | Mobile 390 | Mobile 430 |
| --- | --- | --- | --- | --- | --- |
| Case selection | [Open](product-v4-desktop-choose.png) | [Open](product-v4-mobile-320-choose.png) | [Open](product-v4-mobile-375-choose.png) | [Open](product-v4-mobile-390-choose.png) | [Open](product-v4-mobile-430-choose.png) |
| Overview | [Open](product-v4-desktop-overview.png) | [Open](product-v4-mobile-320-overview.png) | [Open](product-v4-mobile-375-overview.png) | [Open](product-v4-mobile-390-overview.png) | [Open](product-v4-mobile-430-overview.png) |
| Evidence | [Open](product-v4-desktop-evidence.png) | [Open](product-v4-mobile-320-evidence.png) | [Open](product-v4-mobile-375-evidence.png) | [Open](product-v4-mobile-390-evidence.png) | [Open](product-v4-mobile-430-evidence.png) |
| Possible causes | [Open](product-v4-desktop-possible-causes.png) | [Open](product-v4-mobile-320-possible-causes.png) | [Open](product-v4-mobile-375-possible-causes.png) | [Open](product-v4-mobile-390-possible-causes.png) | [Open](product-v4-mobile-430-possible-causes.png) |
| Tests | [Open](product-v4-desktop-tests.png) | [Open](product-v4-mobile-320-tests.png) | [Open](product-v4-mobile-375-tests.png) | [Open](product-v4-mobile-390-tests.png) | [Open](product-v4-mobile-430-tests.png) |
| Results | [Open](product-v4-desktop-results.png) | [Open](product-v4-mobile-320-results.png) | [Open](product-v4-mobile-375-results.png) | [Open](product-v4-mobile-390-results.png) | [Open](product-v4-mobile-430-results.png) |
| Report | [Open](product-v4-desktop-report.png) | [Open](product-v4-mobile-320-report.png) | [Open](product-v4-mobile-375-report.png) | [Open](product-v4-mobile-390-report.png) | [Open](product-v4-mobile-430-report.png) |
| Thermal evidence | [Open](product-v4-desktop-thermal.png) | [Open](product-v4-mobile-320-thermal.png) | [Open](product-v4-mobile-375-thermal.png) | [Open](product-v4-mobile-390-thermal.png) | [Open](product-v4-mobile-430-thermal.png) |
| Vibration waveform | [Open](product-v4-desktop-waveform.png) | [Open](product-v4-mobile-320-waveform.png) | [Open](product-v4-mobile-375-waveform.png) | [Open](product-v4-mobile-390-waveform.png) | [Open](product-v4-mobile-430-waveform.png) |

Additional states: [desktop proposed test](product-v4-desktop-test-proposal.png), [mobile proposed test](product-v4-mobile-390-test-proposal.png), [desktop missing evidence](product-v4-desktop-missing-evidence.png), [mobile missing evidence](product-v4-mobile-390-missing-evidence.png).

## Visual review notes

Reviewed typography and hierarchy, column alignment, action clarity, source disclosures, axis legibility, state transitions, expanded reference tables, evidence integrity details and mobile wrapping. The new structure is visibly distinct from v3. The overview no longer requires scrolling past three charts and an event feed to find the next action. Expanded evidence remains available rather than removed.

Defects found and corrected: legacy global CSS leaked sidebar/header geometry into the new shell (isolated through route-specific loading); fixed SVG coordinates shrank waveform labels on phones (replaced with container-sized coordinates); narrow numerical tables lacked keyboard access to their scroll container (added a labeled, focusable region and visible focus state); mobile header metadata consumed excessive vertical space (condensed case chrome while retaining the reload control).

Accessibility and workflow evidence are recorded separately from this visual judgment. No user study or commercial-quality certification is claimed.

Final narrow cause rows use an explicit grid, so long names, status labels and disclosure controls do not squeeze into competing flex columns. This correction was inspected and rechecked for accessibility at all five viewports.
