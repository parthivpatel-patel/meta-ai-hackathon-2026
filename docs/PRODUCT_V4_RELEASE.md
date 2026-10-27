# FORGE 4.0 review and safe release

## What changed

This is a reconstruction of the public `/demo` product, not a new numerical engine. The case lobby, horizontal six-stage journey, focused evidence instrument, contextual next step, test proposal and result interpretation replace the v3 dashboard layout. Desktop uses a task area with a narrow guide. Mobile uses a native stage selector, compact action area and one selected instrument; it does not stack three desktop plots and the entire audit record.

Geist Sans is bundled at 400/500/600 weights. Geist Mono is used for measurements and identifiers. The font packages include OFL licenses copied into public assets. Primary text is 16px, secondary text 14px, controls 15px, plot labels 13px at the actual responsive SVG size, and page headings 28–36px. The case-lobby introductory heading is 32–44px. The restrained teal accent is distinct from the prior forest dashboard, with neutral white backgrounds and charcoal text.

Advanced provenance, numerical reference tables, test predictions, historical events and statistical uncertainty remain available through native expandable controls. Raw evidence narratives, hashes and report payloads retain their original meaning; generated candidate text and numerical evidence are not silently rewritten. Synthetic scope and analysis source are explicit. No genuine Meta response is implied by deterministic investigation output.

## Frontend architecture

- `DemoConsole.tsx`: stage selection and product shell; chooses the next UI destination from the actual returned backend state.
- `investigation/useInvestigation.ts`: request cancellation, owner authentication in memory, versioned actions, saved-session recovery and report downloads.
- `investigation/types.ts`: typed session and evidence contracts.
- `investigation/CaseLobby.tsx`: accessible case selection and restricted model options.
- `investigation/components.tsx`: navigation, guide, headers, status labels, empty states and disclosure primitives.
- `investigation/views.tsx`: focused overview, evidence, causes, tests, results and export views.
- `TelemetryChart.tsx` and `AssetVisuals.tsx`: responsive analytical instruments with actual backend values, explicit units and missing observations.
- `presentation.ts`: edited stage introductions and human-readable result/cause/test labels.
- `product-v4.css`: scoped tokens, shared controls, layout and responsive behavior. Old public styles/components were removed.

The historical local developer labs load separately through a dynamic import. Their CSS is isolated from `/demo`; the public product no longer inherits fixed-sidebar or serif-heading rules from the developer lab stylesheet. API routes and all backend code remain unchanged.

## Reproduce validation

```sh
cd frontend
npm ci
npm test
npm run build
cd ../backend
uv run --frozen pytest -q
PORT=8023 FORGE_DEMO_MODE=public FORGE_DEMO_DB_PATH=/tmp/forge-v4-check.sqlite3 uv run --frozen python -m forge.submission.serve
```

In another terminal with the optional Playwright/Axe tooling installed as described in the existing runbook:

```sh
FORGE_DEMO_URL=http://127.0.0.1:8023 node scripts/product-v4-browser-check.cjs
```

The runner uses a fresh backend, exercises desktop/mobile sequential tests, restores saved investigations, checks all six stages plus the case lobby and thermal/waveform views at desktop and 320/375/390/430 mobile widths, inspects measurements by keyboard, tests explicit insufficient-evidence results and downloads reports. It respects the configured public write window by waiting between the two full investigation runs. Remaining widths reuse an existing case for read-only inspection. It never enables inference, raises limits or sends real model requests. The older public browser-runner names are compatibility entry points to this comprehensive runner; run the canonical runner once.

Exported JSON can be checked independently:

```sh
cd backend
uv run --frozen python -m forge.phase3.replay /tmp/forge-v4-desktop-report.json
uv run --frozen python -m forge.phase3.replay /tmp/forge-v4-mobile-390-report.json
```

The first-time-user objective is a design goal. No timed usability study has been conducted. Automated accessibility checks and visual review are evidence, not a claim of complete accessibility conformance.

## Review before any deployment

1. Review the [three concepts and selection](PRODUCT_V4_DESIGN_REVIEW.md), [before/after screenshots](evidence/PRODUCT_V4_REVIEW.md), and recorded validation results.
2. Obtain explicit owner approval for the exact `feature/forge-product-v4` commit. A pushed development branch is not a deployed release.
3. Export any existing investigation evidence before a service restart. SQLite on the free host is ephemeral.
4. Follow [the existing manual Render release procedure](../REDESIGN_DEPLOYMENT.md), using the approved v4 commit. Keep the Free plan, existing guarded startup, public mode, zero inference request budget and no API/owner keys on the public host. Do not merge main or advance the live branch as part of routine development.
5. After an approved deployment, verify the actual external HTTPS URL, `/api/v3/ready`, anonymous access, restricted developer routes, all workflow stages, phone navigation and downloaded replay. Record the commit and time. Local validation does not prove public uptime or cold-start latency.
6. If necessary, manually roll back to known-good `5e2ad425b4a0f5781917020460f280f9b73c9179` and verify the same checks. No paid service, persistent disk purchase or keep-alive trick is required or authorized.

No deployment has been performed. Genuine inference activation remains a separate protected workflow under `MODEL_ACTIVATION.md` and is not part of this UI release.

## Validation record

Backend regression and security tests: **179 passed**, with the existing TestClient/httpx deprecation warning. Frontend: **19 passed**, including focused-stage navigation, saved-investigation preservation and a missing-data chart test. TypeScript and production build passed. Legacy v1/v2 desktop/mobile workflows, multimodal upload, four API investigation flows and report exports passed. All three evaluation matrices completed (**1,040 synthetic cases**), and downloaded v1/v2/v3 records passed independent offline replay. npm audit reported zero known vulnerabilities.

The public product runner exercised desktop 1440×1050 and mobile widths **320, 375, 390 and 430**. It records Axe results for the case lobby, all six functional stages, thermal and waveform views, proposed tests and missing evidence. See [the machine-readable validation](product-v4-validation.json) for the final recorded accessibility checks. Neither those checks nor visual review establishes complete accessibility conformance.

No backend source, numerical policy, public API contract, provider activation setting or deployment configuration changed. Model requests and deployment operations remained zero.
