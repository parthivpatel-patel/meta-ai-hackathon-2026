# Actual Phase 5 evidence

This package describes local candidate checks, not a public deployment or genuine inference run. Final commit/CI identity is in the handoff; [source hashes](image-source-hashes.json) bind the tested image to all packaged backend Python sources and compiled frontend assets. [Validation](../validation.json) records exact scopes and measurements.

- [Backend tests](backend-tests.txt), [frontend tests](frontend-tests.txt), [production build](frontend-build.txt), [Ruff](ruff.txt), [Docker build](docker-build.txt), [container audit](container-audit.json).
- [Seven machine journeys](machine/browser-results.json) and [lifecycle/mobile/graphics](machine/lifecycle-results.json), with JSON/HTML reports and unedited screenshots in `machine/`.
- [Desktop/mobile recorded-fixture journey](recorded-proposals/meta-browser-results.json), [prepared observed input](recorded-proposals/prepared-evidence.json), [initial fixture report](recorded-proposals/fixture-initial.json), [final fixture JSON](recorded-proposals/fixture-final.json), [HTML](recorded-proposals/fixture-final.html) and source/verification screenshots. These are explicitly **not genuine Meta outputs**. Private fixture receipts remain outside the repository.
- [Preserved library journeys](library/browser-results.json), [all-width checks](library-all-width-browser.json), and actual exported legacy reports in `library/`. Exclude five performance-only records when counting Axe runs.
- [Offline replay evidence](replays.json): 18 records, including unchanged original submission fixtures.
- [Current numerical summaries](numerical-evaluation-summary.json) for the 480/280/280/21 fixed panels; [seven local-model comparisons](model-fixture-comparison.json). No genuine model accuracy is measured.
- Dry-only [smoke](smoke-preflight.json), [workstation](workstation-preflight.json), [evaluation](evaluation-preflight.json); no `--execute` run occurred.
- [npm audit](npm-audit.json), [Python audit](python-audit.json), [bounded staged/build/log scan](security-scan.json), [package checksums](manifest.json).

Warm browser timings include automation, software WebGL and concurrent local workloads. Heap snapshots diagnose a bounded test, not a retained-leak proof. Automated checks do not establish physical accessibility or industrial safety certification. Source claims in imported reports are consistency metadata, not provider signatures.
