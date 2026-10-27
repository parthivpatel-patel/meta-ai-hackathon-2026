import { useEffect, useRef, useState } from "react";
import type { Row, Channel } from "./types";
const units = { temperature: "°C", vibration: "mm/s", pressure: "bar" };
const titles = {
  temperature: "Temperature",
  vibration: "Vibration",
  pressure: "Pressure",
};
export function TelemetryChart({
  rows,
  flags,
}: {
  rows: Row[];
  flags: { channel: string; flags: number }[];
}) {
  const plot = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!plot.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    );
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const left = 48,
    right = width - 20,
    span = right - left;
  const [channel, setChannel] = useState<Channel>("pressure");
  const [minute, setMinute] = useState(100);
  const [hover, setHover] = useState<number | null>(null);
  const index = hover ?? minute;
  const values = rows.flatMap((r) =>
    r[channel] == null ? [] : [r[channel] as number],
  );
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const pad = Math.max(
    (maximum - minimum) * 0.16,
    channel === "temperature" ? 0.5 : 0.05,
  );
  const low = minimum - pad,
    high = maximum + pad;
  const x = (i: number) => left + (i / 119) * span;
  const y = (v: number) => 250 - ((v - low) / (high - low)) * 210;
  const paths: string[] = [];
  let points: string[] = [];
  rows.forEach((r, i) => {
    if (r[channel] == null) {
      if (points.length) paths.push(points.join(" "));
      points = [];
    } else points.push(`${x(i)},${y(r[channel]!)}`);
  });
  if (points.length) paths.push(points.join(" "));
  const missing = rows.filter((r) => r[channel] == null).length;
  const value = rows[index]?.[channel];
  return (
    <section className="telemetry-instrument" aria-label="Sensor measurements">
      <div
        className="signal-picker"
        role="group"
        aria-label="Choose a measurement"
      >
        {(Object.keys(titles) as Channel[]).map((c) => (
          <button
            key={c}
            aria-pressed={channel === c}
            onClick={() => setChannel(c)}
          >
            {titles[c]}
          </button>
        ))}
      </div>
      <div className="instrument-heading">
        <div>
          <h2>{titles[channel]} over time</h2>
          <p>
            {flags.find((f) => f.channel === channel)?.flags || 0} readings
            flagged for review. Flags are not a diagnosis.
          </p>
        </div>
        <div className="measurement">
          <strong>{value == null ? "Missing" : value.toFixed(2)}</strong>
          <span>{units[channel]}</span>
        </div>
      </div>
      <svg
        ref={plot}
        viewBox={`0 0 ${width} 300`}
        className="telemetry-plot"
        role="img"
        aria-label={`${titles[channel]} measurements in ${units[channel]}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.max(
              0,
              Math.min(
                119,
                Math.round(
                  ((((e.clientX - rect.left) / rect.width) * width - left) /
                    span) *
                    119,
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setHover(null)}
        onClick={() => setMinute(index)}
      >
        <title>
          {titles[channel]}, minutes 0 to 119. {missing} missing observations.
          Use the minute control to inspect with a keyboard.
        </title>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              x2={right}
              y1={250 - f * 210}
              y2={250 - f * 210}
              className="plot-grid"
            />
            <text x={left - 12} y={255 - f * 210} textAnchor="end">
              {(low + f * (high - low)).toFixed(
                channel === "temperature" ? 0 : 1,
              )}
            </text>
          </g>
        ))}
        {(width < 400 ? [0, 60, 119] : [0, 30, 60, 90, 119]).map((i) => (
          <text key={i} x={x(i)} y="280" textAnchor="middle">
            {i}
          </text>
        ))}
        {rows.map((r, i) =>
          r[channel] == null ? (
            <line
              key={i}
              x1={x(i)}
              x2={x(i)}
              y1="42"
              y2="250"
              className="missing-mark"
            />
          ) : null,
        )}
        {paths.map((p, i) => (
          <polyline key={i} points={p} className="plot-trace" />
        ))}
        <line
          x1={x(index)}
          x2={x(index)}
          y1="35"
          y2="250"
          className="plot-cursor"
        />
        {value != null && (
          <circle cx={x(index)} cy={y(value)} r="4" className="plot-point" />
        )}
      </svg>
      <div className="plot-axis">
        <span>{units[channel]}</span>
        <span>Elapsed time in minutes</span>
      </div>
      <label className="minute-control">
        Inspect a minute
        <input
          aria-label="Measurement minute"
          type="range"
          min="0"
          max="119"
          value={minute}
          onChange={(e) => setMinute(Number(e.target.value))}
        />
        <output>{index} min</output>
      </label>
      <p className="plot-note">
        {missing
          ? `${missing} ${missing === 1 ? "observation is" : "observations are"} missing. Gaps and dashed marks show where no reading exists.`
          : "All 120 observations are available."}{" "}
        Each signal uses its own scale. Measurements come from a synthetic
        equipment model.
      </p>
    </section>
  );
}
