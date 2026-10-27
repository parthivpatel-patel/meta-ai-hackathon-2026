import { Component, type ReactNode, lazy, Suspense, useState } from "react";
import "./workstation.css";
import DemoConsole from "../DemoConsole";
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
        <h1>Workstation unavailable</h1>
        <p role="alert">
          The workspace could not load. Use Investigation library above or
          reload to retry.
        </p>
        <button onClick={() => location.reload()}>Reload workstation</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function Shell() {
  const [library, setLibrary] = useState(
    new URLSearchParams(location.search).get("view") === "investigations",
  );
  return (
    <>
      <div className="workstation-entry">
        <strong>FORGE · Simulation workspace</strong>
        <button
          onClick={() => {
            const next = !library;
            setLibrary(next);
            history.replaceState(
              null,
              "",
              next ? "/demo?view=investigations" : "/demo",
            );
          }}
        >
          {library ? "Machine workstation" : "Investigation library"}
        </button>
      </div>
      {library ? (
        <DemoConsole />
      ) : (
        <WorkspaceBoundary>
          <Suspense
            fallback={<p role="status">Loading machine workstation…</p>}
          >
            <Workstation />
          </Suspense>
        </WorkspaceBoundary>
      )}
    </>
  );
}
