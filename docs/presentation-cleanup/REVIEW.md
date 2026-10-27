# Presentation and repository cleanup review

Baseline: `0107579414f20e46d3919fcffbaf979fcb5296a9`. Branch: `feature/forge-presentation-cleanup`. The owner reports the baseline deployed; no production account settings or actual deployed commit were inspected or changed by this cleanup.

The [plan](PLAN.md) and complete [336-file inventory](inventory.json) were recorded before implementation. Classification: 25 configuration files, 20 product documents, 1 repository license, 63 application source files, 17 test files, 13 historical/overlapping documents and 197 reproducibility/evaluation files. Zero tracked build outputs, caches, node_modules, local databases or disposable temporary exports were identified. Generated-looking reports and screenshots are intentionally retained release evidence.

## Changes and deletion decisions

- Replaced the accumulated phase-by-phase README with one current guide: product purpose, capabilities, architecture, relative local setup, tests/replay, canonical demo URL, correct model status and limitations. Removed contradictory claims about unavailable deployment, old typography, missing implemented functionality and superseded phase setup from the entry point.
- Preserved the prior README **byte-for-byte** in `docs/history/README-through-product-completion.txt`. Plain text avoids rendering old relative links as current navigation. This filename refinement supersedes the plan's proposed `.md` extension; the historical content itself is unchanged. The original baseline tree is linked for historical navigation.
- Added `docs/README.md` as the current documentation index and `docs/CURRENT_RELEASE.md` to consolidate current approval, activation, eligibility, release and rollback gates. Existing historical documents remain at their original paths, preventing broken evidence references or silent loss of timeline records. They are explicitly identified as milestone-scoped.
- Replaced unrelated ignore-template boilerplate with focused Python, Node, credentials, local-state and scratch-output exclusions. Added Docker exclusions for `.env`, key/certificate-shaped local files and transient browser reports. Kept lockfiles and reviewed environment examples trackable. Ignore rules are not a substitute for reviewing staged files.
- Added bundled third-party frontend notices from the frozen installed React, React DOM, Scheduler, Lucide and Geist packages. Identical license texts are grouped with package/version attribution. The notices ship as `/assets/THIRD_PARTY_NOTICES.txt`, confirmed accessible in restricted public mode. The repository license and model-license research remain unchanged.
- Simplified the public shell's internal “Saved version” counter to “Saved”, removed a duplicate verification sentence beside the explicit model-source label and shortened the footer to “Simulation only. Not for equipment operation.” Synthetic provenance, source/uncertainty statements, hosting warning and result-specific limits remain visible.

**No source, test, evidence, license or historical record file was deleted.** Removed material consists of obsolete current-README sections and irrelevant ignore-template lines. The README snapshot remains accessible. No dependency was removed: imports, runtime paths, test tooling and legacy-lab compatibility justify the installed packages/source. Static reference review does not prove all branches of code are reachable, so no speculative dead-code deletion was made.

## Report and interface audit

Reviewed the seven HTML/JSON examples and the existing renderer. Reports already contain case information, evidence, competing explanations, numerical tests, verification, uncertainty, provenance and a collapsed technical audit record. Retained that presentation rather than changing the export format without a concrete defect. Backend/report code, portable JSON, HTML fixtures and hashes remain unchanged. Fresh exported reports are independently replayed, and their hashes compared with the committed baseline reports.

The copy review focused on current public `/demo` components, guide panels, error/recovery messages, charts, equipment disclosures and report preview; existing legacy developer screens remain regression-tested and restricted in public mode. Required detail in methodology/provenance disclosures was retained. This is a small presentation cleanup, not another visual redesign or a claim of a field-validated product.

## URL, link and secret hygiene

Application links use `/demo`, same-origin API paths and local fragments. No referral/tracking construction was found. Static authored-source/Markdown probes found no `utm_*`, referral, `fbclid` or `gclid` parameters; remote services were not modified. Canonical demo links use `https://forge-judge.onrender.com/demo`. Local Markdown target paths were checked; remote availability and anchor resolution are outside that check. Historical plain-text references intentionally retain their original context.

No tracked dependency directory, database, cache, compiled output or temporary browser report was found. Git ignore checks confirm protection for dependencies, environments, databases/sidecars, private receipts and temporary browser output. Frozen dependencies and attribution remain present. A bounded private-key/GitHub-token pattern scan found no matches; this is not exhaustive secret detection. No environment dump, credentials, provider activation or organizer contact occurred.

## Validation and release status

See [fresh validation](validation.json) and [hygiene checks](hygiene-checks.json). Browser captures and temporary exports are kept under `/tmp/forge-cleanup-*`; compact observations and replay/hash results are retained here instead of duplicating the 54 committed release screenshots and seven report pairs. The existing evidence package remains at `docs/product-completion`.

This candidate requires review of its exact new SHA before any deployment. It has not been deployed and main/deployment branches remain preserved. Baseten replacement credentials and fresh authorized genuine inference, eligibility guidance, final recording and submission are separate unresolved gates. Public free-host sleep/ephemeral SQLite, illustrative geometry, synthetic-only validation and incomplete manual screen-reader/physical-mobile coverage remain documented limitations.
