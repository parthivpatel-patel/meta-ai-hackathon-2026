import {
  ArrowRight,
  Download,
  FileText,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import type { Session, Reference } from "./types";
import type { Stage } from "./presentation";
import { causeName, sourceLabel, testName, resultLabel } from "./presentation";
import { Badge, Disclosure, EmptyState } from "./components";
import { TelemetryChart } from "./TelemetryChart";
import { EquipmentModel } from "./EquipmentModel";
import { Thermal, Waveform } from "./AssetVisuals";

export function Overview({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate: (s: Stage) => void;
}) {
  const flagged = session.observed.signals.filter((s) => s.flags > 0);
  return (
    <div className="overview-content">
      <section className="problem-statement">
        <span className="eyebrow">The equipment problem</span>
        <h2>{session.metadata.investigation_title}</h2>
        <p>
          {flagged.length
            ? `The ${flagged.map((s) => s.channel).join(" and ")} measurements contain unusual readings. A process change, a sensor error or both could explain them.`
            : "The statistical screen found no unusual readings. This does not rule out every possible equipment problem."}
        </p>
        <div className="fact-line">
          <span>
            <strong>{session.measurements.length}</strong> time points
          </span>
          <span>
            <strong>{session.evidence.length}</strong> evidence records
          </span>
          <span>
            <strong>{session.trials.length}</strong> tests completed
          </span>
        </div>
      </section>
      <section className="case-brief">
        <h2>How this investigation works</h2>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>Look at the measurements</h3>
              <p>
                Check where readings change and whether any observations are
                missing.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Compare possible causes</h3>
              <p>
                Keep more than one explanation open until independent tests can
                distinguish them.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Test before concluding</h3>
              <p>
                Run a controlled simulation and review what the numerical
                verifier supports.
              </p>
            </div>
          </li>
        </ol>
        <button className="text-button" onClick={() => onNavigate("Evidence")}>
          Open the evidence inspector
          <ArrowRight size={17} />
        </button>
      </section>
      {session.observed.quality_issues.length > 0 && (
        <div className="notice warning">
          <AlertCircle size={20} />
          <div>
            <h3>Some evidence needs care</h3>
            <ul>
              {session.observed.quality_issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <Disclosure title="About this case and its analysis">
        <dl className="record-fields">
          <div>
            <dt>Equipment identifier</dt>
            <dd>{session.metadata.equipment_id}</dd>
          </div>
          <div>
            <dt>Analysis source</dt>
            <dd>{sourceLabel(session.model_source)}</dd>
          </div>
          <div>
            <dt>Dataset identifier</dt>
            <dd>
              <code>{session.dataset_hash}</code>
            </dd>
          </div>
        </dl>
        <p>
          The case is synthetic. Statistical anomalies do not prove a physical
          failure. Model suggestions cannot override independently computed
          verification.
        </p>
      </Disclosure>
    </div>
  );
}
export function EvidenceView({ session }: { session: Session }) {
  const [modality, setModality] = useState("telemetry");
  const chosen = session.evidence.find((e) => e.modality === modality);
  return (
    <div className="evidence-workbench">
      <div className="evidence-menu" role="group" aria-label="Evidence type">
        {session.evidence.map((e) => (
          <button
            key={e.modality}
            aria-pressed={modality === e.modality}
            onClick={() => setModality(e.modality)}
          >
            {(
              {
                telemetry: "Sensor measurements",
                metadata: "Equipment record",
                thermal: "Thermal image",
                waveform: "Vibration waveform",
              } as Record<string, string>
            )[e.modality] || e.modality}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="evidence-display">
        {modality === "telemetry" && (
          <TelemetryChart
            rows={session.measurements}
            flags={session.observed.signals}
          />
        )}{" "}
        {modality === "metadata" && (
          <section>
            <h2>Equipment record</h2>
            <EquipmentModel session={session} />
            <dl className="record-fields">
              <div>
                <dt>Equipment</dt>
                <dd>{session.metadata.equipment_id}</dd>
              </div>
              <div>
                <dt>Investigation</dt>
                <dd>{session.metadata.investigation_title}</dd>
              </div>
              <div>
                <dt>Data source</dt>
                <dd>A declared synthetic equipment case</dd>
              </div>
            </dl>
          </section>
        )}
        {modality === "thermal" && session.assets.thermal && (
          <section>
            <h2>Temperature across the equipment surface</h2>
            <p>
              The array is synthetic and calibrated in degrees Celsius. A hot
              area provides context; it does not establish a cause.
            </p>
            <Thermal pixels={session.assets.thermal.pixels} />
            <p>
              {session.asset_features.modalities.thermal?.hot_pixel_count}{" "}
              spatial hot pixels were identified by deterministic processing. No
              temporal alignment with the telemetry has been independently
              established.
            </p>
          </section>
        )}
        {modality === "waveform" && session.assets.waveform && (
          <section>
            <h2>Vibration over a short interval</h2>
            <p>
              Inspect the numerical vibration signal. This is not recorded
              speech or verified model audio analysis.
            </p>
            <Waveform
              samples={session.assets.waveform.samples}
              rate={session.assets.waveform.sample_rate_hz}
            />
            <p>
              The strongest spectral component is{" "}
              {session.asset_features.modalities.waveform?.peak_frequency_hz.toFixed(
                1,
              )}{" "}
              Hz. The root mean square amplitude is{" "}
              {session.asset_features.modalities.waveform?.rms_mm_per_second.toFixed(
                3,
              )}{" "}
              mm/s.
            </p>
          </section>
        )}
        {chosen && <EvidenceProvenance chosen={chosen} session={session} />}
      </div>
    </div>
  );
}
function EvidenceProvenance({
  chosen,
  session,
}: {
  chosen: Reference;
  session: Session;
}) {
  return (
    <Disclosure title="Source, integrity and interpretation limits">
      <p>{chosen.summary}</p>
      <dl className="record-fields">
        <div>
          <dt>Declared provenance</dt>
          <dd>{chosen.provenance.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{chosen.scope.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Content identifier</dt>
          <dd>
            <code>{chosen.id}</code>
          </dd>
        </div>
      </dl>
      <p>
        Content hashes support consistency checks, not signed authenticity.
        Thermal and waveform processing is deterministic. It does not prove
        physical causality or verified model visual reasoning.
      </p>
      {session.inference && (
        <p>
          Recorded model input: {session.inference.input_mode}.{" "}
          {sourceLabel(session.model_source)}.
        </p>
      )}
    </Disclosure>
  );
}
export function CausesView({ session }: { session: Session }) {
  if (!session.hypotheses)
    return (
      <EmptyState title="Compare causes before choosing one">
        Use the next step to prepare explanations. No model or rule-based
        candidate is a verified diagnosis.
      </EmptyState>
    );
  return (
    <section className="causes-view">
      <div className="section-intro">
        <h2>{session.ranking.length} possible causes</h2>
        <p>
          Rank shows the order of the candidates, not a probability of failure.
          Open a cause to review its explanation and evidence.
        </p>
      </div>
      <div className="cause-list">
        {session.ranking.map((r) => (
          <details className="cause-row" key={r.hypothesis_id}>
            <summary>
              <span className="cause-rank">{r.rank}</span>
              <strong>{causeName(r.hypothesis_id)}</strong>
              <Badge status={r.evidence_status} />
              <span className="expand-symbol" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="cause-details">
              <p>
                {
                  session.hypotheses?.hypotheses.find(
                    (h) => h.hypothesis_id === r.hypothesis_id,
                  )?.rationale
                }
              </p>
              <dl className="record-fields">
                <div>
                  <dt>Independent check</dt>
                  <dd>{r.reason}</dd>
                </div>
                <div>
                  <dt>Tests performed</dt>
                  <dd>
                    {session.trials.map((t) => testName(t.kind)).join("; ") ||
                      "No tests have run yet."}
                  </dd>
                </div>
                <div>
                  <dt>Evidence references</dt>
                  <dd>
                    <code>
                      {r.evidence_refs.join(", ") ||
                        "No independent references yet."}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt>Candidate identifier</dt>
                  <dd>
                    <code>{r.hypothesis_id}</code>
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        ))}
      </div>
      <p className="secondary">
        {sourceLabel(session.model_source)}. Verification is computed
        separately.
      </p>
    </section>
  );
}
export function TestsView({ session }: { session: Session }) {
  return (
    <div className="tests-view">
      <section className="test-proposal">
        <FlaskConical size={28} aria-hidden="true" />
        <span className="eyebrow">
          {session.plan
            ? "Proposed diagnostic test"
            : session.status === "COMPLETE"
              ? "Testing is complete"
              : "Prepare the next test"}
        </span>
        <h2>
          {session.plan
            ? testName(session.plan.kind)
            : session.status === "COMPLETE"
              ? "Review the verification results."
              : "Choose a test that can separate the causes."}
        </h2>
        <p>
          {session.plan?.reason ||
            (session.status === "COMPLETE"
              ? "The engine has finished or stopped because the available evidence cannot support another conclusion."
              : "Prepare possible causes, then ask the engine to select an informative experiment. The next step is shown alongside this workspace.")}
        </p>
        {session.plan && (
          <Disclosure title="What the competing causes predict">
            <ul>
              {session.plan.competing_predictions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Disclosure>
        )}
        <p className="secondary">
          Tests run only in the controlled synthetic system. FORGE does not
          operate physical equipment.
        </p>
      </section>
      <section className="test-history">
        <h2>
          {session.trials.length}{" "}
          {session.trials.length === 1 ? "test completed" : "tests completed"}
        </h2>
        {session.trials.length ? (
          <ol>
            {session.trials.map((t, i) => (
              <li key={t.id}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <div>
                  <strong>
                    {i + 1}. {testName(t.kind)}
                  </strong>
                  <Disclosure title="Inspect this test record">
                    <code>{t.id}</code>
                    <p>
                      {t.probes?.length || 0} measurement channels were
                      recorded. Numerical references are available in the
                      results.
                    </p>
                  </Disclosure>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p>
            No tests have run. Review the next proposed test before executing
            it.
          </p>
        )}
      </section>
      <Disclosure title="Full investigation history">
        <ol className="audit-history">
          {session.events.map((e) => (
            <li key={e.index}>
              <strong>
                {e.index + 1}. {e.action.replaceAll("_", " ")}
              </strong>
              <p>
                {e.detail
                  .replaceAll(
                    "deterministic_rules_not_meta",
                    "deterministic rules, not Meta inference",
                  )
                  .replaceAll(
                    "SUPPORTED_SYNTHETIC",
                    "Supported in this simulation",
                  )
                  .replaceAll("IN_PROGRESS", "More tests are needed")
                  .replaceAll("_", " ")}
              </p>
              <code>{e.evidence_refs.join(", ")}</code>
            </li>
          ))}
        </ol>
      </Disclosure>
    </div>
  );
}
export function ResultsView({ session }: { session: Session }) {
  const complete = session.status === "COMPLETE";
  return (
    <div className="results-view">
      <section
        className={`result-statement ${session.decision.status === "SUPPORTED_SYNTHETIC" ? "supported" : ""}`}
      >
        <span className="eyebrow">Independent verification</span>
        <h2>
          {complete
            ? resultLabel(session.decision.status)
            : "This investigation is still in progress."}
        </h2>
        {session.decision.findings.length > 0 ? (
          <ul className="findings">
            {session.decision.findings.map((f) => (
              <li key={f}>
                <CheckCircle2 size={20} aria-hidden="true" />
                {causeName(f)}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {complete
              ? "The available evidence does not support a complete finding. This is an explicit limit of the investigation, not a hidden substitute for a diagnosis."
              : "Run the proposed tests before interpreting a final result."}
          </p>
        )}
        <p>
          Support applies to this synthetic model. It does not establish
          causality in physical equipment.
        </p>
      </section>
      <section className="channel-results">
        <h2>Results by measurement</h2>
        {session.decision.channels.map((c) => (
          <details key={c.channel}>
            <summary>
              <strong>{c.channel[0].toUpperCase() + c.channel.slice(1)}</strong>
              <Badge status={c.status} />
              <span className="expand-symbol" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="channel-details">
              <p>
                {c.findings.length
                  ? c.findings.map(causeName).join("; ")
                  : c.reasons.join("; ")}
              </p>
              <p className="secondary">{c.reasons.join("; ")}</p>
              <code>{c.evidence_refs.join(", ")}</code>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Numerical reference measurements"
              >
                <table>
                  <caption>
                    Independent reference means, in normalized baseline units.
                    These are descriptive values, not probabilities.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Test</th>
                      <th scope="col">Before</th>
                      <th scope="col">After</th>
                      <th scope="col">Replicates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.trials.flatMap((t) =>
                      (t.probes || [])
                        .filter((p) => p.channel === c.channel)
                        .map((p) => (
                          <tr key={t.id}>
                            <th scope="row">{testName(t.kind)}</th>
                            <td>{mean(p.witness_before)}</td>
                            <td>{mean(p.witness_after)}</td>
                            <td>{p.witness_before.length}</td>
                          </tr>
                        )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </section>
      <Disclosure title="Uncertainty, contradictions and verification policy">
        <p>{session.decision.uncertainty}</p>
        <p>{session.verification_scope}</p>
        <ul>
          {session.decision.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
function mean(values: number[]) {
  return values.length
    ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    : "No observations";
}
export function ReportView({
  session,
  busy,
  download,
}: {
  session: Session;
  busy: boolean;
  download: (format: "json" | "html") => void;
}) {
  const complete = session.status === "COMPLETE";
  return (
    <div className="report-view">
      <section className="export-options">
        <h2>Choose a report format</h2>
        <p>
          {complete
            ? "Your investigation record is ready to download."
            : "Finish the investigation before downloading the final report."}
        </p>
        <button
          className="export-choice"
          disabled={!complete || busy}
          onClick={() => download("html")}
        >
          <FileText size={24} aria-hidden="true" />
          <span>
            <strong>Download readable report</strong>
            <small>
              An HTML document with findings, evidence and limitations.
            </small>
          </span>
          <Download size={20} aria-hidden="true" />
        </button>
        <button
          className="export-choice"
          disabled={!complete || busy}
          onClick={() => download("json")}
        >
          <Download size={24} aria-hidden="true" />
          <span>
            <strong>Download verification record</strong>
            <small>
              A JSON file containing the numerical evidence for offline replay.
            </small>
          </span>
          <Download size={20} aria-hidden="true" />
        </button>
        <Disclosure title="How to verify a downloaded record">
          <p>
            Use the project’s Python environment to recompute the verification
            without contacting a model endpoint.
          </p>
          <code>python -m forge.phase3.replay report.json</code>
          <p>
            File hashes detect changed content. They are not a provider
            signature or proof of physical causality.
          </p>
        </Disclosure>
      </section>
      <section className="report-document" aria-label="Report preview">
        <span className="eyebrow">FORGE investigation report</span>
        <h2>{session.metadata.investigation_title}</h2>
        <dl className="record-fields">
          <div>
            <dt>Equipment</dt>
            <dd>{session.metadata.equipment_id}</dd>
          </div>
          <div>
            <dt>Verification</dt>
            <dd>{resultLabel(session.decision.status)}</dd>
          </div>
          <div>
            <dt>Analysis</dt>
            <dd>{sourceLabel(session.model_source)}</dd>
          </div>
          <div>
            <dt>Tests completed</dt>
            <dd>{session.trials.length}</dd>
          </div>
        </dl>
        <p>
          Synthetic equipment and measurements. Findings do not establish a real
          industrial failure or safety certification.
        </p>
      </section>
    </div>
  );
}
