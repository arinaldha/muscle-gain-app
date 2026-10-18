"use client";

import { useEffect, useRef, useState } from "react";

type Pt = { x: number; y: number | null };
export type Series = { name: string; color: string; points: Pt[]; dashed?: boolean; dots?: boolean; line?: boolean };

/** Small dependency-free SVG line chart. Null y values create gaps. */
export default function Chart({
  series,
  xLabel = (x: number) => String(x),
  yFmt = (y: number) => y.toFixed(0),
  height = 220,
  yPad = 0.5,
  emptyText = "Belum ada data.",
  width = 640,
}: {
  series: Series[];
  xLabel?: (x: number) => string;
  yFmt?: (y: number) => string;
  height?: number;
  yPad?: number;
  emptyText?: string;
  width?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(width);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMeasured(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = measured, H = height, L = 44, R = 12, T = 12, B = 28;
  const all = series.flatMap((s) => s.points);
  const ys = all.map((p) => p.y).filter((v): v is number => v != null);
  const xs = all.map((p) => p.x);
  if (!ys.length || !xs.length) return <div ref={box} className="empty">{emptyText}</div>;
  let yMin = Math.min(...ys) - yPad, yMax = Math.max(...ys) + yPad;
  if (yMax - yMin < 1) { yMin -= 0.5; yMax += 0.5; }
  const xMin = Math.min(...xs), xMax = Math.max(...xs) === xMin ? xMin + 1 : Math.max(...xs);
  const sx = (x: number) => L + ((x - xMin) / (xMax - xMin)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B);
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / ticks);
  const xStep = Math.max(1, Math.ceil((xMax - xMin) / Math.max(3, Math.floor(W / 80))));
  const xTicks: number[] = [];
  for (let x = xMin; x <= xMax; x += xStep) xTicks.push(x);

  const paths = series.map((s) => {
    const segs: string[] = [];
    let cur = "";
    for (const p of s.points) {
      if (p.y == null) { if (cur) segs.push(cur); cur = ""; continue; }
      cur += `${cur ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
    }
    if (cur) segs.push(cur);
    return segs.join(" ");
  });

  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={series.map((s) => s.name).join(" vs ")} style={{ display: "block" }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={L - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{yFmt(t)}</text>
          </g>
        ))}
        {xTicks.map((x) => (
          <text key={x} x={sx(x)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{xLabel(x)}</text>
        ))}
        {series.map((s, i) => (
          <g key={s.name}>
            {s.line !== false && (
              <path d={paths[i]} fill="none" stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? "6 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
            )}
            {s.dots &&
              s.points.filter((p) => p.y != null).map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y!)} r={3.6} fill={s.color} stroke="var(--surface)" strokeWidth={1.5}>
                  <title>{`${s.name}: ${yFmt(p.y!)} (${xLabel(p.x)})`}</title>
                </circle>
              ))}
          </g>
        ))}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.name}>
            <i style={{ background: s.color, opacity: s.dashed ? 0.7 : 1 }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
