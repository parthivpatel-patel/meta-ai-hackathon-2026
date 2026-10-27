# Submission package draft

**Status: draft, not submitted.** The prestart foundation is an **OPEN ELIGIBILITY QUESTION**, not confirmed compliant or disqualifying. See `docs/ELIGIBILITY_TIMING_REVIEW.md`; the clarification request is drafted but unsent. Genuine Meta use, the development-window clarification, final release approval and the final recorded video remain open. All current quality metrics below are synthetic or fixture-based, not genuine model performance.

## Project fields for owner review

**Name:** FORGE — Verifiable equipment investigations

**Challenge:** Push the Frontier

**Short description:** FORGE investigates equipment anomalies by comparing possible causes, selecting controlled diagnostic tests and independently verifying numerical evidence. It makes uncertainty and insufficient evidence explicit, and exports records that can be checked again offline.

**Problem and impact:** Equipment measurements can be misleading: a process change and a sensor error may coexist. A plausible explanation alone is not a diagnosis. FORGE demonstrates a reproducible investigation loop that separates candidate explanations from numerical evidence and makes contradictory observations visible. The current system uses synthetic equipment; it has not been validated for industrial operation or safety decisions.

**Technical novelty:** A typed candidate interface sits outside a deterministic experimental oracle and independent verifier. Sequential tests use independent reference/control observations, and the verifier can support, contradict or refuse a finding. The model cannot execute code or override numerical results. Reports retain evidence, source information and deterministic replay. The architecture intentionally limits generative authority rather than presenting a model's confidence as proof.

**Meta contribution — activation-dependent text:** The integration targets Baseten's participant-confirmed `meta-models/muse-spark-open-1026` endpoint. It is prepared to produce structured competing causes from observed statistics and multimodal context, with an independently checked result. **Do not claim it has run until the genuine smoke/evaluation artifacts exist.** Replace this paragraph with actual measured evidence after owner-authorized activation; retain requested/returned identity, sample size, usage, failures and source. Never describe fixture results as model performance. Required attribution for actual use: **Built with Muse Spark Open**. Review the complete license and Usage Policy before final publication.

**Architecture:** A modular Python/FastAPI monolith with Pydantic contracts, deterministic NumPy/SciPy simulation/verification, bounded private HTTP inference, SQLite session versioning and React/TypeScript/Vite frontend. The public deployment is credential-free and cannot invoke model inference. Numerical thermal features and RMS/FFT waveform processing are deterministic; native thermal PNG input is prepared but unverified on the event endpoint. Native audio is not implemented.

**Repository:** https://github.com/parthivpatel-patel/meta-ai-hackathon-2026 (verified PUBLIC). With main preserved, provide the reviewed `feature/forge-final-engineering` tree URL and exact SHA so judges review the candidate rather than assuming main contains it.

**Demo URL:** https://forge-judge.onrender.com/demo — existing external HTTPS/readiness/public restrictions verified. The final candidate has not been deployed by this work. Record the actual approved deployed SHA and final anonymous end-to-end result before submission.

**Evaluation summary:** Existing deterministic benchmarks cover 1,040 synthetic cases. The 280-case sequential benchmark has complete accepted-set precision198/198, answerable recall198/220, coverage198/280 and required abstention60/60, with detector FNR39/260. These are synthetic-engine results, not industrial or genuine model accuracy. The new six-case matched pilot has five possible model requests and a four-test budget per arm; only its fixture implementation has run. Final numerical selection/verification is independent of model candidates and may produce identical outcomes by design. Genuine comparison fields remain unfilled.

## Three-minute recording plan

Use `DEMO_SCRIPT.md` for the complete v4 sequence: choose a case, inspect actual telemetry, compare causes, review/run independent tests, explain the combined process/sensor result and export/replay the record. Once genuine activation is verified, show a retained private model response and explain exactly how it supplied candidates. Show it as **recorded** if replaying an artifact; do not imply a live anonymous public inference request. The substantive model contribution must be demonstrated with actual evidence before claiming the Meta requirement is fulfilled.

Record at 1440×900 or larger with readable browser zoom, hide unrelated tabs/notifications and do not display protected environment panels or credentials. Check the audio narration and final duration. Preserve the recording, raw JSON/HTML export, replay result, exact commit and model source. Rewatch the complete video before sharing it. A local demo or screenshot is not an external deployment, and a prior recording is not proof of current uptime.

## Deterministic fallback

If the provider/key is unavailable, show the deterministic case and offline replay with visible deterministic/synthetic labels. State that genuine model access remains blocked. The fallback preserves explanation of the technical loop; **it cannot substitute for an eligible-model requirement**. If the free host sleeps or loses state, show the explicitly recorded demonstration and downloaded report rather than mislabeling them as live.

## Final evidence bundle checklist

- Owner/organizer clarification of development-window rules and retained commit history.
- Exact reviewed branch/commit, setup instructions and passing CI URL.
- Approved release's external URL, actual deployed SHA, readiness/security/end-to-end/mobile check time.
- Genuine smoke and separately authorized pilot evidence, with secrets removed from any owner-approved public excerpt.
- Sample sizes/uncertainty, known limitations and distinct labels for fixture, deterministic, recorded and live responses.
- Required model attribution/license compliance review.
- Three-minute video link accessible anonymously; deterministic fallback kept separately.
- Authenticated submission form reviewed and completed; actual confirmation retained afterward.

No form was submitted, no provider call was made and no deployment was updated by preparation of this package.
