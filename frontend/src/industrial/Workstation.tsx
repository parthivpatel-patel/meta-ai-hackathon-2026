import {
  Component as ReactComponent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { boundedFetch } from "../investigation/useInvestigation";
import {
  causeName,
  resultLabel,
  testName,
} from "../investigation/presentation";
import {
  InstrumentStrip,
  ReportPreview,
  TrialComparison,
} from "./WorkspacePanels";
import { RecoveryPanel } from "./RecoveryPanel";
import {
  validateCheckpoint,
  type Checkpoint,
  type MachineCheckpoint,
} from "./recovery";
import { Machine } from "./Machine";
import { ModelPanel } from "./ModelPanel";
import {
  canonical,
  parseCSV,
  validateRecording,
  validateSimulation,
  rotorPhases,
  type Recording,
  type Frame,
  type Recipe,
  type Report,
} from "./contracts";
import "./workstation.css";
const initial: Recipe = {
  version: "coupled-pump-1",
  scenario: "normal",
  seed: 2026,
  steps: 360,
  onset: 280,
  sample_period_seconds: 1,
  actions: [],
};
const displayWatch: Record<string, (v: number) => boolean> = {
  motor_temperature: (v) => v > 70,
  bearing_temperature: (v) => v > 60,
  vibration: (v) => v > 2.4,
  discharge_pressure: (v) => v < 5.6 || v > 6.4,
  suction_pressure: (v) => v < 0.8,
  flow: (v) => v < 50,
  differential_pressure: (v) => v < 4.5,
  load: (v) => v > 105,
};
class RenderBoundary extends ReactComponent<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        Machine rendering failed. Use the component list and telemetry below;
        reload to retry graphics.
      </p>
    ) : (
      this.props.children
    );
  }
}
function download(name: string, text: string, type = "application/json") {
  const a = document.createElement("a");
  const u = URL.createObjectURL(new Blob([text], { type }));
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export default function Workstation({
  active = true,
  onOpenLibrary,
  workspaceMode,
  onModeChange,
  embedded = false,
  caseRequest,
}: {
  active?: boolean;
  caseRequest?: { scenario: string; sequence: number };
  workspaceMode?: string;
  onModeChange?: (mode: string) => void;
  embedded?: boolean;
  onOpenLibrary?: () => void;
}) {
  const captureExplanationId = useId();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recipe, setRecipe] = useState(initial);
  const [selected, setSelected] = useState("pump");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [preparedHash, setPreparedHash] = useState("");
  const inFlight = useRef(false);
  const [graphics2D, setGraphics2D] = useState(false);
  const [preview, setPreview] = useState<Frame | null>(null);
  const [internalTab, setInternalTab] = useState("Machine");
  const tab = workspaceMode || internalTab;
  function setTab(mode: string) {
    setInternalTab(mode);
    onModeChange?.(mode);
  }
  const [operatorEvents, setOperatorEvents] = useState<
    { id: string; sequence: number; kind: string; component: string }[]
  >([]);
  const eventNumber = useRef(0);
  function audit(kind: string) {
    const e = {
      id: "operator-" + eventNumber.current++,
      sequence: cursor,
      kind,
      component: selected,
    };
    setOperatorEvents((old) => [...old.slice(-99), e]);
  }
  const [importHash, setImportHash] = useState("");
  const [visible, setVisible] = useState(!document.hidden);
  const request = useRef<AbortController | null>(null);
  async function post<T>(url: string, body: unknown): Promise<T> {
    const response = await boundedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: request.current?.signal,
    });
    if (!response.ok)
      throw Error(
        response.status === 429
          ? "Request limit reached. Wait one minute before retrying."
          : "The simulation request was rejected. Check the input and try again.",
      );
    return response.json();
  }
  async function load(next: Recipe) {
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    inFlight.current = false;
    setBusy(true);
    setError("");
    setPlaying(false);
    try {
      const data = validateSimulation(
        await post<unknown>("/api/v4/simulate", next),
      );
      if (abort.signal.aborted) return false;
      setRecording(data);
      setOperatorEvents([]);
      eventNumber.current = 0;
      setRecipe(next);
      setCursor(0);
      setReport(null);
      setPreparedHash("");
      setPreview(null);
      setReplayed(false);
      setImportHash("");
      return true;
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Simulation unavailable. Retry loading.",
        );
      return false;
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    void load(initial);
    return () => request.current?.abort();
  }, []);
  useEffect(() => {
    if (caseRequest) void load({ ...initial, scenario: caseRequest.scenario });
  }, [caseRequest]);
  useEffect(() => {
    const visibility = () => {
      setVisible(!document.hidden);
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!playing || !visible || !active || !recording) return;
    const timer = setInterval(
      () =>
        setCursor((c) => {
          const next = Math.min(recording.frames.length - 1, c + speed);
          if (next === recording.frames.length - 1) setPlaying(false);
          return next;
        }),
      500,
    );
    return () => clearInterval(timer);
  }, [playing, visible, active, recording, speed]);
  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);
  const frame = preview || recording?.frames[cursor];
  const phases = useMemo(
    () => rotorPhases(recording?.frames || []),
    [recording],
  );
  const component = recording?.components.find((c) => c.id === selected);
  const sensors =
    recording?.sensors.filter((s) => component?.sensors.includes(s.id)) || [];
  // New evidence eligibility is separate from navigation to an existing report.
  const captureDisabled =
    busy ||
    replayed ||
    !!preview ||
    cursor < 319 ||
    recipe.actions.length > 0 ||
    !sensors.length;
  const captureExplanation = preview
    ? "New evidence capture is unavailable while viewing a counterfactual test result. These samples are simulated experiment outcomes, not observed evidence. Return to observed simulation to capture new evidence."
    : busy
      ? "New evidence capture is unavailable while an operation is pending."
      : replayed
        ? "Imported recordings have no intervention oracle, so new investigation capture is unavailable."
        : recipe.actions.length > 0
          ? "New evidence capture requires a simulation without manual operating actions."
          : !sensors.length
            ? "Select a component with a mapped instrument before capturing new evidence."
            : cursor < 319
              ? "New evidence capture requires observed samples through sequence 319. Use the position slider to inspect that window."
              : "Observed samples are eligible for a new evidence capture.";
  const captureAction = (
    <button
      disabled={captureDisabled}
      aria-describedby={captureExplanationId}
      onClick={() => void diagnose()}
    >
      {report ? "Capture new observation window" : "Capture selected component"}
    </button>
  );
  function health(id: string) {
    const c = recording?.components.find((p) => p.id === id);
    if (!frame || !c?.sensors.length) return "No instrument";
    if (["STARTING", "STOPPED", "STOPPING"].includes(frame.state))
      return "Transition / stopped";
    const readings = frame.readings.filter((r) =>
      c.sensors.includes(r.sensor_id),
    );
    if (readings.some((r) => r.quality === "MISSING"))
      return "Data unavailable";
    return readings.some(
      (r) =>
        r.value !== null &&
        (r.quality === "OUT_OF_RANGE" || displayWatch[r.sensor_id]?.(r.value)),
    )
      ? "Watch: unusual readings"
      : "Within display thresholds";
  }
  function focusScenario() {
    setSelected(
      (
        {
          bearing: "bearing",
          misalignment: "coupling",
          cavitation: "impeller",
          pressure_sensor: "pressure_sensor",
          thermal: "cooling",
          process: "pump",
        } as Record<string, string>
      )[recipe.scenario] || "motor",
    );
    setCursor(Math.min(319, (recording?.frames.length || 1) - 1));
    setPlaying(false);
    setPreview(null);
  }
  async function diagnose(next = false) {
    if (!recording || busy || inFlight.current || (!next && preview)) return;
    inFlight.current = true;
    const operation = request.current;
    setBusy(true);
    setPlaying(false);
    setError("");
    try {
      const body =
        next && report
          ? {
              ...report.request,
              experiments: Math.min(4, report.trials.length + 1),
            }
          : {
              recipe,
              context: {
                component_id: selected,
                at_sequence: Math.min(cursor, 359),
              },
              experiments: 0,
            };
      const response =
        next && report?.model_proposal
          ? await post<Report>("/api/v5/advance", report)
          : await post<Report>("/api/v4/investigate", body);
      if (operation?.signal.aborted || request.current !== operation) return;
      setReport(response);
      setPreparedHash("");
      audit(
        next
          ? "Experiment and independent verification: " +
              response.decision.status
          : "Investigation captured",
      );
      setPreview(response.events.at(-1)?.after_frame || null);
      setTab(
        next
          ? response.plan
            ? "Experiments"
            : "Verification"
          : "Investigation",
      );
    } catch (e) {
      if (!operation?.signal.aborted && request.current === operation)
        setError(
          e instanceof Error ? e.message : "Investigation failed. Try again.",
        );
    } finally {
      if (request.current === operation) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  async function prepareModelEvidence() {
    if (!report || busy || inFlight.current || report.request.experiments !== 0)
      return;
    inFlight.current = true;
    const operation = request.current;
    setBusy(true);
    setError("");
    try {
      const prepared = await post<{
        input_hash: string;
        evidence: unknown;
        network_requests_sent: number;
      }>("/api/v5/prepare", report.request);
      if (operation?.signal.aborted || request.current !== operation) return;
      if (
        prepared.network_requests_sent !== 0 ||
        !/^[a-f0-9]{64}$/.test(prepared.input_hash)
      )
        throw Error(
          "Unexpected preparation response; no inference is permitted here.",
        );
      setPreparedHash(prepared.input_hash);
      download(
        "forge-observed-model-evidence.json",
        JSON.stringify(prepared, null, 2),
      );
      audit("Observed model evidence prepared; zero model requests");
    } catch {
      if (!operation?.signal.aborted && request.current === operation)
        setError(
          "Evidence preparation failed. The existing investigation is preserved. Retry preparation after recovery; this does not call a model.",
        );
    } finally {
      if (request.current === operation) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  async function importFile(file: File) {
    if (!recording || inFlight.current) return;
    if (file.size > 1048576) {
      setError("Import exceeds 1 MiB. Reduce the file first.");
      return;
    }
    setPlaying(false);
    setError("");
    setBusy(true);
    inFlight.current = true;
    const operation = request.current;
    try {
      const text = await file.text();
      if (operation?.signal.aborted || request.current !== operation) return;
      const raw = file.name.toLowerCase().endsWith(".csv")
        ? parseCSV(text)
        : JSON.parse(text);
      if (
        [
          "forge-industrial-report-1",
          "forge-industrial-model-report-1",
        ].includes(raw?.schema)
      ) {
        const verified =
          raw.schema === "forge-industrial-model-report-1"
            ? await post<Report>("/api/v5/replay", raw)
            : await post<Report>("/api/v4/investigate", raw.request);
        if (operation?.signal.aborted || request.current !== operation) return;
        if (canonical(raw) !== canonical(verified))
          throw Error(
            "Investigation report does not match independent reproduction",
          );
        if (!(await load(raw.request.recipe)))
          throw Error(
            "Report import could not reproduce the simulation. Retry after recovery.",
          );
        setReport(verified);
        setCursor(raw.request.context.at_sequence);
        setSelected(raw.request.context.component_id);
        setTab("Investigation");
        return;
      }
      const frames = validateRecording(raw, recording.sensors);
      setRecording({
        ...recording,
        frames,
        events: [],
        limitations:
          raw.declared_source === "synthetic"
            ? "Imported synthetic recording. No hardware connection or intervention oracle."
            : "Imported operator recording, source and calibration unverified. No counterfactual oracle.",
      });
      setCursor(0);
      setOperatorEvents([]);
      eventNumber.current = 0;
      setPreview(null);
      setReport(null);
      setPreparedHash("");
      setReplayed(true);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
      );
      setImportHash(
        [...new Uint8Array(digest)]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join(""),
      );
    } catch (e) {
      if (!operation?.signal.aborted && request.current === operation)
        setError(
          e instanceof Error
            ? e.message
            : "Import failed. Choose a valid JSON or CSV recording.",
        );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function exportTelemetry() {
    if (!recording) return;
    audit("Telemetry export initiated");
    const samples = recording.frames.flatMap((f) =>
      f.readings.map((r) => {
        const s = recording.sensors.find((s) => s.id === r.sensor_id)!;
        return {
          timestamp: f.timestamp,
          sensor_id: s.id,
          component_id: s.component_id,
          value: r.value,
          unit: s.unit,
        };
      }),
    );
    download(
      "forge-telemetry.json",
      JSON.stringify({
        schema: "forge-telemetry-1",
        machine_id: "pump-104",
        declared_source:
          replayed && recording.frames[0]?.source !== "REPLAYED_SYNTHETIC"
            ? "operator_recorded_unverified"
            : "synthetic",
        samples,
        operator_events: operatorEvents,
      }),
    );
  }
  const recoveryData = useMemo<MachineCheckpoint | null>(
    () =>
      recording && !replayed
        ? { recipe, selected, cursor, tab, speed, report }
        : null,
    [recording, replayed, recipe, selected, cursor, tab, speed, report],
  );
  async function restoreCheckpoint(value: Checkpoint) {
    const safe = validateCheckpoint(value, "machine").data as MachineCheckpoint;
    if (inFlight.current || busy) throw Error("Operation pending");
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    inFlight.current = true;
    setBusy(true);
    setPlaying(false);
    try {
      const simulation = validateSimulation(
        await post<unknown>("/api/v4/simulate", safe.recipe),
      );
      if (
        !simulation.components.some((c) => c.id === safe.selected) ||
        safe.cursor >= simulation.frames.length
      )
        throw Error("Invalid component/window");
      let verified: Report | null = null;
      if (safe.report) {
        verified = safe.report.model_proposal
          ? await post<Report>("/api/v5/replay", safe.report)
          : await post<Report>("/api/v4/investigate", safe.report.request);
        if (canonical(verified) !== canonical(safe.report))
          throw Error("Checkpoint evidence does not reproduce");
      }
      if (abort.signal.aborted || request.current !== abort)
        throw Error("Interrupted");
      setRecording(simulation);
      setRecipe(safe.recipe);
      setSelected(safe.selected);
      setCursor(safe.cursor);
      setSpeed(safe.speed);
      setTab(safe.tab);
      setReport(verified);
      setPreview(null);
      setPreparedHash("");
      setReplayed(false);
      setImportHash("");
      setOperatorEvents([]);
      setError("");
    } finally {
      if (request.current === abort) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }
  if (!recording || !frame)
    return (
      <main className="industrial">
        <h1>Industrial intelligence workstation</h1>
        <p role="status">
          {busy
            ? "Loading the simulated machine…"
            : "Simulation is not loaded."}
        </p>
        {error && <p role="alert">{error}</p>}
        <button onClick={() => void load(initial)}>Retry simulation</button>
      </main>
    );
  return (
    <main className="industrial">
      <header className="station-header">
        <div>
          <p className="station-eyebrow">FORGE / INDUSTRIAL INTELLIGENCE</p>
          <h1>Pump investigation workstation</h1>
          <p className="station-subtitle">
            Simulation only · Connected equipment unavailable ·{" "}
            {report?.model_proposal
              ? report.model_proposal.source === "test_transport"
                ? "Recorded fixture proposals, not Meta"
                : "Recorded model claim, source unverified by replay"
              : "Rules-based proposals, not Meta"}
          </p>
        </div>
        <span role="status">
          {busy
            ? "Working…"
            : preview
              ? "Counterfactual test result"
              : playing
                ? replayed
                  ? "Replaying"
                  : "Simulation running"
                : "Paused / ready"}
        </span>
      </header>
      <RecoveryPanel
        kind="machine"
        data={recoveryData}
        busy={busy}
        onRestore={restoreCheckpoint}
      />
      {error && (
        <div role="alert" className="station-error">
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      <div className="station-controls">
        <label>
          Scenario
          <select
            aria-label="Machine scenario"
            value={recipe.scenario}
            disabled={busy}
            onChange={(e) =>
              void load({ ...initial, scenario: e.target.value })
            }
          >
            {Object.entries({
              normal: "Normal operation",
              bearing: "Bearing degradation",
              misalignment: "Shaft misalignment",
              cavitation: "Cavitation-like conditions",
              pressure_sensor: "Pressure sensor offset",
              thermal: "Cooling degradation",
              process: "Process pressure disturbance",
            }).map(([id, name]) => (
              <option value={id} key={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Select component
          <select
            aria-label="Machine component"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {recording.components.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <button
          className="primary-action"
          disabled={busy || playing || !!preview}
          onClick={() => {
            if (cursor === recording.frames.length - 1) setCursor(0);
            setPlaying(true);
            audit("Playback started");
          }}
        >
          {replayed
            ? "Start recorded replay / Resume"
            : "Start simulation / Resume"}
        </button>
        <button
          disabled={!playing}
          onClick={() => {
            setPlaying(false);
            audit("Playback paused");
          }}
        >
          Pause
        </button>
        <button disabled={busy || replayed} onClick={focusScenario}>
          Focus scenario window
        </button>
        <details className="operation-settings">
          <summary>Operating controls</summary>
          <div className="operation-options">
            <label>
              Sampling interval
              <select
                aria-label="Simulation sampling interval"
                value={recipe.sample_period_seconds}
                disabled={busy || replayed}
                onChange={(e) =>
                  void load({
                    ...recipe,
                    sample_period_seconds: Number(e.target.value) as 1 | 2 | 5,
                    actions: [],
                  })
                }
              >
                {[1, 2, 5].map((n) => (
                  <option value={n} key={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={
                busy ||
                replayed ||
                !!preview ||
                !!recipe.actions.length ||
                cursor < 1
              }
              onClick={async () => {
                const next = {
                  ...recipe,
                  steps: 600,
                  actions: [
                    {
                      sequence: Math.min(cursor + 1, 599),
                      kind: "stop",
                    },
                  ],
                };
                if (await load(next)) {
                  setCursor(cursor);
                  setPlaying(true);
                }
              }}
            >
              Simulate shutdown
            </button>
            <button
              disabled={
                busy ||
                replayed ||
                !!preview ||
                cursor < recipe.onset ||
                recipe.actions.length > 0
              }
              onClick={async () => {
                const old = cursor;
                const loaded = await load({
                  ...recipe,
                  steps: 600,
                  actions: [{ sequence: old + 1, kind: "reset_fault" }],
                });
                if (loaded) {
                  setCursor(old);
                  setPlaying(true);
                }
              }}
            >
              Apply simulated repair
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (replayed) {
                  setPlaying(false);
                  setCursor(0);
                  setPreview(null);
                } else void load({ ...recipe, actions: [] });
              }}
            >
              {replayed ? "Reset recording" : "Reset scenario"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setCursor(0);
                setPlaying(true);
              }}
            >
              Replay from start
            </button>
            <label>
              Playback speed
              <select
                aria-label="Simulation playback speed"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[1, 8, 32].map((n) => (
                  <option key={n} value={n}>
                    {n} samples / tick
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </div>
      {tab !== "Machine" && <InstrumentStrip frame={frame} />}
      <nav
        className="station-tabs"
        aria-label="Workstation views"
        hidden={embedded}
      >
        {[
          "Machine",
          "Telemetry",
          "Investigation",
          "Experiments",
          "Verification",
          "Reports",
          "Evidence",
          "Replay",
        ].map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="machine-grid" hidden={tab !== "Machine"}>
        <section className="station-panel machine-stage">
          <div className="panel-title">
            <h2>Pump and motor assembly</h2>
            <span>
              {frame.state.replaceAll("_", " ")} · sample {frame.sequence}
            </span>
            <button onClick={() => setGraphics2D((v) => !v)}>
              {graphics2D ? "Use 3D machine" : "Use 2D inspection"}
            </button>
          </div>

          <RenderBoundary>
            <Machine
              force2D={graphics2D}
              rotorPhase={preview ? null : (phases[cursor] ?? null)}
              components={recording.components}
              selected={selected}
              warnings={recording.components
                .filter((c) => health(c.id).startsWith("Watch"))
                .map((c) => c.id)}
              onSelect={setSelected}
              frame={frame}
            />
          </RenderBoundary>
          <label>
            Recording position
            <input
              aria-label="Machine recording position"
              type="range"
              min="0"
              max={recording.frames.length - 1}
              value={cursor}
              onChange={(e) => {
                setPlaying(false);
                setPreview(null);
                setCursor(Number(e.target.value));
              }}
            />
          </label>
          <p>
            <time>{frame.timestamp}</time> · {frame.source} · Sequence{" "}
            {frame.sequence}
          </p>
        </section>
        <aside className="station-panel component-inspector">
          <h2>Component inspector</h2>

          <h3>{component?.name}</h3>
          <p>
            {health(selected)}. Display thresholds are not a verified diagnosis.
          </p>
          <table>
            <caption>Associated instruments</caption>
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Value</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => {
                const r = frame.readings.find((r) => r.sensor_id === s.id);
                return (
                  <tr key={s.id}>
                    <th scope="row">{s.id.replaceAll("_", " ")}</th>
                    <td>
                      {r?.value == null
                        ? "Missing"
                        : r.value.toFixed(2) + " " + s.unit}
                    </td>
                    <td>{r?.quality || "MISSING"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!sensors.length && (
            <p>No sensor is mapped to this structural component.</p>
          )}
          {report && (
            <>
              <button
                className="primary-action"
                onClick={() => setTab("Investigation")}
              >
                Resume existing investigation
              </button>
              <p>
                Resume the captured {report.request.context.component_id}{" "}
                investigation with {report.trials.length} / 4 tests completed.
                Inspection selection and playback do not change its evidence or
                test history.
              </p>
            </>
          )}
          <p id={captureExplanationId} className="muted">
            {captureExplanation}{" "}
            {report &&
              "Your existing investigation and test history are preserved."}
          </p>
          {preview && (
            <button onClick={() => setPreview(null)}>
              Return to observed simulation
            </button>
          )}
          {report ? (
            <details>
              <summary>Capture new evidence</summary>
              <p>
                A new capture replaces the active investigation and its test
                history. Export the existing report first to retain a copy.
                Resuming the existing investigation does not capture evidence or
                run a test.
              </p>
              {captureAction}
            </details>
          ) : (
            captureAction
          )}
          <details>
            <summary>Component provenance</summary>
            <p>
              {component?.provenance}. Parent: pump-104; stable ID: {selected}.
              All machine controls modify simulation/replay only.
            </p>
          </details>
        </aside>
      </div>
      <div className="case-journey" aria-label="Investigation journey">
        <div>
          <span className="station-eyebrow">
            {report
              ? `CAPTURE ${report.report_hash.slice(0, 8)}`
              : "PUMP-104 / SYNTHETIC CASE"}
          </span>
          <strong>
            {!report
              ? "Inspect → capture → compare → test → verify"
              : `${report.trials.length} / 4 tests · ${resultLabel(report.decision.status)}`}
          </strong>
          <span>
            {report
              ? `Captured ${report.request.context.component_id} · samples ${report.evidence_window.first_sequence}–${report.evidence_window.last_sequence}. Selection and playback do not change this evidence.`
              : "Select a component and inspect its observation window. Every experiment requires your confirmation."}
          </span>
        </div>
        {!report ? (
          <button
            className="primary-action"
            disabled={
              busy ||
              replayed ||
              !!preview ||
              !!recipe.actions.length ||
              !sensors.length
            }
            onClick={() => {
              if (cursor < 319) {
                focusScenario();
                setTab("Machine");
              } else void diagnose();
            }}
          >
            {cursor < 319
              ? "Inspect diagnostic window"
              : "Capture observation window"}
          </button>
        ) : (
          <button
            className="primary-action"
            onClick={() => setTab(report.plan ? "Experiments" : "Verification")}
          >
            {report.plan
              ? "Resume investigation: review proposed experiment"
              : "Resume investigation: review verified findings"}
          </button>
        )}
      </div>
      {tab === "Machine" && <InstrumentStrip frame={frame} />}
      {(tab === "Machine" || tab === "Telemetry") && (
        <section className="station-panel">
          <h2>
            Telemetry ·{" "}
            {preview
              ? "counterfactual experiment"
              : replayed
                ? "imported replay"
                : "simulated recording"}
          </h2>
          <p>
            <strong>Selected component: {component?.name}.</strong>{" "}
            {replayed
              ? "Imported acquisition timestamps determine the time axis."
              : `${recipe.sample_period_seconds} second simulation step.`}{" "}
            Playback is bounded to {recording.frames.length} frames; history
            plots show at most 120 samples. Camera motion does not advance
            physics. Amber diamonds mark display watch or out-of-range readings;
            missing readings are omitted. Watch conditions do not establish a
            failure. The displayed vertical range follows the visible samples.
          </p>
          {sensors.slice(0, 3).map((s) => {
            const rows = preview
              ? [
                  recording.frames[
                    report?.request.context.at_sequence ?? cursor
                  ],
                  preview,
                ]
              : recording.frames.slice(Math.max(0, cursor - 119), cursor + 1);
            const values = rows.flatMap((f) => {
              const v = f.readings.find((r) => r.sensor_id === s.id)?.value;
              return v == null ? [] : [v];
            });
            const low = values.length ? Math.min(...values) : 0;
            const high = values.length ? Math.max(...values) : 1;
            const span = Math.max(high - low, 0.01);
            return (
              <figure key={s.id}>
                <figcaption>
                  {s.id.replaceAll("_", " ")} ({s.unit}) · displayed range{" "}
                  {low.toFixed(2)}–{high.toFixed(2)}
                </figcaption>
                <p>
                  {preview
                    ? "Captured before / counterfactual after"
                    : "Acquisition window"}
                  : {rows[0]?.timestamp} → {rows.at(-1)?.timestamp}
                </p>
                <p className="muted">
                  {replayed
                    ? "Baseline unavailable for unverified recording."
                    : `Initial observed reading: ${recording.frames[0]?.readings.find((r) => r.sensor_id === s.id)?.value?.toFixed(2) ?? "Missing"} ${s.unit}. Display comparison only; no failure proof.`}
                </p>
                <svg
                  viewBox="0 0 360 140"
                  role="img"
                  aria-label={`${s.id} time series in ${s.unit}; range ${low.toFixed(2)} to ${high.toFixed(2)}; acquisition timestamps above`}
                >
                  <path d="M55 10V110H355" stroke="#aab7b8" fill="none" />
                  <text x="0" y="18" fontSize="16" fill="#24494e">
                    {high.toFixed(2)}
                  </text>
                  <text x="0" y="100" fontSize="16" fill="#24494e">
                    {low.toFixed(2)}
                  </text>
                  {rows.map((f, i) => {
                    const reading = f.readings.find(
                      (r) => r.sensor_id === s.id,
                    );
                    const v = reading?.value;
                    if (v == null) return null;
                    const x = (i / Math.max(1, rows.length - 1)) * 290 + 60;
                    const y = 100 - ((v - low) / span) * 85;
                    const watch =
                      reading?.quality === "OUT_OF_RANGE" ||
                      displayWatch[s.id]?.(v);
                    const label = `${f.timestamp}: ${v} ${s.unit}; ${reading?.quality}${watch ? "; display watch" : ""}`;
                    if (watch)
                      return (
                        <path
                          key={f.sequence}
                          d={`M${x} ${y - 4}l4 4 -4 4 -4 -4Z`}
                          fill="#985000"
                        >
                          <title>{label}</title>
                        </path>
                      );
                    return (
                      <circle
                        key={f.sequence}
                        cx={x}
                        cy={y}
                        r="2"
                        fill="#15776e"
                      >
                        <title>{label}</title>
                      </circle>
                    );
                  })}
                </svg>
              </figure>
            );
          })}
        </section>
      )}
      {["Investigation", "Experiments", "Verification", "Reports"].includes(
        tab,
      ) && (
        <section className="station-panel">
          <p className="muted">
            Live Meta inference unavailable here. Numerical verification remains
            independent of proposal source.
          </p>
          <h2>
            {tab === "Investigation"
              ? "Investigation workspace"
              : tab === "Experiments"
                ? "Diagnostic experiments"
                : tab === "Verification"
                  ? "Independent verification results"
                  : "Reproducible investigation report"}
          </h2>
          {tab === "Investigation" && (
            <details className="model-pathway">
              <summary>Hypothesis source and private Meta pathway</summary>
              <ModelPanel
                report={report}
                busy={busy}
                preparedHash={preparedHash}
                onPrepare={() => void prepareModelEvidence()}
              />
            </details>
          )}
          {!report ? (
            <p>
              Select an instrumented component at sequence 319 or later, then
              capture evidence. No model request is required.
            </p>
          ) : (
            <>
              <p className="source-label">
                {report.model_proposal?.source === "test_transport"
                  ? "Recorded fixture proposals — not Meta inference"
                  : report.model_proposal
                    ? "Recorded Meta response claim — source not authenticated by replay"
                    : "Deterministic rules — not Meta inference"}
              </p>
              {tab === "Reports" && <ReportPreview report={report} />}
              <p>
                Captured from {report.request.context.component_id} at sequence
                {report.request.context.at_sequence}; evidence window{" "}
                {report.evidence_window.first_sequence}–
                {report.evidence_window.last_sequence}.
              </p>
              <h3>{resultLabel(report.decision.status)}</h3>
              <p>
                {report.decision.findings.map(causeName).join("; ") ||
                  "No supported finding yet."}
              </p>
              <p>{report.decision.reasons.join(" ")}</p>
              {(tab === "Investigation" || tab === "Reports") && (
                <table>
                  <caption>
                    Competing explanations · ordering is not probability
                  </caption>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Evidence status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.ranking.map((r) => (
                      <tr key={r.hypothesis_id}>
                        <td>
                          <details>
                            <summary>{causeName(r.hypothesis_id)}</summary>
                            <p>
                              {
                                report.hypotheses.hypotheses.find(
                                  (h) => h.hypothesis_id === r.hypothesis_id,
                                )?.rationale
                              }
                            </p>
                            <p>References: {r.evidence_refs.join(", ")}</p>
                          </details>
                        </td>
                        <td>{resultLabel(r.evidence_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {(tab === "Investigation" || tab === "Experiments") &&
                report.plan && (
                  <>
                    <h3>Proposed test: {testName(report.plan.kind)}</h3>
                    <p>{report.plan.reason}</p>
                    <ul>
                      {report.plan.competing_predictions.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <p className="test-confirmation">
                      Confirming runs one bounded synthetic intervention with
                      before/after replicates. It does not control equipment or
                      call a model.
                    </p>
                    <button
                      className="primary-action"
                      disabled={busy}
                      onClick={() => void diagnose(true)}
                    >
                      Run proposed simulated test
                    </button>
                  </>
                )}
              <TrialComparison report={report} recording={recording} />
              <h3>Independent verification</h3>
              <p>{report.decision.uncertainty}</p>
              <p>
                Numerical channel support is not unique identification of a
                physical failure. Tests use synthetic before/after instrument
                replicates.
              </p>
              <ol>
                {report.events.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => {
                        setPlaying(false);
                        setPreview(e.after_frame);
                        setTab("Machine");
                      }}
                    >
                      {testName(e.action)} · {resultLabel(e.verification)} ·
                      inspect machine response
                    </button>
                  </li>
                ))}
              </ol>
              <button
                onClick={() =>
                  download(
                    "forge-industrial-report.json",
                    JSON.stringify(report, null, 2),
                  )
                }
              >
                Export investigation JSON
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const response = await boundedFetch(
                      report.model_proposal
                        ? "/api/v5/report.html"
                        : "/api/v4/report.html",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(
                          report.model_proposal ? report : report.request,
                        ),
                        signal: request.current?.signal,
                      },
                    );
                    if (!response.ok)
                      throw Error("HTML export failed. Wait and retry.");
                    download(
                      "forge-industrial-report.html",
                      await response.text(),
                      "text/html",
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Export unavailable",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Export investigation HTML
              </button>
              <p>
                Generate verified HTML offline: from backend run{" "}
                <code>
                  uv run --frozen python -m forge.industrial.replay report.json
                  --html report.html
                </code>
                . Existing investigation-library HTML/JSON exports remain
                available.
              </p>
              <details>
                <summary>Complete evidence and limitations</summary>
                <pre>{JSON.stringify(report, null, 2)}</pre>
              </details>
            </>
          )}
        </section>
      )}
      {(tab === "Machine" || tab === "Replay") && (
        <section className="station-panel">
          <h2>Fault and event timeline</h2>
          <p>
            Scenario events identify injected simulation conditions, not
            independently diagnosed root causes.
          </p>
          <ol>
            {[...recording.events, ...operatorEvents]
              .sort((a, b) => a.sequence - b.sequence)
              .map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      setPlaying(false);
                      setPreview(null);
                      setCursor(e.sequence);
                      setSelected(e.component);
                    }}
                  >
                    sample {e.sequence} · {e.kind.replaceAll("_", " ")} ·{" "}
                    {e.component}
                  </button>
                </li>
              ))}
          </ol>
        </section>
      )}
      {(tab === "Evidence" || tab === "Replay") && (
        <section className="station-panel">
          <h2>Evidence and portable replay</h2>
          {onOpenLibrary && (
            <div className="library-bridge">
              <h3>Thermal, waveform and equipment-record investigations</h3>
              <p>
                The retained case library contains separate synthetic evidence
                cases. It does not fabricate these modalities for this pump.
                Your pump capture, selection and test history stay in memory
                while you inspect the library.
              </p>
              <button onClick={onOpenLibrary}>
                Inspect multimodal case library
              </button>
            </div>
          )}
          <p>{recording.limitations}</p>
          <button onClick={exportTelemetry}>Export telemetry JSON</button>
          <label>
            Import bounded telemetry CSV/JSON or investigation JSON
            <input
              aria-label="Import recording"
              type="file"
              accept=".json,.csv"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
          </label>
          <p>
            Maximum 1 MiB, 600 timestamps and 5400 instrument samples. Mapping,
            units and time order are validated. Imported source/calibration is
            unverified; imports never enable connected mode or model calls.
          </p>
          {importHash && (
            <p>
              Imported file SHA-256: <code>{importHash}</code>
            </p>
          )}
          <details>
            <summary>Import format</summary>
            <pre>
              {
                'JSON: {"schema":"forge-telemetry-1","machine_id":"pump-104","samples":[{"timestamp":"2026-10-27T08:00:00Z","sensor_id":"vibration","component_id":"bearing","value":2,"unit":"mm/s"}]}\nCSV header: timestamp,sensor_id,component_id,value,unit'
              }
            </pre>
          </details>
        </section>
      )}
      <footer>
        <p>
          Simulated equipment · No physical control writes · Public inference
          disabled.
        </p>
        <a href="/assets/THIRD_PARTY_NOTICES.txt">Third-party licenses</a>
      </footer>
    </main>
  );
}
