import type { Frame, Recording, Report } from "./contracts";
import {
  causeName,
  resultLabel,
  testName,
} from "../investigation/presentation";

const instruments = [
  ["rpm", "Motor speed", "rpm"],
  ["discharge_pressure", "Discharge", "bar"],
  ["flow", "Flow", "m³/h"],
  ["vibration", "Vibration", "mm/s"],
  ["motor_temperature", "Motor temperature", "°C"],
] as const;
export function InstrumentStrip({ frame }: { frame: Frame }) {
  return (
    <section
      className="instrument-strip"
      aria-label="Operating instrumentation"
    >
      {instruments.map(([id, label, unit]) => {
        const r = frame.readings.find((v) => v.sensor_id === id);
        return (
          <div key={id} data-quality={r?.quality || "MISSING"}>
            <span>{label}</span>
            <strong>
              {r?.value == null ? "—" : r.value.toFixed(id === "rpm" ? 0 : 2)}{" "}
              <small>{unit}</small>
            </strong>
            <span>
              {r?.quality === "VALID"
                ? "Observed synthetic sample"
                : r?.quality?.replaceAll("_", " ") || "MISSING"}
            </span>
          </div>
        );
      })}
    </section>
  );
}
export function TrialComparison({
  report,
  recording,
}: {
  report: Report;
  recording: Recording;
}) {
  const before = recording.frames[report.request.context.at_sequence];
  if (!report.events.length)
    return (
      <p className="empty-state">
        No experiments have run. Review the proposed test, then confirm it to
        collect counterfactual observations.
      </p>
    );
  const last = report.events.at(-1)!;
  const channelIds = ["motor_temperature", "vibration", "discharge_pressure"];
  return (
    <section
      className="trial-comparison"
      aria-label="Experiment before and after"
    >
      <h3>Observation → intervention → independent check</h3>
      <p>
        {testName(last.action)} · {report.events.length} explicit test
        {report.events.length === 1 ? "" : "s"}. Counterfactual after-state
        remains separate from observed history.
      </p>
      <table>
        <caption>
          Latest simulated intervention · display readings, not the replicate
          test statistic
        </caption>
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Captured before</th>
            <th>Counterfactual after</th>
          </tr>
        </thead>
        <tbody>
          {channelIds.map((id) => {
            const sensor = recording.sensors.find((s) => s.id === id);
            const show = (f: Frame | undefined) => {
              const r = f?.readings.find((v) => v.sensor_id === id);
              return r?.value == null
                ? "Missing"
                : `${r.value.toFixed(2)} ${sensor?.unit || ""} · ${r.quality}`;
            };
            return (
              <tr key={id}>
                <th scope="row">{id.replaceAll("_", " ")}</th>
                <td>{show(before)}</td>
                <td>{show(last.after_frame)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        <strong>{resultLabel(last.verification)}</strong> · the verifier uses 96
        synthetic instrument replicates per channel, not the two displayed
        points.
      </p>
    </section>
  );
}
export function ReportPreview({ report }: { report: Report }) {
  return (
    <section className="report-preview" aria-label="Report preview">
      <p className="station-eyebrow">PUMP-104 / REPLAYABLE RECORD</p>
      <h3>{resultLabel(report.decision.status)}</h3>
      <dl>
        <div>
          <dt>Equipment / component</dt>
          <dd>PUMP-104 / {report.request.context.component_id}</dd>
        </div>
        <div>
          <dt>Observed window</dt>
          <dd>
            Samples {report.evidence_window.first_sequence}–
            {report.evidence_window.last_sequence}; {report.measurements.length}{" "}
            measurements
          </dd>
        </div>
        <div>
          <dt>Proposal source</dt>
          <dd>
            {report.model_proposal
              ? report.model_proposal.source === "test_transport"
                ? "Recorded fixture, not Meta"
                : "Recorded Meta claim; source unattested"
              : "Deterministic rules, not Meta"}
          </dd>
        </div>
        <div>
          <dt>Supported findings</dt>
          <dd>
            {report.decision.findings.map(causeName).join("; ") ||
              "None established"}
          </dd>
        </div>
        <div>
          <dt>Independent result</dt>
          <dd>{report.decision.reasons.join(" ")}</dd>
        </div>
        <div>
          <dt>Uncertainty / unresolved alternatives</dt>
          <dd>{report.decision.uncertainty}</dd>
        </div>
        <div>
          <dt>Provenance digest</dt>
          <dd>
            <code>{report.report_hash}</code>
          </dd>
        </div>
      </dl>
      <h3>Experiment sequence</h3>
      {report.events.length ? (
        <ol>
          {report.events.map((e) => (
            <li key={e.id}>
              {testName(e.action)} → {resultLabel(e.verification)}
            </li>
          ))}
        </ol>
      ) : (
        <p>No experiment executed.</p>
      )}
      <h3>Limits of this record</h3>
      <ul>
        {report.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p>
        JSON preserves the original contracts, hypotheses, numerical replicate
        checks and provenance. Re-import verifies full independent reproduction;
        digest consistency does not authenticate an external source.
      </p>
    </section>
  );
}
