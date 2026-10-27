import { useState } from "react";
import type { Channel, Session } from "./types";
import { causeName, testName } from "./presentation";
const parts: { channel: Channel; name: string; x: number; unit: string }[] = [
  { channel: "temperature", name: "Motor housing", x: -1.2, unit: "°C" },
  { channel: "vibration", name: "Bearing assembly", x: 0, unit: "mm/s" },
  { channel: "pressure", name: "Pump housing", x: 1.2, unit: "bar" },
];
export function EquipmentModel({ session }: { session: Session }) {
  const [yaw, setYaw] = useState(30);
  const [zoom, setZoom] = useState(85);
  const [selected, setSelected] = useState<Channel>("temperature");
  const part = parts.find((p) => p.channel === selected)!;
  const result = session.decision.channels.find((c) => c.channel === selected);
  const row = session.measurements.at(-1);
  const angle = (yaw * Math.PI) / 180;
  const project = ([x, y, z]: number[]) =>
    [
      250 + zoom * (x * Math.cos(angle) - z * Math.sin(angle)),
      110 + zoom * (y - (x * Math.sin(angle) + z * Math.cos(angle)) * 0.35),
    ].join(",");
  const faces = parts
    .flatMap((p) => {
      const vertices = [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => [p.x + x * 0.4, y * 0.4, z * 0.4]),
        ),
      );
      return [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
      ].map((indices, face) => ({
        p,
        face,
        vertices: indices.map((i) => vertices[i]),
        depth: indices.reduce(
          (s, i) =>
            s +
            vertices[i][0] * Math.sin(angle) +
            vertices[i][2] * Math.cos(angle),
          0,
        ),
      }));
    })
    .sort((a, b) => b.depth - a.depth);
  return (
    <section aria-label="Interactive equipment diagram">
      <h3>Inspect the equipment</h3>
      <p>
        Illustrative 3D geometry and sensor locations, not a validated digital
        twin. Yellow marks statistical anomalies, not proven damage.
      </p>
      <svg
        viewBox="0 0 500 220"
        role="img"
        aria-label={`Illustrative equipment, ${part.name} selected`}
        style={{ width: "100%", maxHeight: 250 }}
      >
        {faces.map(({ p, face, vertices }) => (
          <polygon
            key={`${p.channel}-${face}`}
            points={vertices.map(project).join(" ")}
            fill={
              p.channel === selected
                ? "#93c5fd"
                : session.observed.signals.some(
                      (s) => s.channel === p.channel && s.flags > 0,
                    )
                  ? "#fcd34d"
                  : "#d1d5db"
            }
            stroke="#334155"
            onClick={() => setSelected(p.channel)}
          />
        ))}
      </svg>
      <label>
        Rotation{" "}
        <input
          aria-label="Equipment rotation"
          type="range"
          min="-180"
          max="180"
          value={yaw}
          onChange={(e) => setYaw(Number(e.target.value))}
        />
      </label>
      <label>
        Zoom{" "}
        <input
          aria-label="Equipment zoom"
          type="range"
          min="45"
          max="100"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </label>
      <button
        onClick={() => {
          setYaw(30);
          setZoom(85);
        }}
      >
        Reset equipment view
      </button>
      <div role="group" aria-label="Equipment components">
        {parts.map((p) => (
          <button
            key={p.channel}
            aria-pressed={selected === p.channel}
            onClick={() => setSelected(p.channel)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <h4>
        {part.name}: {selected} sensor
      </h4>
      <p>
        Latest sample:{" "}
        {row?.[selected] == null ? "Missing" : `${row[selected]} ${part.unit}`}.
        Flagged samples:{" "}
        {session.observed.signals.find((s) => s.channel === selected)?.flags ??
          0}
        .
      </p>
      <p>
        Possible causes:{" "}
        {session.ranking
          .map((r) => `${causeName(r.hypothesis_id)} (${r.evidence_status})`)
          .join("; ") || "Not yet evaluated"}
        . Candidates are not localized damage.
      </p>
      <p>
        Next test:{" "}
        {session.plan ? testName(session.plan.kind) : "No pending test"}.
        Completed tests: {session.trials.length}.
      </p>
      {session.trials.map((t) => (
        <details key={t.id}>
          <summary>{testName(t.kind)}</summary>
          {t.probes
            ?.filter((p) => p.channel === selected)
            .map((p, i) => (
              <p key={i}>
                Independent witness before: {p.witness_before.join(", ")};
                after: {p.witness_after.join(", ")}. Numerical experiment, not a
                physical intervention.
              </p>
            ))}
        </details>
      ))}
      <p>
        Independent verification: {result?.status ?? "Not yet available"}.{" "}
        {result?.reasons.join(" ")}
      </p>
      <ul>
        {session.evidence.map((e) => (
          <li key={e.id}>
            <code>{e.id}</code>: {e.summary} ({e.provenance})
          </li>
        ))}
      </ul>
      <p>
        SVG rendering needs no WebGL context. Use keyboard controls for
        rotation, zoom and component selection.
      </p>
    </section>
  );
}
