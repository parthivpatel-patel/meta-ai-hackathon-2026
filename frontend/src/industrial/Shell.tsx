import { Component, type ReactNode, lazy, Suspense, useState, useRef } from "react";
import "./workstation.css";
import DemoConsole from "../DemoConsole";
import { modes } from "./recovery";
const Workstation = lazy(() => import("./Workstation"));
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
  const [family, setFamily] = useState<"machine" | "library">(
    legacy ? "library" : "machine",
  );
  const currentFamily=useRef(family);currentFamily.current=family;
  const [view, setView] = useState("Machine");
  const [machineVisited, setMachineVisited] = useState(!legacy),
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
    if (modes.includes(mode as (typeof modes)[number])) {
      if (family === "machine") setMachineMode(mode);
      else setLibraryMode(mode);
    }
  }
  return (
    <>
      <header className="workstation-entry unified-brand">
        <strong>FORGE · Industrial intelligence</strong>
        <span>
          {family === "machine"
            ? "PUMP-104 / coupled simulation"
            : "Evidence case / synthetic library"}
        </span>
        <button onClick={() => navigate("Status")}>Status / About</button>
      </header>
      <nav className="unified-navigation" aria-label="Unified workspace">
        {["Cases", ...modes].map((mode) => (
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
              Private genuine Meta verification is not published by this public
              app. The Phase 7 attempt remains subject to verified financial and
              credential gates. A private successful smoke would not enable
              public inference or establish workstation accuracy.
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
                require reviewed private evidence; no such success is asserted
                by this screen.
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
      {libraryVisited && (
        <div hidden={family !== "library" || view === "Status"}>
          <DemoConsole
            embedded
            workspaceMode={view === "Cases" ? "Cases" : libraryMode}
            onModeChange={(mode) => {
              setLibraryMode(mode);
              if(currentFamily.current === "library")setView(mode);
            }}
          />
        </div>
      )}
      {machineVisited && (
        <div
          hidden={family !== "machine" || view === "Cases" || view === "Status"}
        >
          <WorkspaceBoundary>
            <Suspense
              fallback={<p role="status">Loading industrial workspace…</p>}
            >
              <Workstation
                embedded
                active={
                  family === "machine" && view !== "Cases" && view !== "Status"
                }
                workspaceMode={machineMode}
                onModeChange={(mode) => {
                  setMachineMode(mode);
                  if (currentFamily.current === "machine") setView(mode);
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
