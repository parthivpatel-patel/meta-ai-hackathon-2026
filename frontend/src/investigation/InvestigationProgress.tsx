import { investigationProgress, type ProgressInput } from "./progress";
import { resultLabel } from "./presentation";
export function InvestigationProgress(
  props: ProgressInput & { reasons?: string[] },
) {
  const progress = investigationProgress(props);
  return (
    <section
      className="investigation-progress"
      aria-label="Investigation stopping policy"
    >
      <h3>{progress.title}</h3>
      <p>{progress.reason}</p>
      <dl className="progress-counts">
        <div>
          <dt>Tests completed</dt>
          <dd>{props.completed}</dd>
        </div>
        <div>
          <dt>Maximum permitted</dt>
          <dd>{props.maximum}</dd>
        </div>
        <div>
          <dt>Remaining allowance</dt>
          <dd>{progress.remaining} — not an instruction to execute</dd>
        </div>
        <div>
          <dt>
            {progress.notNeeded === null
              ? "Unused allowance"
              : "Tests not needed under this policy"}
          </dt>
          <dd>{progress.notNeeded ?? progress.remaining}</dd>
        </div>
      </dl>
      <p>
        <strong>Verification:</strong> {resultLabel(props.status)}. Synthetic
        evidence only; physical causality is not established.
      </p>
      {props.reasons?.length ? (
        <p>
          <strong>Recorded verification reason:</strong>{" "}
          {props.reasons.join(" ")}
        </p>
      ) : null}
      <p>
        <strong>Next:</strong> {progress.next}.
      </p>
    </section>
  );
}
