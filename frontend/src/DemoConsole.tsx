import { useEffect, useRef, useState } from "react";
import {
  Layers,
  Play,
  ShieldCheck,
  Download,
  RotateCcw,
  Activity,
} from "lucide-react";
import "./demo.css";
type Channel = "temperature" | "vibration" | "pressure";
type Row = {
  minute: number;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
};
type Reference = {
  id: string;
  modality: string;
  summary: string;
  provenance: string;
  scope: string;
};
type Session = {
  id: string;
  version: number;
  status: string;
  dataset_hash: string;
  metadata: { equipment_id: string; investigation_title: string };
  measurements: Row[];
  model_source: string;
  hypotheses: {
    hypotheses: { hypothesis_id: string; rationale: string }[];
  } | null;
  ranking: {
    hypothesis_id: string;
    rank: number;
    evidence_status: string;
    reason: string;
    evidence_refs: string[];
  }[];
  evidence: Reference[];
  asset_features: {
    modalities: {
      thermal?: { hot_pixel_count: number; maximum_celsius: number };
      waveform?: { peak_frequency_hz: number; rms_mm_per_second: number };
    };
  };
  plan: {
    kind: string;
    reason: string;
    competing_predictions: string[];
  } | null;
  trials: { id: string; kind: string }[];
  events: {
    index: number;
    action: string;
    detail: string;
    evidence_refs: string[];
  }[];
  decision: {
    status: string;
    findings: string[];
    reasons: string[];
    uncertainty: string;
    channels: {
      channel: string;
      status: string;
      findings: string[];
      reasons: string[];
      evidence_refs: string[];
    }[];
  };
  verification_scope: string;
  uncertainty_policy: string;
};
type Capabilities = {
  mode: string;
  real_inference_permitted: boolean;
  physical_causality: boolean;
};
const CHANNELS: Channel[] = ["temperature", "vibration", "pressure"];
const UNITS = { temperature: "°C", vibration: "mm/s", pressure: "bar" };
const labels: Record<string, string> = {
  OBSERVED: "Generate competing hypotheses",
  HYPOTHESES_READY: "Select next experiment",
  EXPERIMENT_SELECTED: "Run experiment & verify",
};
const sourceLabel = (source: string) =>
  source === "meta_http_response"
    ? "Recorded Meta endpoint response"
    : source === "test_transport"
      ? "Local HTTP fixture · not Meta"
      : source === "not_run"
        ? "Inference not run"
        : "Rules-based · not Meta";
