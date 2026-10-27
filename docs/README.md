# FORGE documentation

Start with the [product README](../README.md) and [workstation guide / three-minute walkthrough](industrial/README.md).

| Topic | Primary reference |
| --- | --- |
| Current implementation, scenarios and assumptions | [Workstation review](industrial/ENGINEERING_REPORT.md) |
| Architecture | [Workstation architecture](industrial/ARCHITECTURE.md) |
| Measured tests, performance and synthetic evaluation | [Current validation](industrial/validation.json), [test evidence](industrial/TEST_EVIDENCE.md) |
| Example JSON/HTML reports and screenshots | [Machine evidence](industrial/evidence/README.md), [preserved library evidence](product-completion/README.md) |
| Security and operational limits | [Security policy](../SECURITY.md) |
| Private model activation and genuine evaluation | [Activation](../MODEL_ACTIVATION.md), [evaluation protocol](GENUINE_MODEL_EVALUATION.md) |
| Deployment and rollback | [Current release procedure](CURRENT_RELEASE.md); use the exact newly approved SHA, not a historical branch head |
| Owner/submission actions | [Current owner gates](CURRENT_RELEASE.md), [submission checklist](../SUBMISSION_CHECKLIST.md) |
| Licensing | [Repository license](../LICENSE), [bundled frontend notices](../frontend/public/assets/THIRD_PARTY_NOTICES.txt), [Meta licensing/access research](META_INTEGRATION.md); review model attribution before genuine use |
| Eligibility timing | [Open question](ELIGIBILITY_TIMING_REVIEW.md), [exact inventory](eligibility-timing-inventory.json), [unsent clarification draft](ORGANIZER_CLARIFICATION_DRAFT.md) |

## Historical records

Historical documents describe their own milestone and can contain superseded operational claims. They are retained to establish what was built and checked, not as current release approval. Start from the references above rather than treating every milestone as current instructions.

- [Original accumulated README through product completion](history/README-through-product-completion.txt): verbatim plain-text historical snapshot (kept as text so old relative links are not presented as current navigation). Its relative links retain their original repository-root context; use the [baseline tree](https://github.com/parthivpatel-patel/meta-ai-hackathon-2026/tree/0107579414f20e46d3919fcffbaf979fcb5296a9) to follow them. It is not the current setup guide.
- [Build log](../HACKATHON_BUILD_LOG.md), [Phase 1](PHASE1_VALIDATION.md), [Phase 2](PHASE2.md), [Phase 3](PHASE3.md), [Phase 4](PHASE4.md).
- [Earlier redesign](PRODUCT_REDESIGN.md), [design system 3](DESIGN_SYSTEM_V3.md), [FORGE 4 review](PRODUCT_V4_DESIGN_REVIEW.md) and [release evidence](PRODUCT_V4_RELEASE.md).
- [Earlier screenshots](evidence/PRODUCT_V4_REVIEW.md), [portable submission fixtures](submission/README.md) and baseline-scoped `final-*.json` evidence. Duplicate-looking reports represent different runs or review scopes and are not disposable backups.
- [Cleanup plan](presentation-cleanup/PLAN.md) and [tracked-file inventory](presentation-cleanup/inventory.json).

Model activation, eligibility clarification, production deployment and final submission remain distinct owner gates. Historical documents do not confer fresh inference/deployment authorization.
