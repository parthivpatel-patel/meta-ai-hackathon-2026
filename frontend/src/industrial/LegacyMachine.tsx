import { useEffect, useState, lazy, Suspense } from "react";
import { boundedFetch } from "../investigation/useInvestigation";
import type { Session } from "../investigation/types";
import type { Component, Frame } from "./contracts";
const Machine = lazy(() =>
  import("./Machine").then((x) => ({ default: x.Machine })),
);
export function LegacyMachine({ session, selected, cursor, onSelect, onCursor }: { session: Session; selected:string;cursor:number;onSelect:(id:string)=>void;onCursor:(position:number)=>void }) {
  const [components,setComponents]=useState<Component[]>([]);
  const [fallback,setFallback]=useState(false);
  useEffect(() => {
    const a = new AbortController();
    void boundedFetch("/api/v4/catalog", { signal: a.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((r) => {
        if (!a.signal.aborted && Array.isArray(r.components))
          setComponents(r.components);
      })
      .catch(() => {});
    return () => a.abort();
  }, []);
  const row =
    session.measurements[Math.min(cursor, session.measurements.length - 1)];
  const frame: Frame = {
    sequence: cursor,
    timestamp: `Case minute ${row?.minute ?? 0}`,
    state: "CASE_OBSERVATION",
    source: "SYNTHETIC_LIBRARY_CASE",
    readings: [
      {
        sensor_id: "motor_temperature",
        value: row?.temperature ?? null,
        quality: row?.temperature == null ? "MISSING" : "VALID",
      },
      {
        sensor_id: "vibration",
        value: row?.vibration ?? null,
        quality: row?.vibration == null ? "MISSING" : "VALID",
      },
      {
        sensor_id: "discharge_pressure",
        value: row?.pressure ?? null,
        quality: row?.pressure == null ? "MISSING" : "VALID",
      },
    ],
  };
  return (
    <section
      className="industrial legacy-machine"
      aria-label="Case machine inspection"
    >
      <h2>Inspect the case measurements</h2>
      <p>
        Reference pump geometry, not a calibrated reconstruction of{" "}
        {session.metadata.equipment_id}. Temperature, vibration and pressure
        below come from this case. RPM, flow and other operating states are
        unavailable; no rotor motion is inferred.
      </p>
      {components.length ? (
        <>
          <label>
            Case component
            <select
              aria-label="Case component"
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
            >
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setFallback((v) => !v)}>
            {fallback ? "Use case 3D view" : "Use case 2D view"}
          </button>
          <Suspense fallback={<p>Loading reference assembly…</p>}>
            <Machine
              components={components}
              selected={selected}
              onSelect={onSelect}
              frame={frame}
              rotorPhase={null}
              force2D={fallback}
            />
          </Suspense>
        </>
      ) : (
        <p>
          Reference geometry unavailable. Measurements and original equipment
          inspector remain available.
        </p>
      )}
      <label>
        Case observation position
        <input
          type="range"
          aria-label="Case observation position"
          min={0}
          max={session.measurements.length - 1}
          value={cursor}
          onChange={(e) => onCursor(Number(e.target.value))}
        />
      </label>
      <table>
        <caption>
          Case minute {row?.minute}; not interpolated pump operating values
        </caption>
        <thead>
          <tr>
            <th>Temperature</th>
            <th>Vibration</th>
            <th>Pressure</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{row?.temperature ?? "Missing"} °C</td>
            <td>{row?.vibration ?? "Missing"} mm/s</td>
            <td>{row?.pressure ?? "Missing"} bar</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
