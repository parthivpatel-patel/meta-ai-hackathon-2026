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
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "./design-tokens.css";
import "./demo.css";
import {
  human,
  Status,
  Empty,
  SignalChart,
  Thermal,
  Waveform,
  type Channel,
  type Row,
} from "./InvestigationVisuals";
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
const labels: Record<string, string> = {
  OBSERVED: "Generate competing hypotheses",
  HYPOTHESES_READY: "Select next experiment",
  EXPERIMENT_SELECTED: "Run experiment and verify",
};
const sourceLabel = (source: string) =>
  source === "meta_http_response"
    ? "Recorded Meta endpoint response"
    : source === "test_transport"
      ? "Local test response. Not Meta inference."
      : source === "not_run"
        ? "Inference not run"
        : "Analysis mode: Deterministic";
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
  const nextAction = labels[session?.status || ""] || "Begin investigation";
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
          <span className="section-code">02 / Competing explanations</span>
          <h2 id="hypothesis-heading">Hypothesis register</h2>
        </div>
        <span className="quiet-label">
          Rank indicates order, not probability
        </span>
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
                      {r.evidence_refs.join(". ") ||
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
        {sourceLabel(session?.model_source || "not_run")}. Independent evidence
        determines status.
      </div>
    </section>
  );
  const timeline = (
    <section className="forge-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">03 / Controlled tests</span>
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
                <p>{narrative(e.detail)}</p>
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
          ? "Temporary storage. Export completed reports before leaving."
          : "Saved versions prevent the same action from running twice."}
      </div>
    </section>
  );
  const verification = (
    <section className="forge-panel verification-panel">
      <div className="panel-heading">
        <div>
          <span className="section-code">04 / Independent verification</span>
          <h2>Verification result</h2>
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
                        Witness means in normalized baseline units. Descriptive,
                        not a probability
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
            <strong>Uncertainty and scope</strong>
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
          <span className="section-code">01 / Evidence record</span>
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
                  120 readings of temperature, vibration and pressure. Missing
                  readings remain gaps, never interpolated evidence.
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
                  {human(session.inference.input_mode || "numerical_summaries")}
                  . {sourceLabel(session.model_source)}
                </p>
              )}
              <p className="provenance-line">
                Provenance: {chosen.provenance.replaceAll("_", " ")}
              </p>
              <details>
                <summary>Content digest and interpretation limits</summary>
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
                    °C maximum with{" "}
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
                    Hz spectral peak with{" "}
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
          <span className="section-code">05 / Reproducible reports</span>
          <h2>Investigation report</h2>
        </div>
        <FileText size={22} />
      </div>
      <div className="report-preview">
        <div className="report-sheet">
          <span className="section-code">FORGE / Investigation record</span>
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
                {session?.decision
                  ? human(session.decision.status)
                  : "Not evaluated"}
              </dd>
            </div>
            <div>
              <dt>Controlled experiments</dt>
              <dd>{session?.trials.length || 0} / 4</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>
                Synthetic model only. Physical-world causality is not
                established.
              </dd>
            </div>
          </dl>
        </div>
        <div className="report-actions">
          <h3>Export investigation reports</h3>
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
            FORGE<small>Investigation systems</small>
          </span>
        </a>
        <div className="sidebar-label">Investigation</div>
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
          <strong>Independent verification</strong>
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
                  : "Local development"}
            {". Synthetic data"}
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
              <span className="section-code">Equipment investigation</span>
              <h1>
                {view === "Workspace"
                  ? "Investigate equipment anomalies"
                  : view}
              </h1>
              <p>
                {view === "Workspace"
                  ? "Compare possible causes, run controlled tests and review the evidence."
                  : "A traceable record of what was observed, tested and supported."}
              </p>
            </div>
            <div className="source-stamp">
              <span>Analysis source</span>
              <strong>{sourceLabel(session?.model_source || "not_run")}</strong>
              <small>
                {cap?.real_inference_verified
                  ? "Authenticated response recorded; budgets still apply."
                  : cap?.model_configuration === "configured_unverified"
                    ? "Configured. An authenticated test is required."
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
              <label htmlFor="forge-case">Synthetic investigation</label>
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
              {busy ? "Creating investigation…" : "Begin investigation"}
            </button>
          </section>
          {!session ? (
            <>
              <section className="empty-workspace">
                <div>
                  <span className="section-code">Investigation process</span>
                  <h2>Test possible causes with evidence.</h2>
                  <p>
                    Choose a synthetic equipment case. Compare possible causes,
                    run controlled experiments and review independently computed
                    results.
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
                        01 / Observed telemetry
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
                    <span>0–119 minutes. Missing samples remain gaps.</span>
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
                            Next / {human(session.plan.kind)}
                          </div>
                          <h3>What will this test distinguish?</h3>
                          <p>{session.plan.reason}</p>
                          <ul>
                            {session.plan.competing_predictions.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                          <p className="quiet-label">
                            Deterministic selection for controlled synthetic
                            execution
                          </p>
                        </section>
                      )}
                    </div>
                    <div>
                      {timeline}
                      <section className="decision-summary">
                        <span className="section-code">
                          Independent verifier
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

function narrative(value: string) {
  return value
    .replaceAll("SUPPORTED_SYNTHETIC", "Supported in simulation")
    .replaceAll("IN_PROGRESS", "In progress")
    .replaceAll(
      "deterministic_rules_not_meta",
      "deterministic rules, not Meta inference",
    )
    .replaceAll("_", " ");
}
