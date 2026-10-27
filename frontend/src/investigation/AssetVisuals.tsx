import { useEffect, useRef, useState } from "react";
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
          Colors map to the temperature values. This display is not a model
          interpretation.
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
  const plot = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(650);
  useEffect(() => {
    if (!plot.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, entry.contentRect.width)),
    );
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(...samples.map(Math.abs), 0.01);
  const points = samples
    .map(
      (v, i) =>
        `${48 + (i / Math.max(1, samples.length - 1)) * (width - 72)},${100 - (v / max) * 65}`,
    )
    .join(" ");
  return (
    <figure className="waveform-figure">
      <svg
        ref={plot}
        viewBox={`0 0 ${width} 220`}
        role="img"
        aria-label="Calibrated vibration waveform"
      >
        <title>
          Vibration amplitude in millimeters per second across{" "}
          {samples.length / rate} seconds.
        </title>
        {[-1, 0, 1].map((f) => (
          <g key={f}>
            <line
              x1="48"
              x2={width - 24}
              y1={100 - f * 65}
              y2={100 - f * 65}
              className="plot-grid"
            />
            <text x="40" y={105 - f * 65} textAnchor="end">
              {(f * max).toFixed(1)}
            </text>
          </g>
        ))}
        <polyline points={points} className="plot-trace" />
        <text x="48" y="195">
          0 s
        </text>
        <text x={width - 24} y="195" textAnchor="end">
          {(samples.length / rate).toFixed(3)} s
        </text>
        <text x="48" y="18">
          Amplitude in mm/s
        </text>
      </svg>
      <figcaption>
        {rate} samples per second. {samples.length} observations. This is a
        numerical vibration signal, not a model audio interpretation.
      </figcaption>
    </figure>
  );
}
