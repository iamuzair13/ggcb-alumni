"use client";

/**
 * Hand-built accessible SVG charts — no chart library.
 * Every chart offers: a tooltip on focus/hover, keyboard-focusable data
 * points, a "View as table" toggle, and an sr-only text summary.
 * Colours are never the only signal (values + labels always rendered).
 */
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
  /** Semantic hue (status chips, donut slices) — overrides palette order. */
  tone?: "primary" | "success" | "warning" | "destructive" | "accent" | "info";
}

/* ── layout math — pure, unit-tested ──────────────────────────────── */

/** Nice round tick values for a linear 0..max axis. */
export function axisTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = Math.ceil(max / count / 5) * 5 || 1;
  const ticks: number[] = [];
  for (let v = 0; v <= step * count; v += step) ticks.push(v);
  return ticks;
}

/** Simple label-collision drop for dense x axes: keep every nth. */
export function thinLabels(labels: string[], maxShown = 7): boolean[] {
  if (labels.length <= maxShown) return labels.map(() => true);
  const stride = Math.ceil(labels.length / maxShown);
  return labels.map((_, i) => i % stride === 0);
}

/* ── shared frame ─────────────────────────────────────────────────── */

export function ChartCard({
  title,
  summary,
  headers = ["Label", "Value"],
  rows,
  children,
  height = 240,
}: {
  title: string;
  /** sr-only summary of the data. */
  summary: string;
  headers?: string[];
  rows: (string | number)[][];
  children: React.ReactNode;
  height?: number;
}) {
  const [table, setTable] = useState(false);
  const id = useId();
  return (
    <figure className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <figcaption className="text-sm font-semibold">{title}</figcaption>
        <button
          type="button"
          aria-pressed={table}
          aria-controls={id}
          onClick={() => setTable((t) => !t)}
          className="rounded-md border border-input px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {table ? "View as chart" : "View as table"}
        </button>
      </div>
      <p className="sr-only">{summary}</p>
      {table ? (
        <div id={id} className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {headers.map((h) => (
                  <th key={h} scope="col" className="py-1.5 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={cn("py-1.5 pr-3", j > 0 && "tnum")}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div id={id} className="mt-3" style={{ height }}>
          {children}
        </div>
      )}
    </figure>
  );
}

/* ── horizontal bars ──────────────────────────────────────────────── */

export function BarChartH({ data }: { data: ChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <svg
      viewBox={`0 0 400 ${data.length * 34 + 8}`}
      className="h-full w-full"
      role="img"
      aria-label={`Bar chart with ${data.length} rows`}
    >
      {data.map((d, i) => {
        const y = i * 34 + 4;
        const w = (d.value / max) * 220;
        return (
          <g key={d.label} tabIndex={0} className="outline-none">
            <title>{`${d.label}: ${d.value}${d.hint ? ` (${d.hint})` : ""}`}</title>
            <text
              x={0}
              y={y + 14}
              className="fill-muted-foreground"
              fontSize={11}
            >
              {d.label.length > 20 ? `${d.label.slice(0, 19)}…` : d.label}
            </text>
            <rect
              x={140}
              y={y}
              width={Math.max(w, 2)}
              height={22}
              rx={3}
              className="animate-chart-grow fill-primary/80"
              style={{ animationDelay: `${i * 60}ms` }}
            />
            <text
              x={146 + w}
              y={y + 15}
              fontSize={11}
              className="tnum fill-foreground"
              fontWeight={600}
            >
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── vertical columns ─────────────────────────────────────────────── */

export function BarChartV({ data }: { data: ChartDatum[] }) {
  const W = 400;
  const H = 200;
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = Math.min(40, (W - 20) / data.length - 8);
  const shown = thinLabels(data.map((d) => d.label));
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 24}`}
      className="h-full w-full"
      role="img"
      aria-label={`Column chart with ${data.length} columns`}
    >
      {data.map((d, i) => {
        const slot = (W - 20) / data.length;
        const x = 10 + i * slot + (slot - bw) / 2;
        const h = (d.value / max) * (H - 20);
        return (
          <g key={d.label} tabIndex={0} className="outline-none">
            <title>{`${d.label}: ${d.value}`}</title>
            <rect
              x={x}
              y={H - h}
              width={bw}
              height={Math.max(h, 1)}
              rx={3}
              className="animate-chart-grow-y fill-primary/80"
              style={{ animationDelay: `${i * 50}ms` }}
            />
            <text
              x={x + bw / 2}
              y={H - h - 4}
              textAnchor="middle"
              fontSize={10}
              className="tnum fill-foreground"
            >
              {d.value}
            </text>
            {shown[i] && (
              <text
                x={x + bw / 2}
                y={H + 14}
                textAnchor="middle"
                fontSize={9}
                className="fill-muted-foreground"
              >
                {d.label.length > 8 ? d.label.slice(0, 7) : d.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={H} x2={W} y2={H} className="stroke-border" />
    </svg>
  );
}

/* ── line ─────────────────────────────────────────────────────────── */

export function LineChart({ data }: { data: ChartDatum[] }) {
  const W = 400;
  const H = 200;
  const max = Math.max(1, ...data.map((d) => d.value));
  const px = 24;
  const step = data.length > 1 ? (W - px * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - 16 - (v / max) * (H - 40);
  const pts = data.map((d, i) => `${px + i * step},${y(d.value)}`);
  const shown = thinLabels(data.map((d) => d.label));
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 24}`}
      className="h-full w-full"
      role="img"
      aria-label={`Line chart with ${data.length} points`}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
      />
      {data.map((d, i) => (
        <g key={d.label} tabIndex={0} className="outline-none">
          <title>{`${d.label}: ${d.value}`}</title>
          <circle
            cx={px + i * step}
            cy={y(d.value)}
            r={9}
            className="fill-transparent"
          />
          <circle
            cx={px + i * step}
            cy={y(d.value)}
            r={3.5}
            className="fill-primary"
          />
          {shown[i] && (
            <text
              x={px + i * step}
              y={H + 14}
              textAnchor="middle"
              fontSize={9}
              className="fill-muted-foreground"
            >
              {d.label}
            </text>
          )}
        </g>
      ))}
      <line
        x1={px}
        y1={H - 8}
        x2={W - px}
        y2={H - 8}
        className="stroke-border"
      />
    </svg>
  );
}

/* ── donut ────────────────────────────────────────────────────────── */

const TONE_FILL = {
  primary: "fill-primary",
  success: "fill-success-foreground",
  warning: "fill-warning-foreground",
  destructive: "fill-destructive",
  accent: "fill-accent-foreground",
  info: "fill-info-foreground",
} as const;
const TONE_STROKE = {
  primary: "stroke-primary",
  success: "stroke-success-foreground",
  warning: "stroke-warning-foreground",
  destructive: "stroke-destructive",
  accent: "stroke-accent-foreground",
  info: "stroke-info-foreground",
} as const;
/** Untoned slices cycle a distinct palette (categorical, not status). */
const DONUT_FALLBACK_FILL = [
  "fill-primary",
  "fill-success-foreground",
  "fill-accent-foreground",
  "fill-info-foreground",
  "fill-muted-foreground",
];
const DONUT_FALLBACK_STROKE = [
  "stroke-primary",
  "stroke-success-foreground",
  "stroke-accent-foreground",
  "stroke-info-foreground",
  "stroke-muted-foreground",
];

export function DonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  const offsets: number[] = [];
  data.reduce((acc, d, i) => {
    offsets[i] = -acc * C;
    return acc + d.value / total;
  }, 0);
  return (
    <div className="flex h-full items-center justify-center gap-4 sm:gap-6">
      <svg
        viewBox="0 0 180 180"
        className="h-full w-auto max-w-[55%] min-w-0 shrink"
        role="img"
        aria-label={`Donut chart, ${data.length} segments`}
      >
        <circle
          cx={90}
          cy={90}
          r={R}
          fill="none"
          className="stroke-muted"
          strokeWidth={22}
        />
        {data.map((d, i) => {
          const dash = (d.value / total) * C;
          const off = offsets[i];
          return (
            <g key={d.label} tabIndex={0} className="outline-none">
              <title>{`${d.label}: ${d.value}`}</title>
              <circle
                cx={90}
                cy={90}
                r={R}
                fill="none"
                strokeWidth={22}
                strokeDasharray={`${Math.max(dash - 1.5, 0.5)} ${C}`}
                strokeDashoffset={off}
                transform="rotate(-90 90 90)"
                className={
                  d.tone
                    ? TONE_STROKE[d.tone]
                    : DONUT_FALLBACK_STROKE[i % DONUT_FALLBACK_STROKE.length]
                }
              />
            </g>
          );
        })}
        <text
          x={90}
          y={86}
          textAnchor="middle"
          fontSize={20}
          fontWeight={700}
          className="tnum fill-foreground"
        >
          {total}
        </text>
        <text
          x={90}
          y={102}
          textAnchor="middle"
          fontSize={9}
          className="fill-muted-foreground"
        >
          total
        </text>
      </svg>
      <ul className="min-w-0 shrink space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-block size-3 shrink-0 rounded-sm",
                d.tone
                  ? TONE_FILL[d.tone]
                  : DONUT_FALLBACK_FILL[i % DONUT_FALLBACK_FILL.length],
              )}
            />
            <span className="truncate text-muted-foreground">{d.label}</span>
            <span className="tnum shrink-0 font-semibold">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── gradient area ────────────────────────────────────────────────── */

export function AreaChartV({ data }: { data: ChartDatum[] }) {
  const W = 400;
  const H = 200;
  const max = Math.max(1, ...data.map((d) => d.value));
  const px = 24;
  const step = data.length > 1 ? (W - px * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - 16 - (v / max) * (H - 40);
  const pts = data.map((d, i) => [px + i * step, y(d.value)] as const);
  const id = useId();
  const shown = thinLabels(data.map((d) => d.label));
  return (
    <svg
      viewBox={`0 0 ${W} ${H + 24}`}
      className="h-full w-full"
      role="img"
      aria-label={`Area chart with ${data.length} points`}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="text-primary" stopOpacity={0.35} />
          <stop offset="100%" className="text-primary" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`${px},${H - 8} ${pts.map((p) => `${p[0]},${p[1]}`).join(" ")} ${px + step * (data.length - 1)},${H - 8}`}
        fill={`url(#${id}-fill)`}
        className="animate-chart-fade"
      />
      <polyline
        points={pts.map((p) => `${p[0]},${p[1]}`).join(" ")}
        fill="none"
        className="animate-chart-draw stroke-primary"
        strokeWidth={2}
      />
      {data.map((d, i) => (
        <g key={d.label} tabIndex={0} className="outline-none">
          <title>{`${d.label}: ${d.value}`}</title>
          <circle
            cx={pts[i]![0]}
            cy={pts[i]![1]}
            r={9}
            className="fill-transparent"
          />
          <circle
            cx={pts[i]![0]}
            cy={pts[i]![1]}
            r={3.5}
            className="fill-primary"
          />
          {shown[i] && (
            <text
              x={pts[i]![0]}
              y={H + 14}
              textAnchor="middle"
              fontSize={9}
              className="fill-muted-foreground"
            >
              {d.label}
            </text>
          )}
        </g>
      ))}
      <line
        x1={px}
        y1={H - 8}
        x2={W - px}
        y2={H - 8}
        className="stroke-border"
      />
    </svg>
  );
}

/* ── sparkline — inline trend, no chrome ──────────────────────────── */

export function Sparkline({
  values,
  className,
  label = "Trend sparkline",
}: {
  values: number[];
  className?: string;
  label?: string;
}) {
  const W = 96;
  const H = 28;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  const pts = values.map(
    (v, i) => `${i * step},${H - 4 - ((v - min) / range) * (H - 8)}`,
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-7 w-full", className)}
      role="img"
      aria-label={label}
      aria-hidden={label === ""}
      preserveAspectRatio="none"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        className="stroke-primary/60"
        strokeWidth={1.5}
      />
      <circle
        cx={(values.length - 1) * step}
        cy={H - 4 - ((values[values.length - 1]! - min) / range) * (H - 8)}
        r={2.5}
        className="fill-primary"
      />
    </svg>
  );
}
