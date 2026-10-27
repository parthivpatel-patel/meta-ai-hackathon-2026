import { useState } from "react";

export type Channel = "temperature" | "vibration" | "pressure";
export type Row = {
  minute: number;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
};

const UNITS = { temperature: "°C", vibration: "mm/s", pressure: "bar" };

export function human(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
export function Status({ value }: { value: string }) {
  const text: Record<string, string> = {
    SUPPORTED: "Supported",
    SUPPORTED_SYNTHETIC: "Supported in simulation",
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
    HYPOTHESES_READY: "Ready for investigation",
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
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel-empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function SignalChart({
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
          at {index}m{current === null ? ", missing" : ""}
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
        Minute {index}:{" "}
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
export function Thermal({ pixels }: { pixels: number[][] }) {
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
        Calibrated array. {pixels[0].length} × {pixels.length}
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
export function Waveform({
  samples,
  rate,
}: {
  samples: number[];
  rate: number;
}) {
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
        {rate} Hz sampling. {samples.length} samples. Deterministic signal, not
        model audio interpretation
      </figcaption>
    </figure>
  );
}