export default function DemoConsole() {
  const [cap, setCap] = useState<Capabilities | null>(null);
  const [scenarios, setScenarios] = useState<{ id: string; title: string }[]>(
    [],
  );
  const [preset, setPreset] = useState("misleading_sensor");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const token = useRef("");
  const [reload, setReload] = useState(0);
  const [useMeta, setUseMeta] = useState(false);
  const [minute, setMinute] = useState(100);
  const [selectedEvidence, setSelectedEvidence] = useState<string>("telemetry");
  const controller = useRef<AbortController | null>(null);
  async function call(path: string, body?: object, signal?: AbortSignal) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token.current ? { Authorization: "Bearer " + token.current } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (response.status === 401) {
      setAuthRequired(true);
      throw Error(
        "Owner authentication required. Token is kept in memory only.",
      );
    }
    if (!response.ok)
      throw Error(
        response.status === 409
          ? "Investigation changed or an operation is in progress. Restore saved state before continuing."
          : response.status === 429
            ? "Demo capacity limit reached. Wait a minute before retrying."
            : `Request failed (${response.status}). No model fallback was used.`,
      );
    return response.json();
  }
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    Promise.all([
      call("/api/v3/capabilities", undefined, abort.signal),
      call("/api/v3/scenarios", undefined, abort.signal),
    ])
      .then(async ([c, list]) => {
        setCap(c);
        setScenarios(list);
        setAuthRequired(false);
        const saved = localStorage.getItem("forge-sequential-session");
        if (saved) {
          try {
            setSession(
              await call("/api/v3/sessions/" + saved, undefined, abort.signal),
            );
          } catch {
            localStorage.removeItem("forge-sequential-session");
          }
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [reload]);
  async function act(create = false) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    try {
      const result = await call(
        create ? "/api/v3/sessions" : `/api/v3/sessions/${session!.id}/advance`,
        create
          ? { preset, use_meta: useMeta }
          : { expected_version: session!.version },
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setSession(result);
        localStorage.setItem("forge-sequential-session", result.id);
      }
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Connection unavailable");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    setError("");
    try {
      const id =
        session?.id || localStorage.getItem("forge-sequential-session");
      if (id) setSession(await call("/api/v3/sessions/" + id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }
  async function download(format: "json" | "html") {
    setError("");
    try {
      const r = await fetch(
        `/api/v3/sessions/${session!.id}/report.${format}`,
        {
          headers: token.current
            ? { Authorization: "Bearer " + token.current }
            : {},
        },
      );
      if (!r.ok) throw Error("Verified report export unavailable");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forge-sequential.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report export failed");
    }
  }
  const final = session?.status === "COMPLETE";
  const row = session?.measurements[minute];
  const chosen = session?.evidence.find((e) => e.modality === selectedEvidence);
  return (
    <div className="demo-console">
      <header className="demo-header">
        <a href="/demo" className="demo-brand">
          <Layers size={26} /> FORGE<span>Verified investigation systems</span>
        </a>
        <span className="demo-mode">
          {cap?.mode === "public"
            ? "Restricted public demo"
            : cap?.mode === "private"
              ? "Authenticated owner API"
              : "Local development"}{" "}
          · SYNTHETIC
        </span>
      </header>
      <main className="demo-main">
        <div className="demo-intro">
          <div>
            <div className="eyebrow">
              INDUSTRIAL INVESTIGATION / SEQUENTIAL EVIDENCE
            </div>
            <h1>A sensor can hide a failure.</h1>
            <p>
              Compare competing explanations. Choose an experiment. Let
              independent numerical evidence decide.
            </p>
          </div>
          <div className="demo-source">
            <ShieldCheck size={18} />
            <div>
              <b>{sourceLabel(session?.model_source || "not_run")}</b>
              <small>
                {cap?.real_inference_permitted
                  ? "Real inference is separately opt-in and budgeted."
                  : "Real Meta inference unavailable in this mode. Baseten approval/access remains a prerequisite."}
              </small>
            </div>
          </div>
        </div>
        <div className="demo-disclosure">
          Synthetic telemetry and scripted interventions. Findings apply only to
          this model; no physical-world cause or safety certification is
          established. Thermal/waveform features are context, not verified
          visual reasoning.
        </div>
        {authRequired && (
          <section className="demo-card owner-login">
            <label>
              Owner access token (not stored)
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              onClick={() => {
                token.current = tokenInput;
                setTokenInput("");
                setReload(reload + 1);
              }}
            >
              Connect owner API
            </button>
          </section>
        )}
        {error && (
          <div className="demo-error" role="alert">
            {error}{" "}
            <button onClick={() => setReload(reload + 1)}>Reconnect</button>
            {session && <button onClick={restore}>Restore saved state</button>}
          </div>
        )}
        <section className="demo-card demo-controls">
          <label>
            Synthetic case
            <select
              aria-label="Sequential demo case"
              value={preset}
              disabled={busy}
              onChange={(e) => setPreset(e.target.value)}
            >
              {scenarios.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="demo-meta">
            <input
              type="checkbox"
              aria-label="Use real Meta inference"
              checked={useMeta}
              onChange={(e) => setUseMeta(e.target.checked)}
              disabled={!cap?.real_inference_permitted || busy}
            />{" "}
            Real Meta inference <small>Never enabled automatically</small>
          </label>
          <button
            className="demo-primary"
            disabled={busy || !cap}
            onClick={() => act(true)}
          >
            <Play size={14} />
            {busy ? "Working…" : "Start investigation"}
          </button>
        </section>
        {!session && (
          <section className="demo-empty">
            <div>
              <span>01</span>
              <h2>Observe</h2>
              <p>A biased sensor can mask a real pressure departure.</p>
            </div>
            <div>
              <span>02</span>
              <h2>Test</h2>
              <p>
                Reference and targeted interventions separate competing
                explanations.
              </p>
            </div>
            <div>
              <span>03</span>
              <h2>Verify</h2>
              <p>
                Numerical checks accept, reject or abstain. Model confidence
                cannot override them.
              </p>
            </div>
          </section>
        )}
        {session && (
          <>
            <section className="demo-summary">
              <div>
                <span>Investigation</span>
                <b>{session.status.replaceAll("_", " ")}</b>
                <small>
                  {session.metadata.equipment_id} · saved version{" "}
                  {session.version}
                </small>
              </div>
              <div>
                <span>Experiments used</span>
                <b>{session.trials.length} / 4</b>
                <small>96 independent synthetic replicates each</small>
              </div>
              <div>
                <span>Evidence decision</span>
                <b>{session.decision.status.replaceAll("_", " ")}</b>
                <small>Ranking is ordinal, not a probability</small>
              </div>
            </section>
            <section className="demo-card">
              <div className="demo-section-title">
                <h2>
                  <Activity size={18} /> Telemetry evidence
                </h2>
                <label>
                  Explore minute{" "}
                  <input
                    aria-label="Telemetry minute"
                    type="range"
                    min="0"
                    max="119"
                    value={minute}
                    onChange={(e) => setMinute(Number(e.target.value))}
                  />{" "}
                  {minute}
                </label>
              </div>
              <div className="demo-charts">
                {CHANNELS.map((channel) => {
                  const values = session.measurements
                    .map((r) => r[channel])
                    .filter((v): v is number => v !== null);
                  const low = Math.min(...values),
                    high = Math.max(...values);
                  const segments: string[] = [];
                  let points: string[] = [];
                  session.measurements.forEach((r, i) => {
                    const value = r[channel];
                    if (value === null) {
                      if (points.length) segments.push(points.join(" "));
                      points = [];
                    } else
                      points.push(
                        `${10 + (i / 119) * 300},${100 - ((value - low) / (high - low || 1)) * 80}`,
                      );
                  });
                  if (points.length) segments.push(points.join(" "));
                  return (
                    <article key={channel}>
                      <h3>{channel}</h3>
                      <strong>
                        {row?.[channel]?.toFixed(2) ?? "Missing"}{" "}
                        <small>{UNITS[channel]}</small>
                      </strong>
                      <svg
                        viewBox="0 0 320 120"
                        role="img"
                        aria-label={`${channel} sequential telemetry`}
                      >
                        <line
                          x1="10"
                          y1="102"
                          x2="310"
                          y2="102"
                          stroke="#dce6d3"
                        />
                        {segments.map((p, i) => (
                          <polyline
                            key={i}
                            points={p}
                            fill="none"
                            stroke="#62804a"
                            strokeWidth="2"
                          />
                        ))}
                        <line
                          x1={10 + (minute / 119) * 300}
                          x2={10 + (minute / 119) * 300}
                          y1="10"
                          y2="104"
                          stroke="#c18a4b"
                          strokeDasharray="3 3"
                        />
                      </svg>
                      <small>0m — 119m · missing samples create gaps</small>
                    </article>
                  );
                })}
              </div>
            </section>
            <div className="demo-workspace">
              <section className="demo-card">
                <div className="demo-section-title">
                  <h2>Competing hypotheses</h2>
                  <span>{sourceLabel(session.model_source)}</span>
                </div>
                {!session.hypotheses ? (
                  <p className="demo-muted">
                    Generate competing candidates before selecting an
                    intervention.
                  </p>
                ) : (
                  <>
                    <p className="demo-muted">
                      Evidence fit, not model confidence. Candidate text is
                      untrusted.
                    </p>
                    <div className="hypothesis-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Candidate</th>
                            <th>Numerical evidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {session.ranking.map((r) => (
                            <tr key={r.hypothesis_id}>
                              <td>{r.rank}</td>
                              <td>
                                <details>
                                  <summary>{r.hypothesis_id}</summary>
                                  <p>
                                    {
                                      session.hypotheses?.hypotheses.find(
                                        (h) =>
                                          h.hypothesis_id === r.hypothesis_id,
                                      )?.rationale
                                    }
                                  </p>
                                  <p>{r.reason}</p>
                                  <small className="demo-digest">
                                    {r.evidence_refs.join(", ")}
                                  </small>
                                </details>
                              </td>
                              <td>
                                <span
                                  className={`demo-badge ${r.evidence_status === "SUPPORTED" ? "supported" : ""}`}
                                >
                                  {r.evidence_status.replaceAll("_", " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                <div className="demo-next">
                  <h3>
                    {final
                      ? "Investigation complete"
                      : session.plan
                        ? "Selected: " + session.plan.kind.replaceAll("_", " ")
                        : "Next decision"}
                  </h3>
                  {session.plan && (
                    <>
                      <p>{session.plan.reason}</p>
                      <ul>
                        {session.plan.competing_predictions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!final && (
                    <button
                      className="demo-primary"
                      disabled={busy}
                      onClick={() => act()}
                    >
                      <Play size={13} />
                      {busy ? "Working…" : labels[session.status]}
                    </button>
                  )}
                  {final && (
                    <>
                      <h3 className="demo-finding">
                        {session.decision.status === "SUPPORTED_SYNTHETIC"
                          ? "Supported in the synthetic model"
                          : "No complete supported finding"}
                      </h3>
                      <p>
                        {session.decision.findings.length
                          ? session.decision.findings.join(" + ")
                          : "Explicit abstention or inconclusive evidence"}
                      </p>
                      <ul>
                        {session.decision.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <p className="demo-muted">
                        {session.decision.uncertainty}
                      </p>
                      <div className="demo-downloads">
                        <button onClick={() => download("json")}>
                          <Download size={14} /> Export replayable JSON
                        </button>
                        <button onClick={() => download("html")}>
                          <Download size={14} /> Export readable HTML
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
              <div>
                <section className="demo-card">
                  <div className="demo-section-title">
                    <h2>Experiment timeline</h2>
                    <button
                      aria-label="Restore persisted investigation"
                      onClick={restore}
                      disabled={busy}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <ol className="demo-timeline">
                    {session.events.map((event) => (
                      <li key={event.index}>
                        <span>{String(event.index + 1).padStart(2, "0")}</span>
                        <div>
                          <b>{event.action.replaceAll("_", " ")}</b>
                          <p>{event.detail.replaceAll("_", " ")}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <small className="demo-muted">
                    Durable local-disk state · optimistic versions prevent
                    duplicate execution.
                  </small>
                </section>
                <section className="demo-card">
                  <h2>Cross-modal evidence ledger</h2>
                  <div
                    className="demo-evidence-tabs"
                    role="group"
                    aria-label="Evidence modality"
                  >
                    {session.evidence.map((e) => (
                      <button
                        key={e.id}
                        aria-pressed={selectedEvidence === e.modality}
                        onClick={() => setSelectedEvidence(e.modality)}
                      >
                        {e.modality}
                      </button>
                    ))}
                  </div>
                  {chosen && (
                    <div className="demo-evidence-detail">
                      <h3>{chosen.modality}</h3>
                      <p>{chosen.summary}</p>
                      <p>
                        Provenance: {chosen.provenance.replaceAll("_", " ")}
                      </p>
                      <code className="demo-digest">{chosen.id}</code>
                      {chosen.modality === "thermal" &&
                        session.asset_features.modalities.thermal && (
                          <p>
                            {
                              session.asset_features.modalities.thermal
                                .maximum_celsius
                            }{" "}
                            °C maximum ·{" "}
                            {
                              session.asset_features.modalities.thermal
                                .hot_pixel_count
                            }{" "}
                            spatial hot pixels; no temporal alignment claim.
                          </p>
                        )}
                      {chosen.modality === "waveform" &&
                        session.asset_features.modalities.waveform && (
                          <p>
                            {
                              session.asset_features.modalities.waveform
                                .peak_frequency_hz
                            }{" "}
                            Hz peak ·{" "}
                            {session.asset_features.modalities.waveform.rms_mm_per_second.toFixed(
                              3,
                            )}{" "}
                            mm/s RMS
                          </p>
                        )}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
        <footer className="demo-footer">
          <span>FORGE / Evidence before explanation</span>
          <span>
            Real Meta outputs are a submission prerequisite; this mode does not
            substitute for them.
          </span>
        </footer>
      </main>
    </div>
  );
}
