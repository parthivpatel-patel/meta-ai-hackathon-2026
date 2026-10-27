# FORGE design system 3.0

This review applies to the six public investigation views at `/demo`. Work starts from `feature/forge-product-redesign` at `302ac4d557712b211c92c862703e7e465829a250` and is isolated on `feature/forge-design-system-v3`. The historical local developer labs remain available and regression tested. Their API contracts, numerical policies and report formats are unchanged.

## Design decisions

Inter provides a neutral, readable interface at 14px body/navigation/control size. IBM Plex Mono is limited to measurements, case identifiers, evidence references and numerical tables. Secondary labels have a 12px minimum, headings use 18–28px, and both families are bundled locally with OFL licenses. No remote font service is used. The obsolete Plex Sans package and license asset were removed.

White panels sit on a neutral gray canvas. Charcoal navigation and a single forest accent establish identity; red and amber indicate actual findings or quality states. Borders separate records and chart channels rather than adding ornamental layers. Existing uncertainty, synthetic scope and inference provenance remain visible.

`frontend/src/design-tokens.css` defines shared colors, type scales, spacing, control dimensions, border radius, focus ring and content width. Responsive breakpoint values are documented alongside the tokens; CSS custom properties cannot be used as media-query conditions. `demo.css` implements component states and responsive layouts. `InvestigationVisuals.tsx` contains shared chart/evidence/status/empty-state components and typed measurement structures. `DemoConsole.tsx` owns API orchestration and the six functional views. Existing native controls and details/summary elements avoid additional UI dependencies.

The workspace begins with equipment investigation, source and case selection. The next action follows the actual backend state. Evidence retains calibrated thermal and waveform inspection, hypotheses expose evidence and ordinal rank, experiments retain the audit sequence, verification separates channel outcomes and uncertainty, and reports export the existing replayable record.

Copy uses sentence case and direct action labels: “Begin investigation,” “Run experiment and verify,” “Verification result” and “Analysis mode: Deterministic.” Raw IDs remain identifiable and export data is untouched. Event display normalizes status codes without modifying the retained evidence. Deterministic results never imply real Meta inference.

Charts retain real backend measurements, independent channel scales, units, consistent 0–119 minute axes, missing-data gaps, pointer inspection and keyboard selection. Monospaced readings preserve decimal alignment. No chart or sensor value is fabricated by the frontend.

## Review and validation

Desktop review: 1440 × 1050. Mobile review: 390 × 844. Review all six views in the screenshot index below, including expanded hypotheses, thermal evidence, verifier detail and report actions. Review includes alignment, hierarchy, density, font consistency and legibility; automated checks alone do not establish design quality or full accessibility conformance.

The test runner uses a fresh public-mode local backend, drives actual investigations, restores persisted state, moves the telemetry slider by keyboard, visits all six views, runs Axe WCAG A/AA checks, exports JSON/HTML and checks an insufficient-data abstention. It respects the public write limit with a pause between viewport runs. Repeating the runner immediately against the same process may correctly receive 429; use a fresh test process or let the configured window expire. Never weaken public limits to make tests pass.

Reproduce:

```sh
cd frontend
npm ci
npm test
npm run build
cd ../backend
uv run --frozen pytest -q
# In a separate terminal, use a fresh local public backend:
PORT=8014 FORGE_DEMO_MODE=public FORGE_DEMO_DB_PATH=/tmp/forge-v3-review.sqlite3 uv run --frozen python -m forge.submission.serve
```

With the optional Playwright/Axe tools described in the existing runbook:

```sh
FORGE_DEMO_URL=http://127.0.0.1:8014 node scripts/redesign-browser-check.cjs
```

The runner writes `docs/evidence/design-v3-{desktop,mobile}-{view}.png` and `/tmp/forge-design-v3-a11y.json`. Existing before screenshots are preserved.

## Safe release

No automatic deployment occurs. `main`, `deployment/judge-access`, `render.yaml`, backend restrictions and inference configuration are unchanged. Review this branch and screenshots, then obtain explicit owner approval for the exact commit before any live update. Follow [the release and rollback procedure](../REDESIGN_DEPLOYMENT.md), selecting the reviewed v3 commit rather than the earlier redesign commit. Export current SQLite evidence before a release, retain Free/no-key/public mode, and verify actual external HTTPS readiness, developer-route restrictions and desktop/mobile exports afterward.

Do not add inference credentials to the public host. Genuine Meta activation remains a separate protected workflow in [MODEL_ACTIVATION.md](../MODEL_ACTIVATION.md). No genuine inference request was needed or sent for this design work.

## Recorded results

- Backend regression: **179 passed**, with the existing TestClient/httpx deprecation warning.
- Frontend components: **17 passed**. TypeScript and Vite production build passed.
- Desktop and mobile v1, v2 and sequential v3 workflows passed, including upload, persistence, public inference restrictions, exports and insufficient-data abstention.
- All three synthetic evaluation matrices completed: **480 + 280 + 280 = 1,040 cases**. These remain deterministic synthetic results, not real-model performance.
- Browser font loading, **320px reflow and 200% zoom** passed. All twelve view/viewport Axe checks reported zero violations; this is not a claim of full accessibility conformance.
- Downloaded v1/v2/v3 reports passed independent offline replay. npm audit reported zero known vulnerabilities.
- Real model requests: **zero**. Deployment operations: **zero**.

See [machine-readable results](design-v3-validation.json) and [all screenshots](evidence/DESIGN_V3_REVIEW.md).
