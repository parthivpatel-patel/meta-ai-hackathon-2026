# Before / after visual review

Both sets are local synthetic rehearsals, not proof of live deployment or real Meta output. The old deployment screenshots are preserved unchanged. The after set was captured from the validated public Render-contract container with the same fixed case; case IDs differ because sessions are isolated.

| View | Before | After |
|---|---|---|
|Desktop workspace|[Prior interface](render-local-desktop.png)|[Redesigned workspace](redesign-desktop-workspace.png)|
|Mobile workspace|[Prior interface](render-local-mobile.png)|[Redesigned mobile](redesign-mobile-workspace.png)|
|Hypothesis register|Included in prior single page|[Desktop](redesign-desktop-hypotheses.png) / [mobile](redesign-mobile-hypotheses.png)|
|Experiment timeline|Included in prior single page|[Desktop](redesign-desktop-experiments.png) / [mobile](redesign-mobile-experiments.png)|
|Independent verification|Included in prior single page|[Desktop](redesign-desktop-verification.png) / [mobile](redesign-mobile-verification.png)|
|Evidence inspector|Included in prior single page|[Desktop](redesign-desktop-evidence.png) / [mobile](redesign-mobile-evidence.png)|
|Report interface|Download buttons only|[Desktop](redesign-desktop-reports.png) / [mobile](redesign-mobile-reports.png)|

Review findings: replaced decorative serif headers and repeated summary cards with a consistent locally served sans-serif shell, concise case header and action, meaningful source stamp, numeric chart axes and actual evidence views. Fixed insufficient contrast on ordinal ranks/event numbers and compact provenance labels via shared tokens. Mobile navigation now has focus/escape behavior, sticky controls and real destinations; full-width content has no detected horizontal overflow at390px. Screenshot capture clears the accessibility scanner's temporary focus so it does not obscure the header. Keyboard minute inspection, reduced-motion mode, persisted state, report exports and missing-data abstention were exercised.

Automated WCAG A/AA scans have zero detected violations in all12 view/viewport combinations. This is not a complete manual assistive-technology certification. Source, synthetic, statistical uncertainty and free-host storage limitations remain visible; no decorative live indicator or probability estimate is introduced.
