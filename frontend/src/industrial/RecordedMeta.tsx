import { useEffect, useRef, useState } from "react";
import { boundedFetch } from "../investigation/useInvestigation";
import { TelemetryChart } from "../investigation/TelemetryChart";
import { causeName, resultLabel, testName } from "../investigation/presentation";
import type { Session } from "../investigation/types";

const MODEL = "meta-models/muse-spark-open-1026";
const SHA = "8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f";
const RUN = "RUN3-a2664d56db115b51b24fdaa6333eaf959a2776ab5547c52c30732eca18d754fd";
const LABELS = ["Genuine Meta model output", "Previously recorded", "Synthetic investigation", "Independently verified"];
type RecordedSession = Omit<Session, "id" | "version" | "inference"> & {
  inference: { source: string; requested_model: string; returned_model: string };
};
export type PublishedMeta = {
  provenance: {
    review_id: string; source: string; mode: string; synthetic: boolean;
    independently_verified: boolean; public_live_inference_enabled: boolean;
    model_id: string; recorded_utc: string; artifact_sha256: string;
    input_hash: string; output_hash: string; scope: string; basis: string;
  };
  report: { schema: string; run_id: string; investigation: RecordedSession };
};
function checked(value: PublishedMeta): PublishedMeta {
  const p = value?.provenance, r = value?.report, s = r?.investigation;
  if (p?.review_id !== "forge-meta-pressure-20261028" || p.source !== "meta_http_response" ||
      p.mode !== "previously_recorded" || p.synthetic !== true || p.independently_verified !== true ||
      p.public_live_inference_enabled !== false || p.model_id !== MODEL || p.artifact_sha256 !== SHA ||
      r?.schema !== "forge-report-3" || r.run_id !== RUN || s?.model_source !== "meta_http_response" ||
      s.inference?.source !== "meta_http_response" || s.inference?.requested_model !== MODEL ||
      s.inference?.returned_model !== MODEL || !Array.isArray(s.measurements) ||
      !Array.isArray(s.hypotheses?.hypotheses) || !Array.isArray(s.trials) || !s.decision)
    throw Error("Reviewed evidence contract mismatch");
  return value;
}
export default function RecordedMeta({ onReturn }: { onReturn: () => void }) {
  const [data, setData] = useState<PublishedMeta | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setError("");
    Promise.all([
      boundedFetch("/api/v3/recorded-meta", { signal: request.signal, cache: "no-store" }),
      boundedFetch("/api/v3/recorded-meta/report.json", { signal: request.signal, cache: "no-store" }),
    ])
      .then(async ([metadata, report]) => {
        if (!metadata.ok || !report.ok) throw Error("Unavailable");
        const raw = await report.arrayBuffer();
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)), b => b.toString(16).padStart(2, "0")).join("");
        if (hash !== SHA) throw Error("Recorded evidence integrity mismatch");
        return checked({ provenance: (await metadata.json()).provenance, report: JSON.parse(new TextDecoder().decode(raw)) });
      })
      .then(value => { if (!request.signal.aborted) setData(value); })
      .catch(() => { if (!request.signal.aborted) setError("Reviewed recorded evidence is unavailable. The workstation remains available; no inference was requested."); });
    return () => request.abort();
  }, [reload]);
  async function replay() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setReplayed(false); setError("");
    try {
      const response = await boundedFetch("/api/v3/recorded-meta/replay", { signal: controller.current?.signal, cache: "no-store" });
      if (!response.ok) throw Error("Unavailable");
      const result = await response.json();
      if (result.verified !== true || result.status !== "SUPPORTED_SYNTHETIC" || result.report_run_id !== RUN ||
          result.artifact_sha256 !== SHA || result.network_requests_sent !== 0 || result.new_experiments_executed !== 0)
        throw Error("Replay mismatch");
      if (!controller.current?.signal.aborted) setReplayed(true);
    } catch {
      if (!controller.current?.signal.aborted) setError("Replay is unavailable. The recorded investigation is preserved; no model request was made.");
    } finally { inFlight.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  }
  const s = data?.report.investigation;
  return <main className="industrial recorded-meta">
    <header className="station-header"><div>
      <p className="station-eyebrow">FORGE · Reviewed recorded investigation</p>
      <h1>Recorded Meta investigation</h1>
      <p>Pressure disturbance and sensor offset · Read-only evidence</p>
    </div><button onClick={onReturn}>Return to existing workspace</button></header>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading reviewed recorded evidence…</p>}
    {!data && error && <button onClick={() => setReload(n => n + 1)}>Retry recorded evidence</button>}
    {data && s && <>
      <section className="station-panel" aria-label="Recorded source and scope">
        <ul className="recorded-labels">{LABELS.map(label => <li key={label}>{label}</li>)}</ul>
        <p><strong>Built with Muse Spark Open.</strong> Public live inference is disabled. Opening, replaying and exporting this case makes no model requests.</p>
        <p>{data.provenance.scope}</p>
        <dl className="progress-counts"><div><dt>Model</dt><dd>{data.provenance.model_id}</dd></div>
          <div><dt>Recorded at</dt><dd><time dateTime={data.provenance.recorded_utc}>{data.provenance.recorded_utc}</time></dd></div>
          <div><dt>Recorded tests</dt><dd>{s.trials.length} of {s.max_experiments} permitted tests</dd></div></dl>
      </section>
      <section className="station-panel"><h2>Observed evidence for this case</h2>
        <p>These 120 synthetic measurements belong to the recorded investigation. Abnormal measurements alone do not prove a physical failure. Thermal and waveform summaries are context, not genuine model vision or audio.</p>
        <TelemetryChart rows={s.measurements} flags={s.observed.signals} acquiredAt={s.metadata.acquired_at} />
      </section>
      <section className="station-panel"><h2>Model-generated competing hypotheses</h2>
        <p>Previously generated by the genuine Meta request. Evidence status comes from the independent verifier.</p>
        <div className="case-cards">{s.hypotheses?.hypotheses.map(h => <article key={h.hypothesis_id}>
          <h3>{causeName(h.hypothesis_id)}</h3><p>{h.rationale}</p>
          <p><strong>{resultLabel(s.ranking.find(r => r.hypothesis_id === h.hypothesis_id)?.evidence_status || "UNRESOLVED")}</strong></p>
        </article>)}</div>
      </section>
      <section className="station-panel"><h2>Recorded diagnostic experiments</h2>
        <p>These tests were completed in the synthetic investigation. This view does not run new experiments or control equipment.</p>
        <ol>{s.trials.map(t => <li key={t.id}><strong>{testName(t.kind)}</strong><p>Independent temperature, vibration and pressure reference/control records are preserved in the report.</p></li>)}</ol>
      </section>
      <section className="station-panel"><h2>Independent verification</h2>
        <p><strong>{resultLabel(s.decision.status)}</strong></p>
        <ul>{s.decision.findings.map(f => <li key={f}>{causeName(f)}</li>)}</ul>
        <p>{s.decision.reasons.join(" ")}</p><p>{s.decision.uncertainty}</p>
        <button disabled={busy} onClick={() => void replay()}>{busy ? "Replaying recorded evidence…" : "Replay independent verification"}</button>
        {replayed && <p role="status">Independent replay passed. Recorded observations, test history and findings match. Zero model requests; zero new experiments.</p>}
      </section>
      <section className="station-panel"><h2>Reports and provenance</h2>
        <p><a href="/api/v3/recorded-meta/report.json" download>Download recorded investigation JSON</a>{" · "}
          <a href="/api/v3/recorded-meta/report.html" download>Download recorded investigation HTML</a></p>
        <p>JSON can be independently replayed offline using the instructions in the report. The packaged case survives loss of temporary SQLite sessions.</p>
        <details><summary>Reviewed source and evidence integrity</summary>
          <p>{data.provenance.basis}</p>
          <dl><dt>Packaged evidence SHA-256</dt><dd><code>{data.provenance.artifact_sha256}</code></dd>
            <dt>Observed input hash</dt><dd><code>{data.provenance.input_hash}</code></dd>
            <dt>Model output hash</dt><dd><code>{data.provenance.output_hash}</code></dd></dl>
          <p>This reviewed fixed case is separate from rules-based pump cases and imported mock/test fixtures. Hash/replay consistency is not a cryptographic provider attestation.</p>
        </details>
        <p><a href="/assets/THIRD_PARTY_NOTICES.txt">Model attribution and third-party licenses</a></p>
      </section>
    </>}
  </main>;
}
