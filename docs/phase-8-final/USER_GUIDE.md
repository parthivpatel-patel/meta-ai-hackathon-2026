# Final workstation user guide

FORGE is a synthetic industrial investigation demonstration. Select Cases → a pump scenario, then focus its diagnostic window. Inspect components and instruments, using 2D mode if WebGL is unavailable. Camera motion does not advance physics. Start/pause and the position slider move through bounded recorded simulation samples; inspection never modifies captured evidence.

Operating controls, reset and deliberate case selection create a new recording and replace the active investigation; export reports/checkpoints first. Tab navigation and inspection do not perform that replacement.

At sample 319 or later, choose an instrumented component and capture observed evidence. Compare the candidate mechanisms, their evidence status, contradictions, missing information and source label. Ranking is not a calibrated probability. Review the proposed discriminating test and its competing predictions, then explicitly confirm **Run proposed simulated test**. No physical equipment or model is called by that action.

Counterfactual results remain separate from the observed recording. **Resume existing investigation** returns to the saved report without capturing or testing. **Return to observed simulation** changes only the display preview. New capture is unavailable from experiment outcomes, imported recordings, short windows, manual-action recipes, uninstrumented components or pending operations. New capture is not necessary to continue the existing investigation; an intentional new capture replaces the active capture, so export it first.

When the selector reaches a terminal state, read the stopping policy and remaining allowance. “2 of 4 permitted tests” may be a complete supported result; four is a maximum. Inconclusive or exhausted cases are complete investigations with unresolved evidence, not successful physical diagnoses. Choose **Review and export report**. JSON preserves the sealed reproduction record; HTML explains findings, limits and stopping policy. From Reports, **Return to machine** provides the next exit.

Browser recovery retains one validated checkpoint per case family on this browser. Save and export a checkpoint before closing or replacing important work. Refresh/restart requires explicit restoration and independent numerical reproduction; restored playback is paused/observed. A missing temporary library session can be reconstructed from its fixed deterministic public checkpoint into a fresh ID, preserving prior trials and budget. This does not authenticate the original source or prove that past physical experiments occurred.

Storage may be denied, full, cleared or evicted. It is not encrypted cloud backup or cross-device persistence. Keep reports/checkpoints outside the free service. Invalid, incompatible, private or corrupted imports are rejected. A slow file import is locked against duplicate restoration and rejected if the workspace changed before attachment. Private credentials and provider receipts must never be imported or saved.

If a request is interrupted, preserve/export the current case and reload or restore server/checkpoint state before retrying a test. The free host may be waking. Reconnect does not automatically repeat an experiment. Download failure leaves the report available; permit browser downloads, retry HTML, or use the JSON record for offline generation:

```sh
cd backend
uv run --frozen python -m forge.industrial.replay report.json --html report.html
# Original investigation-library reports:
uv run --frozen python -m forge.phase3.replay report.json
```

The library retains its original evidence/hypothesis/test/results/report stages inside the unified shell. Its thermal/waveform/equipment-record context is separate synthetic case evidence; it is not fabricated for the coupled pump. Reference 3D geometry is not a calibrated reconstruction, and unavailable RPM/flow is not invented.

Status/About describes public inference-disabled operation and storage/hosting limits. Deterministic rules and test-transport fixtures are explicitly labeled. Genuine Meta activation remains blocked; a future private smoke result alone would not prove a genuine full workstation investigation.
