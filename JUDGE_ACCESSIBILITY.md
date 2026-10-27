# Judge accessibility checklist

## Verified current access

Existing URL: **https://forge-judge.onrender.com/demo**. On October 27, external HTTPS readiness and all 32 read-only public-boundary checks passed. See `docs/final-live-check.json` and `docs/final-live-audit.json`. These prove the existing service's HTTP behavior, not the final candidate's deployed SHA. No final engineering release has been deployed by this work.

The repository is verified PUBLIC. If main remains unchanged, link judges directly to the reviewed `feature/forge-final-engineering` branch and exact commit. Do not imply the default branch contains the release candidate.

## After an owner-approved candidate deployment

- [ ] Confirm Render shows the exact approved commit, Free plan, auto-deploy off and no provider/owner credentials.
- [ ] Open `/demo` anonymously in a clean desktop browser and on a phone. No account/token should be required for the restricted deterministic demo.
- [ ] Complete case selection, Overview, Evidence, Possible causes, Tests, Results and Report. Inspect thermal/waveform context and the selected sensor without implying native model vision/audio.
- [ ] Confirm synthetic labels, actual analysis source and uncertainty remain visible. Public Meta inference must remain unavailable.
- [ ] Run the fixed pressure/sensor case, then download HTML/JSON and independently replay the JSON. Verify the insufficient-record case refuses a conclusion.
- [ ] Confirm developer docs/APIs remain forbidden, bounded controls still apply and errors explain recovery after rate limits/cold starts.
- [ ] Check 320/375/390/430-pixel layouts, keyboard measurement inspection, native stage selector and numerical-table scroll/focus controls.
- [ ] Save URL, deployed SHA, UTC check time, video/report links and anonymous-access evidence outside the ephemeral host.

## Availability and judging fallback

Keep the service available through **November 18, 2026** as an owner-managed target. Free hosting may idle/sleep or restart; there is no uptime guarantee. Do not add unsupported external keep-alive pings. SQLite and finite application retention can remove sessions; export reports and keep the final video independently. Let a cold service start normally, then retry once or show the explicitly labeled recording/offline report.

A recording is recorded evidence, not a live request. A deterministic fallback does not satisfy the genuine eligible-model requirement. Do not announce submission completion until the actual form confirmation exists.
