import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Cpu,
  FlaskConical,
  Layers,
  ShieldCheck,
} from "lucide-react";
type Channel = "temperature" | "vibration" | "pressure";
type Row = {
  minute: number;
  state: string;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
};
type Evidence = {
  channel: Channel;
  unit: string;
  mean: number;
  median: number;
  std: number;
  observed_count: number;
  missing_count: number;
  baseline_median: number;
  baseline_scale: number;
  anomaly_minutes: number[];
  scores: (number | null)[];
};
type Investigation = {
  id: string;
  simulated: boolean;
  scenario: string;
  equipment: string;
  measurements: Row[];
  evidence: Evidence[];
  model: {
    provider: string;
    model_id: string;
    simulated: boolean;
    limitations: string;
    hypotheses: { title: string; rationale: string; next_test: string }[];
  };
  timeline: { minute: number; event: string }[];
};
type ModelStatus = {
  provider: string;
  model_id: string;
  status: string;
  network_inference_enabled: boolean;
};
const labels = {
  temperature: "Temperature",
  vibration: "Vibration",
  pressure: "Pressure",
};
export function TelemetryChart({
  rows,
  evidence,
}: {
  rows: Row[];
  evidence: Evidence;
}) {
  const values = rows
    .map((r) => r[evidence.channel])
    .filter((v): v is number => v !== null);
  const low = Math.min(...values) - evidence.baseline_scale * 2,
    high = Math.max(...values) + evidence.baseline_scale * 2;
  const y = (v: number) => 112 - ((v - low) / (high - low || 1)) * 88;
  const segments: string[] = [];
  let points: string[] = [];
  rows.forEach((r, i) => {
    const v = r[evidence.channel];
    if (v === null) {
      if (points.length) segments.push(points.join(" "));
      points = [];
    } else points.push(`${38 + (i / (rows.length - 1)) * 420},${y(v)}`);
  });
  if (points.length) segments.push(points.join(" "));
  return (
    <svg
      viewBox="0 0 480 145"
      role="img"
      aria-label={`${labels[evidence.channel]} telemetry chart`}
    >
      {[24, 68, 112].map((v, i) => (
        <g key={v}>
          <line
            x1="38"
            y1={v}
            x2="460"
            y2={v}
            stroke="#e5e9e5"
            strokeDasharray="3 4"
          />
          <text x="0" y={v + 4}>
            {(high - ((high - low) * i) / 2).toFixed(1)}
          </text>
        </g>
      ))}
      <rect
        x={38 + (80 / 119) * 420}
        y="16"
        width={(39 / 119) * 420}
        height="100"
        fill="#fff0df"
      />
      {segments.map((p, i) => (
        <polyline
          key={i}
          points={p}
          fill="none"
          stroke={evidence.anomaly_minutes.length ? "#c77b33" : "#36785d"}
          strokeWidth="2"
        />
      ))}
      {[0, 30, 60, 90, 119].map((m) => (
        <text key={m} x={38 + (m / 119) * 420} y="137" textAnchor="middle">
          {m}m
        </text>
      ))}
    </svg>
  );
}
export default function App() {
  const [scenario, setScenario] = useState("cooling_loss");
  const [data, setData] = useState<Investigation | null>(null);
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    Promise.all([
      fetch(`/api/v1/investigations/demo?scenario=${scenario}`, {
        signal: controller.signal,
      }).then(async (r) => {
        if (!r.ok) throw Error(`Investigation request failed (${r.status})`);
        return r.json();
      }),
      fetch("/api/v1/model-status", { signal: controller.signal }).then(
        async (r) => {
          if (!r.ok) throw Error("Model status unavailable");
          return r.json();
        },
      ),
    ])
      .then(([d, m]) => {
        setData(d);
        setModel(m);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [scenario, retry]);
  const flagged = data?.evidence.filter((e) => e.anomaly_minutes.length) ?? [];
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#">
          <Layers size={27} />
          <span>
            FORGE<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">INVESTIGATION WORKSPACE</div>
        <nav>
          <a className="active" href="#overview">
            <Box size={17} /> Overview <span>01</span>
          </a>
          <a href="#telemetry">
            <Activity size={17} /> Telemetry
          </a>
          <a href="#evidence">
            <ShieldCheck size={17} /> Evidence
          </a>
          <a href="#hypotheses">
            <FlaskConical size={17} /> Hypotheses
          </a>
        </nav>
        <div className="side-bottom">
          <div className="phase">
            <span className="dot" /> PHASE 0 · FOUNDATION
          </div>
          <p>
            Built to question.
            <br />
            Designed to verify.
          </p>
          <div className="avatar">
            F
            <span>
              FORGE Research
              <br />
              <small>Development workspace</small>
            </span>
          </div>
        </div>
      </aside>
      <main id="overview">
        <header>
          <div className="breadcrumb">
            Workspace <span>/</span> Investigations <span>/</span> <b>P-104</b>
          </div>
          <span className="header-status">
            <span className="dot" /> Local development
          </span>
        </header>
        <div className="content">
          <div className="title-row">
            <div>
              <div className="eyebrow">
                INDUSTRIAL SYSTEMS / INVESTIGATION 001
              </div>
              <h1>Every signal tells a story.</h1>
              <p className="subtitle">
                Investigate abnormal behavior. Build a case with evidence.
              </p>
            </div>
            <div className="simulation-badge">
              <FlaskConical size={15} /> SIMULATED DATA
            </div>
          </div>
          <div className="notice">
            <CircleHelp size={17} />
            <span>
              Research environment. Telemetry is synthetic; anomalies do not
              establish a physical failure.
            </span>
          </div>
          <section className="equipment">
            <div className="equipment-icon">
              <Box />
            </div>
            <div>
              <div className="eyebrow">ACTIVE INVESTIGATION</div>
              <h2>
                P-104 <span>/ Process pump</span>
              </h2>
              <p>
                Closed-loop industrial system · 120 samples · 1-minute intervals
              </p>
            </div>
            <label className="scenario">
              Scenario
              <select
                aria-label="Scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                <option value="cooling_loss">Cooling loss</option>
                <option value="normal">Normal operation</option>
                <option value="imbalance">Imbalance</option>
                <option value="pressure_loss">Pressure loss</option>
              </select>
            </label>
          </section>
          {error ? (
            <div role="alert" className="error">
              {error}. Check the backend connection.{" "}
              <button onClick={() => setRetry(retry + 1)}>Retry</button>
            </div>
          ) : !data ? (
            <div role="status" className="loading">
              Loading investigation evidence…
            </div>
          ) : (
            <>
              <div className="stats">
                <div>
                  <span>Investigation status</span>
                  <strong>
                    <span className="dot amber" />
                    {flagged.length
                      ? "Anomaly detected"
                      : "Baseline consistent"}
                  </strong>
                  <small>Statistical finding · cause unverified</small>
                </div>
                <div>
                  <span>Signals monitored</span>
                  <strong>
                    03 <small>channels</small>
                  </strong>
                  <small>Temperature, vibration, pressure</small>
                </div>
                <div>
                  <span>Flagged channels</span>
                  <strong>
                    {String(flagged.length).padStart(2, "0")}{" "}
                    <small>/ 03</small>
                  </strong>
                  <small>Robust score &gt; 6</small>
                </div>
                <div>
                  <span>Model provider</span>
                  <strong className="model-name">
                    <Cpu size={19} />
                    {model?.provider === "mock"
                      ? "Mock inference"
                      : "Meta disabled"}
                  </strong>
                  <small>{model?.status} · network inference off</small>
                </div>
              </div>
              <section id="telemetry">
                <div className="section-heading">
                  <h2>
                    Equipment telemetry <span className="count">03</span>
                  </h2>
                  <span>
                    <span className="legend-line" /> Observed signal{" "}
                    <span className="legend-square" /> Injection window
                  </span>
                </div>
                <div className="charts">
                  {data.evidence.map((e) => (
                    <article className="chart-card" key={e.channel}>
                      <div className="chart-top">
                        <h3>{labels[e.channel]}</h3>
                        <span
                          className={
                            e.anomaly_minutes.length ? "tag warning" : "tag"
                          }
                        >
                          {e.anomaly_minutes.length
                            ? "Flagged"
                            : "Within baseline"}
                        </span>
                      </div>
                      <div className="reading">
                        {data.measurements.at(-1)?.[e.channel]?.toFixed(2) ??
                          "Missing"}{" "}
                        <small>{e.unit}</small>
                      </div>
                      <TelemetryChart rows={data.measurements} evidence={e} />
                      <div className="chart-footer">
                        <span>{e.anomaly_minutes.length} flagged samples</span>
                        <span>
                          120 min <ChevronDown size={12} />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <div className="lower-grid">
                <section className="panel" id="evidence">
                  <div className="panel-title">
                    <h2>
                      <ShieldCheck size={18} /> Evidence ledger
                    </h2>
                    <span className="tag">Computed</span>
                  </div>
                  <p className="panel-intro">
                    Independent numerical observations, before interpretation.
                  </p>
                  {data.evidence.map((e) => (
                    <div className="evidence-row" key={e.channel}>
                      <div
                        className={
                          e.anomaly_minutes.length
                            ? "evidence-icon warning"
                            : "evidence-icon"
                        }
                      >
                        {e.anomaly_minutes.length ? (
                          <Activity size={17} />
                        ) : (
                          <Check size={17} />
                        )}
                      </div>
                      <div>
                        <h3>
                          {labels[e.channel]}{" "}
                          {e.anomaly_minutes.length
                            ? "departs from baseline"
                            : "is baseline-consistent"}
                        </h3>
                        <p>
                          Baseline {e.baseline_median.toFixed(2)} {e.unit} ·
                          scale {e.baseline_scale.toFixed(3)} ·{" "}
                          {e.missing_count} missing
                        </p>
                      </div>
                      <b>
                        {e.anomaly_minutes.length
                          ? `${e.anomaly_minutes.length} flags`
                          : "No flags"}
                      </b>
                    </div>
                  ))}
                  <div className="method-note">
                    METHOD / Median absolute deviation, normal-scaled. First 60
                    samples define the baseline. Missing values are excluded,
                    never imputed.
                  </div>
                </section>
                <section className="panel timeline">
                  <div className="panel-title">
                    <h2>Investigation timeline</h2>
                    <span className="eyebrow">SIMULATION</span>
                  </div>
                  <ol>
                    {data.timeline.map((t) => (
                      <li key={t.minute}>
                        <span className="timeline-dot" />
                        <div>
                          <small>
                            T + {String(t.minute).padStart(3, "0")} MIN
                          </small>
                          <p>{t.event}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="timeline-foot">
                    Deterministic dataset · seed 42
                  </div>
                </section>
              </div>
              <section className="panel hypotheses" id="hypotheses">
                <div className="panel-title">
                  <h2>
                    <FlaskConical size={18} /> Competing hypotheses
                  </h2>
                  <span className="tag warning">MOCK · UNVERIFIED</span>
                </div>
                <div className="hypothesis-grid">
                  {data.model.hypotheses.map((h, i) => (
                    <article key={h.title}>
                      <span className="hypothesis-number">H0{i + 1}</span>
                      <h3>{h.title}</h3>
                      <p>{h.rationale}</p>
                      <div>
                        <ArrowUpRight size={15} />
                        <span>{h.next_test}</span>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="limitation">{data.model.limitations}</p>
              </section>
            </>
          )}
          <footer>
            <span>
              <Layers size={14} /> FORGE / Verifiable investigation systems
            </span>
            <span>Phase 0 · No physical control or verified diagnosis</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
