import { useEffect, useRef, useState } from "react";
import { Download, FlaskConical, Play, ShieldCheck } from "lucide-react";

type Interval = { estimate: number; low: number; high: number };
type Candidate = {
  id: string;
  title: string;
  hypothesis: string;
  prediction: string;
  basis: string;
  source: string;
};
type Probe = {
  channel: string;
  primary_before: number[];
  primary_after: number[];
  witness_before: number[];
  witness_after: number[];
};
export type WorkflowSnapshot = {
  id: string;
  status: string;
  dataset_hash: string;
  model_source: string;
  observed: {
    quality_issues: string[];
    signals: { channel: string; flags: number }[];
  };
  candidates: Candidate[];
  selection: {
    kind: string;
    rationale: string;
    intervention: string;
    replicates: number;
    max_steps: number;
  } | null;
  experiment: {
    id: string;
    simulator: string;
    provenance: string;
    probes: Probe[];
  } | null;
  verification: {
    decision: string;
    finding: string | null;
    reasons: string[];
    uncertainty: string;
    causal_scope: string;
    assessments: {
      hypothesis_id: string;
      status: string;
      evidence_refs: string[];
      reason: string;
    }[];
    statistics: {
      channel: string;
      n: number;
      witness_before: Interval;
      witness_after: Interval;
      witness_reduction: Interval;
    }[];
  } | null;
};
const stages = [
  "OBSERVED",
  "HYPOTHESES_READY",
  "EXPERIMENT_SELECTED",
  "EXPERIMENT_COMPLETE",
  "VERIFIED",
];
const stageLabels = ["Observe", "Hypothesize", "Select", "Simulate", "Verify"];
const actions: Record<string, { endpoint: string; label: string }> = {
  OBSERVED: { endpoint: "hypotheses", label: "Generate candidates" },
  HYPOTHESES_READY: { endpoint: "selection", label: "Select experiment" },
  EXPERIMENT_SELECTED: { endpoint: "experiments", label: "Run simulation" },
  EXPERIMENT_COMPLETE: { endpoint: "verification", label: "Verify evidence" },
};
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
const display = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : "Unavailable";
export default function InvestigationWorkflow({
  scenario,
}: {
  scenario: string;
}) {
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [override, setOverride] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    pending.current?.abort();
    setSnapshot(null);
    setError("");
    setBusy(false);
    setOverride("");
    return () => pending.current?.abort();
  }, [scenario]);
  async function advance() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    try {
      const action = snapshot ? actions[snapshot.status] : null;
      const path = snapshot
        ? `/api/v1/investigations/${snapshot.id}/${action!.endpoint}`
        : "/api/v1/investigations";
      const body = !snapshot
        ? { scenario, seed: 42 }
        : action?.endpoint === "selection"
          ? { kind: override || null }
          : undefined;
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok)
        throw Error(
          `Investigation step failed (${response.status}). Retry, or start a new investigation if the session expired.`,
        );
      const result = await response.json();
      if (!controller.signal.aborted) setSnapshot(result);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Investigation unavailable");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const verification = snapshot?.verification;
  const stage = snapshot ? stages.indexOf(snapshot.status) : -1;
  return (
    <section
      className="panel investigation-engine"
      id="investigation-engine"
      aria-labelledby="engine-title"
    >
      <div className="panel-title">
        <h2 id="engine-title">
          <FlaskConical size={18} /> Verifiable investigation
        </h2>
        <span className="tag">RULES-BASED · NOT META</span>
      </div>
      <p className="panel-intro">
        Test competing explanations with a bounded synthetic intervention and an
        independent reference sensor. Scenario labels stay outside
        candidate-generation inputs.
      </p>
      <ol className="workflow-stages" aria-label="Investigation progress">
        {stageLabels.map((label, i) => (
          <li
            key={label}
            className={i <= stage ? "complete" : ""}
            aria-current={i === stage ? "step" : undefined}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="workflow-action">
        <div>
          <strong>
            {snapshot
              ? snapshot.status.replaceAll("_", " ")
              : "Ready to investigate"}
          </strong>
          <p>
            {snapshot
              ? `Dataset ${snapshot.dataset_hash.slice(0, 16)}… · synthetic, seed-hidden analysis`
              : "Creates an isolated synthetic case matching the selected demo scenario."}
          </p>
        </div>
        {snapshot?.status === "HYPOTHESES_READY" && (
          <label className="experiment-override">
            Intervention
            <select
              aria-label="Intervention"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              disabled={busy}
            >
              <option value="">Automatic selection</option>
              <option value="reference_check">
                Independent reference check
              </option>
              <option value="restore_cooling">Restore cooling</option>
              <option value="balance_rotor">Balance rotor</option>
              <option value="restore_feed">Restore feed</option>
            </select>
          </label>
        )}
        {snapshot?.status !== "VERIFIED" && (
          <button className="primary-action" disabled={busy} onClick={advance}>
            <Play size={13} />
            {busy
              ? "Working…"
              : snapshot
                ? actions[snapshot.status].label
                : "Start investigation"}
          </button>
        )}
        {snapshot?.status === "VERIFIED" && (
          <button
            onClick={() => {
              setSnapshot(null);
              setOverride("");
            }}
          >
            New investigation
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="workflow-error">
          {error}
        </p>
      )}
      {snapshot?.observed.quality_issues.map((issue) => (
        <p className="workflow-error" key={issue}>
          {issue}
        </p>
      ))}
      {!!snapshot?.candidates.length && (
        <details className="candidate-details" open={!snapshot.experiment}>
          <summary>
            {snapshot.candidates.length} competing hypotheses and predicted
            observations
          </summary>
          <div className="candidate-list">
            {snapshot.candidates.map((candidate) => (
              <article key={candidate.id}>
                <h3>{candidate.title}</h3>
                <p>{candidate.hypothesis}</p>
                <p>
                  <b>Prediction:</b> {candidate.prediction}
                </p>
                <small>{candidate.basis}</small>
              </article>
            ))}
          </div>
        </details>
      )}
      {snapshot?.selection && (
        <div className="experiment-selection">
          <h3>Selected: {snapshot.selection.kind.replaceAll("_", " ")}</h3>
          <p>{snapshot.selection.intervention}</p>
          <p>{snapshot.selection.rationale}</p>
          <small>
            {snapshot.selection.replicates} replicates ·{" "}
            {snapshot.selection.max_steps} maximum relaxation steps ·
            allowlisted simulation only
          </small>
        </div>
      )}
      {snapshot?.experiment && (
        <div className="experiment-evidence">
          <h3>Measured synthetic results</h3>
          <p>{snapshot.experiment.provenance}</p>
          <div className="table-scroll">
            <table>
              <caption>
                Residual means in normalized units; independent witness
                measurements
              </caption>
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Primary before</th>
                  <th>Witness before</th>
                  <th>Witness after</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.experiment.probes.map((p) => (
                  <tr key={p.channel}>
                    <th>{p.channel}</th>
                    <td>{display(mean(p.primary_before))}</td>
                    <td>{display(mean(p.witness_before))}</td>
                    <td>{display(mean(p.witness_after))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="evidence-provenance">
            {snapshot.experiment.simulator} · Evidence {snapshot.experiment.id}
          </p>
        </div>
      )}
      {verification && (
        <div
          className={`verification-result ${verification.decision === "SUPPORTED_SYNTHETIC" ? "supported" : "uncertain"}`}
          role="status"
        >
          <h3>
            <ShieldCheck size={18} />{" "}
            {verification.decision.replaceAll("_", " ")}
          </h3>
          <p className="finding">
            Finding:{" "}
            {verification.finding ?? "No sufficiently supported finding"}
          </p>
          <ul>
            {verification.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p>{verification.uncertainty}</p>
          <p>
            <b>Scope:</b> Synthetic model only. Physical-world causality is not
            established.
          </p>
          {!!verification.statistics.length && (
            <div className="intervals">
              {verification.statistics.map((stat) => (
                <div key={stat.channel}>
                  <b>{stat.channel}</b>
                  <span>
                    Witness reduction {display(stat.witness_reduction.estimate)}
                  </span>
                  <small>
                    99% interval [{display(stat.witness_reduction.low)},{" "}
                    {display(stat.witness_reduction.high)}] · n={stat.n}
                  </small>
                </div>
              ))}
            </div>
          )}
          <details>
            <summary>Support, contradictions, and evidence references</summary>
            <ul>
              {verification.assessments.map((a) => (
                <li key={a.hypothesis_id}>
                  <b>
                    {a.hypothesis_id}: {a.status}
                  </b>
                  <p>{a.reason}</p>
                  <small className="evidence-provenance">
                    {a.evidence_refs.join(", ")}
                  </small>
                </li>
              ))}
            </ul>
          </details>
          <div className="report-downloads">
            <a
              href={`/api/v1/investigations/${snapshot!.id}/report.json`}
              download
            >
              <Download size={14} /> Download JSON
            </a>
            <a
              href={`/api/v1/investigations/${snapshot!.id}/report.html`}
              download
            >
              <Download size={14} /> Download HTML
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
