import { Component, type ReactNode, lazy, Suspense, useState, useRef } from "react";
import "./workstation.css";
import DemoConsole from "../DemoConsole";
import { modes } from "./recovery";
const Workstation = lazy(() => import("./Workstation"));
const RecordedMeta = lazy(() => import("./RecordedMeta"));
class WorkspaceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="industrial">
        <h1>Workspace unavailable</h1>
        <p role="alert">
          Reload to retry; your browser checkpoint remains available unless
          storage was cleared.
        </p>
        <button onClick={() => location.reload()}>Reload workstation</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const pumpCases = {
  normal: "Normal operation",
  bearing: "Bearing degradation",
  misalignment: "Shaft misalignment",
  cavitation: "Cavitation-like conditions",
  pressure_sensor: "Pressure sensor offset",
  thermal: "Cooling degradation",
  process: "Process pressure disturbance",
};
export default function Shell() {
  const legacy =
    new URLSearchParams(location.search).get("view") === "investigations";
  const recorded = new URLSearchParams(location.search).get("view") === "recorded-meta";
  const [family, setFamily] = useState<"machine" | "library">(
    legacy ? "library" : "machine",
  );
  const currentFamily=useRef(family);currentFamily.current=family;
  const [view, setView] = useState(recorded ? "Recorded Meta" : "Machine");
  const currentView = useRef(view); currentView.current = view;
  const [recordedVisited, setRecordedVisited] = useState(recorded);
  const [machineVisited, setMachineVisited] = useState(!legacy && !recorded),
    [libraryVisited, setLibraryVisited] = useState(legacy);
  const [machineMode, setMachineMode] = useState("Machine"),
    [libraryMode, setLibraryMode] = useState("Machine");
  const [caseRequest, setCaseRequest] = useState<
    { scenario: string; sequence: number } | undefined
  >();
  function choose(next: "machine" | "library") {
    setFamily(next);
    if (next === "machine") {
      setMachineVisited(true);
      setView(machineMode);
    } else {
      setLibraryVisited(true);
      setView("Cases");
    }
    history.replaceState(
      null,
      "",
      next === "library" ? "/demo?view=investigations" : "/demo",
    );
  }
  function navigate(mode: string) {
    setView(mode);
    if (mode === "Recorded Meta") setRecordedVisited(true);
    history.replaceState(null, "", mode === "Recorded Meta" ? "/demo?view=recorded-meta" : family === "library" ? "/demo?view=investigations" : "/demo");
    if (modes.includes(mode as (typeof modes)[number])) {
      if (family === "machine") { setMachineVisited(true); setMachineMode(mode); }
      else setLibraryMode(mode);
    }
  }
  return (
    <>
      <header className="workstation-entry unified-brand">
        <strong>FORGE · Industrial intelligence</strong>
        <span>
          {view === "Recorded Meta" ? "Reviewed recorded Meta / synthetic evidence" : family === "machine"
            ? "PUMP-104 / coupled simulation"
            : "Evidence case / synthetic library"}
        </span>
        <button onClick={() => navigate("Status")}>Status / About</button>
      </header>
      <nav className="unified-navigation" aria-label="Unified workspace">
        {["Cases", ...modes, "Recorded Meta"].map((mode) => (
          <button
            key={mode}
            aria-current={view === mode ? "page" : undefined}
            onClick={() => navigate(mode)}
          >
            {mode}
          </button>
        ))}
      </nav>
      {view === "Cases" && (
        <section
          className="industrial case-directory"
          aria-label="Case selection"
        >
          <h1>Select or resume a case</h1>
          <p>
            All cases are synthetic. Coupled pump recordings and multimodal
            evidence cases have different source contracts; they are never
            silently substituted.
          </p>
          <div className="case-families">
            <button
              aria-pressed={family === "machine"}
              onClick={() => choose("machine")}
            >
              Machine workstation
            </button>
            <button
              aria-pressed={family === "library"}
              onClick={() => choose("library")}
            >
              Investigation library
            </button>
          </div>
          <section className="station-panel">
            <h2>Recorded genuine Meta investigation</h2>
            <p>Review the genuine, previously recorded synthetic pressure/sensor case and replay its independent verification without any model requests. Your current workstation case is preserved.</p>
            <button onClick={() => navigate("Recorded Meta")}>Open recorded Meta investigation</button>
          </section>
          {family === "machine" && (
            <>
              <h2>Coupled pump cases</h2>
              <div className="case-cards">
                {Object.entries(pumpCases).map(([scenario, title]) => (
                  <article key={scenario}>
                    <h3>{title}</h3>
                    <p>
                      Deterministic coupled telemetry, component inspection and
                      controlled synthetic experiments.
                    </p>
                    <button
                      onClick={() => {
                        setCaseRequest({ scenario, sequence: Date.now() });
                        setMachineVisited(true);
                        setMachineMode("Machine");
                        setView("Machine");
                      }}
                    >
                      Start {title.toLowerCase()} case
                    </button>
                  </article>
                ))}
              </div>
              <button onClick={() => setView(machineMode)}>
                Resume pump investigation
              </button>
            </>
          )}
        </section>
      )}
      {view === "Status" && (
        <main className="industrial">
          <h1>Status / About</h1>
          <section className="station-panel">
            <h2>Public inference disabled</h2>
            <p>
              Simulation only. No physical control writes. Public APIs cannot
              call Baseten or spend promotional credits.
            </p>
            <h3>Activation and provenance</h3>
            <p>
              The Recorded Meta view publishes one reviewed genuine private
              response with its own synthetic evidence and independent tests.
              It is previously recorded, not live inference, and does not describe
              a separately selected 3D pump capture.
            </p>
            <ul>
              <li>Deterministic rules: labeled on each investigation.</li>
              <li>
                Recorded transport fixture: explicitly not Meta inference.
              </li>
              <li>
                Recorded Meta response: a source claim until independently
                authenticated; numerical replay does not authenticate a
                provider.
              </li>
              <li>
                Genuine Meta verified privately / recorded genuine output:
                are available only in the fixed reviewed Recorded Meta case.
                Arbitrary imported source claims are not promoted to that status.
              </li>
              <li>
                Provider unavailable or activation blocked: offline
                investigations remain available.
              </li>
            </ul>
            <h3>Recovery and hosting</h3>
            <p>
              Browser-local checkpoints are versioned, bounded and independently
              reproduced before restoration. They can be cleared or evicted and
              are not durable server storage. Render Free can sleep or restart;
              temporary SQLite sessions can disappear. Export JSON/HTML and
              recovery checkpoints outside the service. Restored past tests are
              replayed records, not new physical events.
            </p>
            <h3>Limits</h3>
            <p>
              Procedural geometry and synthetic experiments are not CAD,
              calibrated physics, industrial safety certification or field
              accuracy. Only three pump channels enter the existing verifier.
              Thermal and waveform case context is not cross-modal causal proof.
            </p>
            <a href="/assets/THIRD_PARTY_NOTICES.txt">Third-party licenses</a>
          </section>
        </main>
      )}
      {recordedVisited && <div hidden={view !== "Recorded Meta"}>
        <WorkspaceBoundary><Suspense fallback={<p role="status">Loading recorded investigation…</p>}>
          <RecordedMeta onReturn={() => navigate(family === "machine" ? machineMode : libraryMode)} />
        </Suspense></WorkspaceBoundary>
      </div>}
      {libraryVisited && (
        <div hidden={family !== "library" || view === "Status" || view === "Recorded Meta"}>
          <DemoConsole
            embedded
            workspaceMode={view === "Cases" ? "Cases" : libraryMode}
            onModeChange={(mode) => {
              setLibraryMode(mode);
              if(currentFamily.current === "library" && currentView.current !== "Recorded Meta")setView(mode);
            }}
          />
        </div>
      )}
      {machineVisited && (
        <div
          hidden={family !== "machine" || view === "Cases" || view === "Status" || view === "Recorded Meta"}
        >
          <WorkspaceBoundary>
            <Suspense
              fallback={<p role="status">Loading industrial workspace…</p>}
            >
              <Workstation
                embedded
                active={
                  family === "machine" && view !== "Cases" && view !== "Status" && view !== "Recorded Meta"
                }
                workspaceMode={machineMode}
                onModeChange={(mode) => {
                  setMachineMode(mode);
                  if (currentFamily.current === "machine" && currentView.current !== "Recorded Meta") setView(mode);
                }}
                caseRequest={caseRequest}
                onOpenLibrary={() => choose("library")}
              />
            </Suspense>
          </WorkspaceBoundary>
        </div>
      )}
    </>
  );
}
