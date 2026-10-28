# Phase 7 — final experience candidate

Candidate branch: `feature/forge-final-experience`, based on exact Phase 6 `17ea7507814960a4f181d45a3cacaddd38e43f7c`. The final handoff supplies the pushed SHA and CI result. No deployment or merge is authorized by this candidate.

- [Engineering report and remaining gates](ENGINEERING_REPORT.md)
- [Architecture, recovery format and limits](ARCHITECTURE.md)
- [Security and critical review](SECURITY_REVIEW.md)
- [Validation and actual browser evidence](VALIDATION.md)
- [Conditional one-request activation outcome](INFERENCE_STATUS.md)
- [Exact manual release and rollback](RELEASE.md)

The experience uses one shell and navigation for coupled-pump cases and retained multimodal cases, without conflating their data sources. Browser checkpoints are untrusted, bounded and independently reproduced before restoration. Public inference remains disabled.
