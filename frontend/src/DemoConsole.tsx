import { useEffect, useRef, useState } from "react";
import {
  Layers,
  Play,
  ShieldCheck,
  Download,
  RotateCcw,
  Activity,
  FileText,
  FlaskConical,
  ChevronRight,
  ArrowUpRight,
  Database,
  Menu,
} from "lucide-react";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
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
  observed: {
    signals: { channel: string; flags: number; max_score: number }[];
    quality_issues: string[];
  };
  assets: {
    thermal?: { pixels: number[][]; declared_synthetic: boolean } | null;
    waveform?: { samples: number[]; sample_rate_hz: number } | null;
  };
  metadata: { equipment_id: string; investigation_title: string };
  measurements: Row[];
  model_source: string;
  inference?: {
    input_mode?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    } | null;
  } | null;
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
  trials: {
    id: string;
    kind: string;
    probes?: {
      channel: string;
      witness_before: number[];
      witness_after: number[];
      primary_before: number[];
      primary_after: number[];
    }[];
  }[];
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
  real_inference_verified?: boolean;
  model_configuration?: string;
  persistence?: string;
  hosting_notice?: string | null;
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
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export default function DemoConsole() {
  const [view, setView] = useState("Workspace");
  const [navOpen, setNavOpen] = useState(false);
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
      throw new ApiError(
        response.status,
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
          } catch (e) {
            if (e instanceof ApiError && e.status === 404) {
              localStorage.removeItem("forge-sequential-session");
              setError(
                "Saved investigation is missing or expired, possibly after a host restart. Start a new synthetic case; exported reports remain independently replayable.",
              );
            } else {
              setError(
                e instanceof Error
                  ? e.message
                  : "Saved state could not be restored. Retry after the host is ready.",
              );
            }
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
        if (create) setView("Workspace");
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
  const chosen = session?.evidence.find((e) => e.modality === selectedEvidence);
  const step = session
    ? Math.min(
        5,
        session.status === "OBSERVED"
          ? 1
          : session.status === "HYPOTHESES_READY"
            ? session.trials.length
              ? 3
              : 2
            : session.status === "EXPERIMENT_SELECTED"
              ? 3
              : 5,
      )
    : 0;
  const nextAction = labels[session?.status || ""] || "Start investigation";
  const views = [
    { name: "Workspace", icon: Layers },
    { name: "Evidence", icon: Database },
    { name: "Hypotheses", icon: Activity },
    { name: "Experiments", icon: FlaskConical },
    { name: "Verification", icon: ShieldCheck },
    { name: "Reports", icon: FileText },
  ];
  const navigate = (name: string) => {
    setView(name);
    setNavOpen(false);
    if (window.innerWidth <= 700)
      requestAnimationFrame(() =>
        document.getElementById("forge-content")?.focus(),
      );
  };
  const hypotheses = (
    <section className="forge-panel" aria-labelledby="hypothesis-heading">
      <div className="panel-heading">
        <div>
          <span className="section-code">02 / COMPETING EXPLANATIONS</span>
          <h2 id="hypothesis-heading">Hypothesis register</h2>
        </div>
        <span className="quiet-label">Ordinal rank · not probability</span>
      </div>
      {!session?.hypotheses ? (
        <Empty
          title="Explanations come before conclusions"
          text="Generate competing candidates, then test them against independent evidence. Candidate text cannot change the verifier."
        />
      ) : (
        <div className="hypothesis-register">
          {session.ranking.map((r) => (
            <details key={r.hypothesis_id} className="hypothesis-row">
              <summary>
                <span className="rank-index">
                  {String(r.rank).padStart(2, "0")}
                </span>
                <span className="hypothesis-name">
                  {human(r.hypothesis_id)}
                  <small>{r.hypothesis_id}</small>
                </span>
                <Status value={r.evidence_status} />
                <ChevronRight size={15} aria-hidden="true" />
              </summary>
              <div className="hypothesis-detail">
                <p>
                  {
                    session.hypotheses?.hypotheses.find(
                      (h) => h.hypothesis_id === r.hypothesis_id,
                    )?.rationale
                  }
                </p>
                <dl>
                  <div>
                    <dt>Numerical evidence</dt>
                    <dd>{r.reason}</dd>
                  </div>
                  <div>
                    <dt>
                      {r.evidence_status === "CONTRADICTED"
                        ? "Contradictory references"
                        : "Evidence references"}
                    </dt>
                    <dd className="digest">
                      {r.evidence_refs.join(" · ") ||
                        "No independent evidence yet"}
                    </dd>
                  </div>
                  <div>
                    <dt>Experiment history</dt>
                    <dd>
                      {session.trials.map((t) => human(t.kind)).join(" → ") ||
                        "No experiments executed"}
                    </dd>
                  </div>
                </dl>
              </div>
            </details>
          ))}
        </div>
      )}
      <div className="panel-foot">
        {sourceLabel(session?.model_source || "not_run")} · Independent evidence
        determines status.
      </div>
    </section>
  );
  const timeline = (
    <section className="forge-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">03 / CONTROLLED TESTS</span>
          <h2>Investigation timeline</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Restore persisted investigation"
          onClick={restore}
          disabled={busy || !session}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      {!session ? (
        <Empty
          title="An auditable sequence"
          text="Every hypothesis, selection and experiment appears here as it happens."
        />
      ) : (
        <ol className="forge-timeline">
          {session.events.map((e) => (
            <li key={e.index}>
              <span className="event-number">
                {String(e.index + 1).padStart(2, "0")}
              </span>
              <div>
                <span className="event-action">{human(e.action)}</span>
                <p>{e.detail.replaceAll("_", " ")}</p>
                {e.evidence_refs.length > 0 && (
                  <small className="digest">{e.evidence_refs.join(", ")}</small>
                )}
              </div>
              {e.action === "execute_and_verify" && (
                <ShieldCheck size={16} aria-label="Numerically verified" />
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="panel-foot">
        {cap?.persistence === "ephemeral_sqlite"
          ? "Ephemeral local state · export completed reports before leaving."
          : "Versioned local state · stale actions cannot execute twice."}
      </div>
    </section>
  );
  const verification = (
    <section className="forge-panel verification-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">04 / INDEPENDENT VERIFICATION</span>
          <h2>Evidence, not model confidence</h2>
        </div>
        <ShieldCheck size={22} />
      </div>
      {!session ? (
        <Empty
          title="Verification has the final word"
          text="The verifier recomputes numerical checks from telemetry and controlled trials. It can support, reject, remain inconclusive or abstain."
        />
      ) : (
        <>
          <div className="verdict">
            <Status value={session.decision.status} />
            <h3>
              {final
                ? session.decision.status === "SUPPORTED_SYNTHETIC"
                  ? "Supported in the synthetic model"
                  : "No complete supported finding"
                : "Investigation in progress"}
            </h3>
            <p>
              {session.decision.findings.length
                ? session.decision.findings.join(" + ")
                : final
                  ? "Explicit abstention or inconclusive evidence"
                  : "No final finding yet. Continue controlled experiments."}
            </p>
          </div>
          <div className="channel-verdicts">
            {session.decision.channels.map((c) => (
              <article key={c.channel}>
                <div>
                  <strong>{human(c.channel)}</strong>
                  <Status value={c.status} />
                </div>
                <p>
                  {c.findings.length
                    ? c.findings.map(human).join(" + ")
                    : c.reasons.join("; ")}
                </p>
                <details>
                  <summary>Inspect numerical references</summary>
                  <p>{c.reasons.join("; ")}</p>
                  <code className="digest">{c.evidence_refs.join(", ")}</code>
                  <div className="numerical-table-wrap">
                    <table className="numerical-table">
                      <caption>
                        Witness means in normalized baseline units ·
                        descriptive, not a probability
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Experiment</th>
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
                                <th scope="row">{human(t.kind)}</th>
                                <td>
                                  {(
                                    p.witness_before.reduce(
                                      (a, b) => a + b,
                                      0,
                                    ) / p.witness_before.length
                                  ).toFixed(2)}
                                </td>
                                <td>
                                  {(
                                    p.witness_after.reduce((a, b) => a + b, 0) /
                                    p.witness_after.length
                                  ).toFixed(2)}
                                </td>
                                <td>{p.witness_before.length}</td>
                              </tr>
                            )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              </article>
            ))}
          </div>
          <div className="uncertainty-note">
            <strong>Uncertainty & scope</strong>
            <p>{session.decision.uncertainty}</p>
            <p>{session.verification_scope}</p>
            <ul>
              {session.decision.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
  const evidence = (
    <section className="forge-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">01 / EVIDENCE LEDGER</span>
          <h2>Inspect the source</h2>
        </div>
        <span className="quiet-label">Content-bound provenance</span>
      </div>
      {!session ? (
        <Empty
          title="Bring evidence into focus"
          text="The fixed synthetic case includes telemetry, a calibrated thermal array, a vibration waveform and investigation metadata."
        />
      ) : (
        <>
          <div
            className="evidence-tabs"
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
            <div className="evidence-inspector">
              <div className="inspector-title">
                <h3>{human(chosen.modality)}</h3>
                <span className="quiet-label">
                  {chosen.scope.replaceAll("_", " ")}
                </span>
              </div>
              {chosen.modality === "thermal" && session.assets.thermal && (
                <Thermal pixels={session.assets.thermal.pixels} />
              )}
              {chosen.modality === "waveform" && session.assets.waveform && (
                <Waveform
                  samples={session.assets.waveform.samples}
                  rate={session.assets.waveform.sample_rate_hz}
                />
              )}
              {chosen.modality === "telemetry" && (
                <p>
                  120 minute-indexed readings · temperature, vibration and
                  pressure. Missing readings remain gaps, never interpolated
                  evidence.
                </p>
              )}
              {chosen.modality === "metadata" && (
                <dl className="metadata-list">
                  <div>
                    <dt>Equipment</dt>
                    <dd>{session.metadata.equipment_id}</dd>
                  </div>
                  <div>
                    <dt>Investigation</dt>
                    <dd>{session.metadata.investigation_title}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>Operator-declared synthetic case</dd>
                  </div>
                </dl>
              )}
              <p>{chosen.summary}</p>
              {session.inference && (
                <p className="provenance-line">
                  Recorded model input:{" "}
                  {session.inference.input_mode || "numerical_summaries"} ·{" "}
                  {sourceLabel(session.model_source)}
                </p>
              )}
              <p className="provenance-line">
                Provenance: {chosen.provenance.replaceAll("_", " ")}
              </p>
              <details>
                <summary>Content digest & interpretation limits</summary>
                <code className="digest">{chosen.id}</code>
                <p>
                  No independently established temporal alignment or physical
                  causality. Thermal and waveform processing is deterministic;
                  no model-based visual analysis has been verified.
                </p>
              </details>
              {chosen.modality === "thermal" &&
                session.asset_features.modalities.thermal && (
                  <p className="feature-readout">
                    {session.asset_features.modalities.thermal.maximum_celsius}{" "}
                    °C maximum ·{" "}
                    {session.asset_features.modalities.thermal.hot_pixel_count}{" "}
                    spatial hot pixels; no temporal alignment claim.
                  </p>
                )}
              {chosen.modality === "waveform" &&
                session.asset_features.modalities.waveform && (
                  <p className="feature-readout">
                    {
                      session.asset_features.modalities.waveform
                        .peak_frequency_hz
                    }{" "}
                    Hz spectral peak ·{" "}
                    {session.asset_features.modalities.waveform.rms_mm_per_second.toFixed(
                      3,
                    )}{" "}
                    mm/s RMS. Signal processing, not model audio interpretation.
                  </p>
                )}
            </div>
          )}
        </>
      )}
    </section>
  );
  const reports = (
    <section className="forge-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">05 / REPRODUCIBLE OUTPUT</span>
          <h2>Investigation report</h2>
        </div>
        <FileText size={22} />
      </div>
      <div className="report-preview">
        <div className="report-sheet">
          <span className="section-code">FORGE / INVESTIGATION RECORD</span>
          <h3>
            {session?.metadata.investigation_title ||
              "Evidence before explanation"}
          </h3>
          <p>
            {session
              ? session.metadata.equipment_id +
                " / " +
                session.id.slice(0, 8).toUpperCase()
              : "Complete an investigation to export its evidence."}
          </p>
          <hr />
          <dl>
            <div>
              <dt>Model provenance</dt>
              <dd>{sourceLabel(session?.model_source || "not_run")}</dd>
            </div>
            <div>
              <dt>Independent decision</dt>
              <dd>
                {session?.decision.status.replaceAll("_", " ") ||
                  "Not evaluated"}
              </dd>
            </div>
            <div>
              <dt>Controlled experiments</dt>
              <dd>{session?.trials.length || 0} / 4</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>
                Synthetic model only · no physical-world causality established
              </dd>
            </div>
          </dl>
        </div>
        <div className="report-actions">
          <h3>Take the evidence with you.</h3>
          <p>
            JSON includes the numerical record for offline replay. HTML provides
            a readable investigation trail. Content hashes support consistency,
            not signed authenticity.
          </p>
          <button
            disabled={!final || busy}
            className="primary-button"
            onClick={() => download("json")}
          >
            <Download size={16} /> Export replayable JSON
          </button>
          <button disabled={!final || busy} onClick={() => download("html")}>
            <Download size={16} /> Export readable HTML
          </button>
          {!final && (
            <p className="quiet-label">Complete or abstain before exporting.</p>
          )}
          <code>python -m forge.phase3.replay report.json</code>
        </div>
      </div>
    </section>
  );
  return (
    <div
      className="forge-app"
      onKeyDown={(e) => {
        if (e.key === "Escape" && navOpen) {
          setNavOpen(false);
          (
            document.querySelector(
              '[aria-label="Toggle navigation"]',
            ) as HTMLButtonElement | null
          )?.focus();
        }
      }}
    >
      <a className="skip-link" href="#forge-content">
        Skip to investigation
      </a>
      <aside
        id="forge-navigation"
        className={"forge-sidebar " + (navOpen ? "is-open" : "")}
      >
        <a
          className="forge-brand"
          href="/demo"
          aria-label="FORGE investigation workspace"
        >
          <span className="forge-mark">
            <Layers size={23} />
          </span>
          <span>
            FORGE<small>INVESTIGATION SYSTEMS</small>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Investigation navigation">
          {views.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              aria-current={view === name ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {name}
              {name === "Evidence" && session && (
                <span className="nav-count">{session.evidence.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-method">
          <ShieldCheck size={18} />
          <strong>Evidence before explanation.</strong>
          <p>
            Every conclusion is constrained by an independent numerical
            verifier.
          </p>
        </div>
        <div className="sidebar-footer">
          <span>Research environment</span>
          <strong>Synthetic systems only</strong>
          <span>FORGE / BUILD 2026.10</span>
        </div>
      </aside>
      <div className="forge-body">
        <header className="forge-topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Toggle navigation"
            aria-controls="forge-navigation"
            aria-expanded={navOpen}
            onClick={() => {
              setNavOpen(!navOpen);
              if (!navOpen)
                requestAnimationFrame(() =>
                  (
                    document.querySelector(
                      "#forge-navigation nav button",
                    ) as HTMLButtonElement | null
                  )?.focus(),
                );
            }}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            <span className="mobile-wordmark">FORGE</span>
            <span className="desktop-breadcrumb">Investigations</span>{" "}
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{view}</strong>
          </div>
          <span className="environment-label">
            {!cap
              ? "Connecting to backend"
              : cap.mode === "public"
                ? "Restricted public demo"
                : cap?.mode === "private"
                  ? "Authenticated owner API"
                  : "Local development"}{" "}
            · SYNTHETIC
          </span>
        </header>
        <main
          id="forge-content"
          tabIndex={-1}
          className="forge-content"
          aria-busy={busy}
        >
          <div className="page-title">
            <div>
              <span className="section-code">
                VERIFIABLE MULTIMODAL INVESTIGATION
              </span>
              <h1>{view === "Workspace" ? "Follow the evidence." : view}</h1>
              <p>
                {view === "Workspace"
                  ? "Competing explanations. Controlled experiments. Independently verified findings."
                  : "A traceable record of what was observed, tested and supported."}
              </p>
            </div>
            <div className="source-stamp">
              <span>MODEL PROVENANCE</span>
              <strong>{sourceLabel(session?.model_source || "not_run")}</strong>
              <small>
                {cap?.real_inference_verified
                  ? "Authenticated response recorded; budgets still apply."
                  : cap?.model_configuration === "configured_unverified"
                    ? "Configured · authenticated integration test required"
                    : "Real Meta inference unavailable in this mode."}
              </small>
            </div>
          </div>
          {cap?.hosting_notice && (
            <div className="hosting-notice" role="note">
              <Database size={16} />
              <span>{cap.hosting_notice}</span>
            </div>
          )}
          {authRequired && (
            <section className="forge-panel owner-login">
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
            <div className="forge-error" role="alert">
              <strong>Action required</strong>
              <span>{error}</span>
              <button onClick={() => setReload(reload + 1)}>Reconnect</button>
              {session && (
                <button onClick={restore}>Restore saved state</button>
              )}
            </div>
          )}
          <section className="case-bar" aria-label="Investigation controls">
            <div className="case-selector">
              <label htmlFor="forge-case">SYNTHETIC INVESTIGATION</label>
              <select
                id="forge-case"
                aria-label="Sequential demo case"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                disabled={busy}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <label className="model-switch">
              <input
                type="checkbox"
                aria-label="Use real Meta inference"
                checked={useMeta}
                onChange={(e) => setUseMeta(e.target.checked)}
                disabled={
                  !cap?.real_inference_permitted ||
                  !cap?.real_inference_verified ||
                  busy
                }
              />
              <span>
                Meta inference
                <small>
                  {cap?.real_inference_verified
                    ? "Explicitly opt in"
                    : "Integration test required"}
                </small>
              </span>
            </label>
            <button
              className={session ? "secondary-button" : "primary-button"}
              onClick={() => act(true)}
              disabled={busy || !cap}
            >
              <Play size={15} />
              {busy
                ? "Working…"
                : session
                  ? "Start investigation"
                  : "Start investigation"}
            </button>
          </section>
          {!session ? (
            <>
              <section className="empty-workspace">
                <div>
                  <span className="section-code">THE INVESTIGATION LOOP</span>
                  <h2>
                    A plausible explanation
                    <br />
                    is only the beginning.
                  </h2>
                  <p>
                    A biased sensor can hide a real process departure. FORGE
                    separates competing mechanisms through repeatable tests,
                    then lets numerical evidence decide.
                  </p>
                  <span className="empty-caption">
                    Select a synthetic case above to begin.
                  </span>
                </div>
                <ol>
                  {[
                    {
                      n: "01",
                      title: "Observe",
                      text: "Inspect telemetry and provenance across evidence modalities.",
                    },
                    {
                      n: "02",
                      title: "Challenge",
                      text: "Compare hypotheses and select an informative intervention.",
                    },
                    {
                      n: "03",
                      title: "Verify",
                      text: "Recompute support, contradictions and uncertainty independently.",
                    },
                  ].map((x) => (
                    <li key={x.n}>
                      <span>{x.n}</span>
                      <div>
                        <h3>{x.title}</h3>
                        <p>{x.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              {view === "Evidence"
                ? evidence
                : view === "Hypotheses"
                  ? hypotheses
                  : view === "Experiments"
                    ? timeline
                    : view === "Verification"
                      ? verification
                      : view === "Reports"
                        ? reports
                        : null}
            </>
          ) : (
            <>
              <section className="case-header">
                <div>
                  <span className="case-identifier">
                    CASE {session.id.slice(0, 8).toUpperCase()} /{" "}
                    {session.metadata.equipment_id}
                  </span>
                  <h2>{session.metadata.investigation_title}</h2>
                  <div className="case-meta">
                    <Status value={session.status} />
                    <span>Saved version {session.version}</span>
                    <span>{session.trials.length} / 4 experiments</span>
                    <span>96 independent synthetic replicates / test</span>
                  </div>
                </div>
                {!final && (
                  <button
                    className="primary-button"
                    onClick={() => act()}
                    disabled={busy}
                  >
                    <Play size={15} />
                    {busy ? "Working…" : nextAction}
                  </button>
                )}
                {final && (
                  <button
                    className="secondary-button"
                    onClick={() => navigate("Reports")}
                  >
                    <FileText size={16} /> View report{" "}
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </section>
              <ol className="workflow-rail" aria-label="Investigation progress">
                {[
                  "Observe",
                  "Hypothesize",
                  "Experiment",
                  "Verify",
                  "Report",
                ].map((name, i) => (
                  <li
                    key={name}
                    className={
                      (step > i ? "is-complete " : "") +
                      (step === i + 1 ? "is-current" : "")
                    }
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {name}
                  </li>
                ))}
              </ol>
              {(view === "Workspace" || view === "Evidence") && (
                <section className="forge-panel telemetry-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-code">
                        01 / OBSERVED TELEMETRY
                      </span>
                      <h2>Signal overview</h2>
                    </div>
                    <label className="time-inspector">
                      Inspect minute{" "}
                      <input
                        aria-label="Telemetry minute"
                        type="range"
                        min="0"
                        max="119"
                        value={minute}
                        onChange={(e) => setMinute(Number(e.target.value))}
                      />
                      <output>{minute}m</output>
                    </label>
                  </div>
                  <div className="telemetry-grid">
                    {CHANNELS.map((channel) => (
                      <SignalChart
                        key={channel}
                        channel={channel}
                        rows={session.measurements}
                        minute={minute}
                        onMinute={setMinute}
                        flags={
                          session.observed?.signals.find(
                            (s) => s.channel === channel,
                          )?.flags || 0
                        }
                      />
                    ))}
                  </div>
                  <div className="panel-foot">
                    <span>
                      <i className="legend-line" /> Synthetic primary sensor
                    </span>
                    <span>
                      <i className="legend-cursor" /> Inspection cursor
                    </span>
                    <span>0–119 minutes · missing samples remain gaps</span>
                    <details>
                      <summary>Dataset provenance</summary>
                      <code className="digest">{session.dataset_hash}</code>
                      <p>
                        Synthetic factory; operating state: running. Statistical
                        anomalies do not prove a physical failure.
                      </p>
                    </details>
                  </div>
                </section>
              )}
              {view === "Workspace" ? (
                <>
                  <div className="workspace-grid">
                    <div>
                      {hypotheses}
                      {session.plan && (
                        <section className="experiment-callout">
                          <div className="section-code">
                            NEXT / {human(session.plan.kind)}
                          </div>
                          <h3>What will this test distinguish?</h3>
                          <p>{session.plan.reason}</p>
                          <ul>
                            {session.plan.competing_predictions.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                          <p className="quiet-label">
                            Deterministic selection · controlled synthetic
                            execution
                          </p>
                        </section>
                      )}
                    </div>
                    <div>
                      {timeline}
                      <section className="decision-summary">
                        <span className="section-code">
                          INDEPENDENT VERIFIER
                        </span>
                        <Status value={session.decision.status} />
                        <h3>
                          {final
                            ? session.decision.status === "SUPPORTED_SYNTHETIC"
                              ? "Supported in the synthetic model"
                              : "No complete supported finding"
                            : "Evidence collection in progress"}
                        </h3>
                        <p>
                          {session.decision.findings.length
                            ? session.decision.findings.join(" + ")
                            : final
                              ? "Explicit abstention or inconclusive evidence"
                              : "No supported conclusion yet."}
                        </p>
                        <button onClick={() => navigate("Verification")}>
                          Inspect verification <ArrowUpRight size={14} />
                        </button>
                      </section>
                    </div>
                  </div>
                  {final && (
                    <div className="completion-actions">
                      <span>Preserve the complete evidence trail.</span>
                      <button onClick={() => download("json")}>
                        <Download size={15} /> Export replayable JSON
                      </button>
                      <button onClick={() => download("html")}>
                        <Download size={15} /> Export readable HTML
                      </button>
                    </div>
                  )}
                </>
              ) : view === "Evidence" ? (
                evidence
              ) : view === "Hypotheses" ? (
                hypotheses
              ) : view === "Experiments" ? (
                <>
                  {session.plan && (
                    <section className="experiment-callout">
                      <h3>Selected: {human(session.plan.kind)}</h3>
                      <p>{session.plan.reason}</p>
                      <ul>
                        {session.plan.competing_predictions.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {timeline}
                </>
              ) : view === "Verification" ? (
                verification
              ) : (
                reports
              )}
            </>
          )}
          <footer className="forge-footer">
            <strong>FORGE</strong>
            <span>
              Synthetic investigation. No physical-world causality or industrial
              safety certification.
            </span>
            <span>
              Thermal/waveform features are context, not verified visual
              reasoning.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function human(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function Status({ value }: { value: string }) {
  const text: Record<string, string> = {
    SUPPORTED: "Supported",
    SUPPORTED_SYNTHETIC: "Supported · synthetic",
    CONTRADICTED: "Rejected",
    REJECTED: "Rejected",
    NEEDS_TEST: "Not tested",
    UNRESOLVED: "Inconclusive",
    INCONCLUSIVE: "Inconclusive",
    ABSTAIN: "Abstained",
    IN_PROGRESS: "In progress",
    BASELINE_CONSISTENT: "Baseline consistent",
    COMPLETE: "Complete",
    OBSERVED: "Observed",
    HYPOTHESES_READY: "Hypotheses ready",
    EXPERIMENT_SELECTED: "Experiment selected",
  };
  const tone =
    value.startsWith("SUPPORTED") || value === "BASELINE_CONSISTENT"
      ? "positive"
      : value === "REJECTED" || value === "CONTRADICTED"
        ? "negative"
        : value === "INCONCLUSIVE" ||
            value === "ABSTAIN" ||
            value === "UNRESOLVED"
          ? "caution"
          : "neutral";
  return (
    <span className={"status-badge " + tone}>
      {text[value] || human(value)}
    </span>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function SignalChart({
  channel,
  rows,
  minute,
  onMinute,
  flags,
}: {
  channel: Channel;
  rows: Row[];
  minute: number;
  onMinute: (n: number) => void;
  flags: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const index = hover ?? minute;
  const values = rows
    .map((r) => r[channel])
    .filter((v): v is number => v !== null);
  const minimum = values.length ? Math.min(...values) : 0,
    maximum = values.length ? Math.max(...values) : 1;
  const pad = Math.max(
    (maximum - minimum) * 0.15,
    channel === "temperature" ? 0.5 : channel === "pressure" ? 0.05 : 0.02,
  );
  const low = minimum - pad,
    high = maximum + pad;
  const x = (i: number) => 42 + (i / 119) * 284;
  const y = (v: number) => 136 - ((v - low) / (high - low)) * 106;
  const segments: string[] = [];
  let points: string[] = [];
  rows.forEach((r, i) => {
    if (r[channel] === null) {
      if (points.length) segments.push(points.join(" "));
      points = [];
    } else points.push(`${x(i)},${y(r[channel]!)}`);
  });
  if (points.length) segments.push(points.join(" "));
  const missing = rows.filter((r) => r[channel] === null).length;
  const current = rows[index]?.[channel];
  return (
    <article className="signal-chart">
      <div className="signal-heading">
        <h3>{human(channel)}</h3>
        <span className={flags ? "signal-flag" : "quiet-label"}>
          {flags ? flags + " flagged" : "No flags"}
        </span>
      </div>
      <div className="signal-value">
        {current?.toFixed(2) ?? "—"}
        <span>{UNITS[channel]}</span>
        <small>
          at {index}m{current === null ? " · missing" : ""}
        </small>
      </div>
      <svg
        viewBox="0 0 344 166"
        role="img"
        aria-label={`${channel} sequential telemetry`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                119,
                Math.round(
                  (((e.clientX - rect.left) / rect.width) * 344 - 42) / 284,
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setHover(null)}
        onClick={() => onMinute(index)}
      >
        <title>
          {human(channel)} in {UNITS[channel]}, minutes 0 to 119. {missing}{" "}
          missing samples. Use the telemetry minute slider for keyboard
          inspection.
        </title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="42"
              x2="326"
              y1={136 - f * 106}
              y2={136 - f * 106}
              className="chart-grid"
            />
            <text x="34" y={140 - f * 106} textAnchor="end">
              {(low + f * (high - low)).toFixed(
                channel === "temperature" ? 0 : 1,
              )}
            </text>
          </g>
        ))}
        {[0, 30, 60, 90, 119].map((i) => (
          <text key={i} x={x(i)} y="157" textAnchor="middle">
            {i}m
          </text>
        ))}
        {segments.map((p, i) => (
          <polyline key={i} points={p} className="chart-trace" />
        ))}
        <line
          x1={x(index)}
          x2={x(index)}
          y1="25"
          y2="136"
          className="chart-inspection"
        />
        {current != null && (
          <circle
            cx={x(index)}
            cy={y(current)}
            r="3.5"
            className="chart-point"
          />
        )}
      </svg>
      <div className="chart-reading" role="status" aria-live="off">
        {index}m ·{" "}
        {current == null
          ? "Missing reading"
          : current.toFixed(2) + " " + UNITS[channel]}
        <span>
          {missing ? missing + " missing samples" : "120 observed samples"}
        </span>
      </div>
    </article>
  );
}
function Thermal({ pixels }: { pixels: number[][] }) {
  const all = pixels.flat(),
    min = Math.min(...all),
    max = Math.max(...all);
  return (
    <figure className="thermal-figure">
      <svg
        viewBox={`0 0 ${pixels[0].length} ${pixels.length}`}
        role="img"
        aria-label="Calibrated thermal image"
      >
        {pixels.flatMap((row, y) =>
          row.map((v, x) => (
            <rect
              key={x + "-" + y}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={`hsl(${42 - ((v - min) / (max - min || 1)) * 30} 55% ${25 + ((v - min) / (max - min || 1)) * 40}%)`}
            >
              <title>
                {v.toFixed(1)} °C at ({x},{y})
              </title>
            </rect>
          )),
        )}
      </svg>
      <figcaption>
        Calibrated array · {pixels[0].length} × {pixels.length}
        <span>
          {min.toFixed(1)}–{max.toFixed(1)} °C
        </span>
        <small>
          Deterministic color mapping; model input is recorded separately.
        </small>
      </figcaption>
    </figure>
  );
}
function Waveform({ samples, rate }: { samples: number[]; rate: number }) {
  const max = Math.max(...samples.map(Math.abs), 0.01);
  const points = samples
    .map(
      (v, i) =>
        `${32 + (i / (samples.length - 1)) * 600},${75 - (v / max) * 48}`,
    )
    .join(" ");
  return (
    <figure className="waveform-figure">
      <svg
        viewBox="0 0 650 160"
        role="img"
        aria-label="Calibrated vibration waveform"
      >
        <title>
          Vibration in millimeters per second over {samples.length / rate}{" "}
          seconds
        </title>
        <line x1="32" x2="632" y1="75" y2="75" className="chart-grid" />
        <polyline points={points} className="chart-trace" />
        <text x="32" y="145">
          0 s
        </text>
        <text x="550" y="145">
          {(samples.length / rate).toFixed(3)} s
        </text>
        <text x="32" y="15">
          ±{max.toFixed(2)} mm/s
        </text>
      </svg>
      <figcaption>
        {rate} Hz sampling · {samples.length} samples · deterministic signal,
        not model audio interpretation
      </figcaption>
    </figure>
  );
}
