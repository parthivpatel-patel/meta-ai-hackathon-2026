import { useEffect, useRef, useState } from "react";
import { Activity, Download, Layers, Upload } from "lucide-react";
type Assets = {
  thermal?: {
    pixels: number[][];
    declared_synthetic: boolean;
    units: "celsius";
  };
  waveform?: {
    samples: number[];
    sample_rate_hz: number;
    declared_synthetic: boolean;
    units: "mm_per_second";
  };
};
type Features = {
  content_hash: string;
  modalities: {
    thermal?: { maximum_celsius: number; hot_pixel_count: number };
    waveform?: { rms_mm_per_second: number; peak_frequency_hz: number };
  };
  limitation: string;
};
type Report = {
  id: string;
  model_source: string;
  asset_features: Features;
  verification: {
    status: string;
    findings: string[];
    reasons: string[];
    uncertainty: string;
    channels: {
      channel: string;
      process_supported: boolean;
      sensor_supported: boolean;
      reduction: { estimate: number; low: number; high: number };
    }[];
  };
  model_assessments: {
    hypothesis_id: string;
    status: string;
    reason: string;
  }[];
  hypotheses: { hypotheses: { hypothesis_id: string; rationale: string }[] };
  trace: string[];
  limitations: string[];
};
const recipes: Record<string, object> = {
  noisy: { faults: ["temperature"], noise_factor: 6 },
  multi: { faults: ["temperature", "vibration"], noise_factor: 1 },
  combined: { faults: ["pressure"], sensor_biases: ["pressure"] },
  insufficient: { faults: ["temperature"], missing_fraction: 0.75 },
  normal: { faults: [] },
};
async function jsonResponse(response: Response) {
  if (!response.ok)
    throw Error(
      `Request failed (${response.status}); no inference fallback was used.`,
    );
  return response.json();
}
export default function Phase2Investigation() {
  const [profile, setProfile] = useState("noisy");
  const [assets, setAssets] = useState<Assets>({});
  const [features, setFeatures] = useState<Features | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({
    network_inference_enabled: false,
    status: "checking",
  });
  const [useMeta, setUseMeta] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v2/model-status", { signal: controller.signal })
      .then(jsonResponse)
      .then(setStatus)
      .catch(() => {
        if (!controller.signal.aborted)
          setStatus({
            network_inference_enabled: false,
            status: "unavailable",
          });
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);
  async function attach(bundle: Assets) {
    const response = await fetch("/api/v2/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });
    const summary = await jsonResponse(response);
    setAssets(bundle);
    setFeatures(summary);
    setReport(null);
  }
  async function sample() {
    setBusy(true);
    setError("");
    try {
      await attach(await jsonResponse(await fetch("/api/v2/evidence/demo")));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence unavailable");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 150000)
        throw Error("Evidence JSON must be at most 150 KB.");
      await attach(JSON.parse(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid evidence");
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const result = await jsonResponse(
        await fetch("/api/v2/investigations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe: { seed: 2042, ...recipes[profile] },
            evidence: assets,
            use_meta: useMeta,
          }),
          signal: controller.signal,
        }),
      );
      if (!controller.signal.aborted) setReport(result);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "Investigation unavailable");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function htmlReport() {
    setError("");
    try {
      const response = await fetch("/api/v2/reports/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!response.ok) throw Error("Report verification or export failed");
      save(await response.blob(), "forge-phase2.html");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
  }
  return (
    <section
      className="panel phase2"
      id="phase2"
      aria-labelledby="phase2-title"
    >
      <div className="panel-title">
        <h2 id="phase2-title">
          <Layers size={18} /> Multimodal & multi-fault lab
        </h2>
        <span className="tag">PHASE 2 · SYNTHETIC</span>
      </div>
      <p className="panel-intro">
        An independent test case with window-level anomaly checks, four bounded
        interventions, and 96 replicates each. Calibrated thermal images and
        vibration waveforms provide contextual features.
      </p>
      <div className="p2-controls">
        <label>
          Test case
          <select
            aria-label="Phase 2 test case"
            value={profile}
            disabled={busy}
            onChange={(e) => {
              setProfile(e.target.value);
              setReport(null);
            }}
          >
            <option value="noisy">Noisy temperature departure</option>
            <option value="multi">Temperature + vibration faults</option>
            <option value="combined">Pressure process + sensor bias</option>
            <option value="insufficient">Insufficient telemetry</option>
            <option value="normal">Normal reference</option>
          </select>
        </label>
        <button onClick={sample} disabled={busy}>
          Attach synthetic multimodal sample
        </button>
        <label className="upload-evidence">
          <Upload size={13} /> Upload evidence JSON
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Upload multimodal evidence JSON"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {features && (
        <div className="p2-features">
          <div>
            <b>Evidence bundle</b>
            <p className="evidence-provenance">
              SHA-256 {features.content_hash}
            </p>
            <small>{features.limitation}</small>
          </div>
          {features.modalities.thermal && (
            <div>
              <b>Thermal image</b>
              <p>
                {features.modalities.thermal.maximum_celsius.toFixed(1)} °C
                maximum · {features.modalities.thermal.hot_pixel_count} hot
                pixels
              </p>
              {assets.thermal && (
                <div
                  className="thermal-preview"
                  role="img"
                  aria-label="Calibrated thermal image"
                  style={{
                    gridTemplateColumns: `repeat(${assets.thermal.pixels[0].length},1fr)`,
                  }}
                >
                  {assets.thermal.pixels.flat().map((value, i) => (
                    <span
                      key={i}
                      style={{
                        background: `hsl(${Math.max(0, Math.min(200, 200 - (value - 40) * 3))} 55% 52%)`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {features.modalities.waveform && (
            <div>
              <b>Vibration waveform</b>
              <p>
                {features.modalities.waveform.peak_frequency_hz.toFixed(1)} Hz
                peak
              </p>
              <small>
                {features.modalities.waveform.rms_mm_per_second.toFixed(3)} mm/s
                RMS
              </small>
            </div>
          )}
        </div>
      )}
      <div className="p2-run">
        <div>
          <label className="meta-opt-in">
            <input
              type="checkbox"
              checked={useMeta}
              disabled={!status.network_inference_enabled || busy}
              onChange={(e) => setUseMeta(e.target.checked)}
            />{" "}
            Use real Meta endpoint
          </label>
          <small>
            {status.network_inference_enabled
              ? "Configured, access not yet verified; consumes explicit bounded request allowance."
              : `Meta transport ${status.status}. Rules-based suggestions remain explicitly labeled.`}
          </small>
        </div>
        <button className="primary-action" disabled={busy} onClick={run}>
          <Activity size={14} />
          {busy ? "Processing…" : "Run Phase 2 investigation"}
        </button>
      </div>
      {error && (
        <p className="workflow-error" role="alert">
          {error}
        </p>
      )}
      {report && (
        <div className="p2-result" role="status">
          <div className="panel-title">
            <h3>{report.verification.status.replaceAll("_", " ")}</h3>
            <span className="tag">
              {report.model_source === "deterministic_rules_not_meta"
                ? "RULES-BASED · NOT META"
                : report.model_source === "test_transport"
                  ? "LOCAL TEST TRANSPORT"
                  : "META HTTP RESPONSE · UNATTESTED"}
            </span>
          </div>
          <p>
            Findings:{" "}
            {report.verification.findings.join(", ") ||
              "No sufficiently supported finding"}
          </p>
          <ul>
            {report.verification.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p>{report.verification.uncertainty}</p>
          <div className="intervals">
            {report.verification.channels.map((c) => (
              <div key={c.channel}>
                <b>{c.channel}</b>
                <span>
                  Process {c.process_supported ? "supported" : "unresolved"} ·
                  Sensor bias {c.sensor_supported ? "supported" : "unresolved"}
                </span>
                <small>
                  Reduction interval [{c.reduction.low.toFixed(2)},{" "}
                  {c.reduction.high.toFixed(2)}]
                </small>
              </div>
            ))}
          </div>
          <details>
            <summary>Candidate suggestions and independent assessment</summary>
            {report.hypotheses.hypotheses.map((h) => (
              <article className="model-proposal" key={h.hypothesis_id}>
                <b>{h.hypothesis_id}</b>
                <p>{h.rationale}</p>
                <small>
                  Untrusted suggestion ·{" "}
                  {
                    report.model_assessments.find(
                      (a) => a.hypothesis_id === h.hypothesis_id,
                    )?.status
                  }
                </small>
              </article>
            ))}
          </details>
          <details>
            <summary>Provenance and limitations</summary>
            <p className="evidence-provenance">{report.id}</p>
            <ol>
              {report.trace.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <ul>
              {report.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </details>
          <div className="report-downloads">
            <button
              onClick={() =>
                save(
                  new Blob([JSON.stringify(report, null, 2)], {
                    type: "application/json",
                  }),
                  "forge-phase2.json",
                )
              }
            >
              <Download size={13} /> Save Phase 2 JSON
            </button>
            <button onClick={htmlReport}>
              <Download size={13} /> Save Phase 2 HTML
            </button>
          </div>
          <p>
            Physical-world causality is not established. Thermal/waveform
            features do not independently prove a mechanism.
          </p>
        </div>
      )}
    </section>
  );
}
