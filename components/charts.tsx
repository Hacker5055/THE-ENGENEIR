"use client";

import { useId } from "react";
import { cx } from "@/lib/utils";

/* Hand-built SVG data visualisation.
   Deliberate choices: no chart dependency, tabular figures, restrained
   gradients, visible baselines, and every chart exposes a text summary for
   screen readers (role="img" + aria-label). */

export type Series = { name: string; color: string; data: number[]; dashed?: boolean };

export function LineChart({
  series,
  labels,
  height = 220,
  yMax,
  yTicks = 4,
  valueSuffix = "",
  grid = true,
  ariaLabel,
  compact,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  yMax?: number;
  yTicks?: number;
  valueSuffix?: string;
  grid?: boolean;
  ariaLabel: string;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const W = 640;
  const H = height;
  const padL = compact ? 6 : 34;
  const padR = 8;
  const padT = 12;
  const padB = compact ? 6 : 26;
  const max = yMax ?? Math.max(1, ...series.flatMap((s) => s.data)) * 1.12;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i: number) => padL + (labels.length <= 1 ? innerW / 2 : (i / (labels.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / max) * innerH;

  const path = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const area = (data: number[]) =>
    `${path(data)} L${x(data.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${ariaLabel}. ${series.map((s) => `${s.name}: ${s.data.join(", ")}`).join(". ")}`}
    >
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {grid &&
        Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = (max / yTicks) * i;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" strokeDasharray={i === 0 ? undefined : "3 4"} />
              {!compact && (
                <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="9.5" fill="currentColor" opacity="0.45">
                  {Math.round(v)}
                  {valueSuffix}
                </text>
              )}
            </g>
          );
        })}

      {series.map((s, i) => (
        <g key={s.name}>
          {series.length <= 2 && <path d={area(s.data)} fill={`url(#${uid}-g${i})`} />}
          <path
            d={path(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dashed ? "5 5" : undefined}
          />
          {s.data.map((v, j) => (
            <circle key={j} cx={x(j)} cy={y(v)} r={2.4} fill={s.color} stroke="var(--am-surface)" strokeWidth="1.4">
              <title>{`${s.name} — ${labels[j]}: ${v}${valueSuffix}`}</title>
            </circle>
          ))}
        </g>
      ))}

      {!compact &&
        labels.map((lb, i) => {
          const step = Math.ceil(labels.length / 8);
          if (i % step !== 0 && i !== labels.length - 1) return null;
          return (
            <text key={lb + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="currentColor" opacity="0.45">
              {lb}
            </text>
          );
        })}
    </svg>
  );
}

export function BarChart({
  data,
  height = 200,
  color = "#38A5FF",
  suffix = "",
  ariaLabel,
  horizontal = false,
  showValues = true,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  suffix?: string;
  ariaLabel: string;
  horizontal?: boolean;
  showValues?: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (horizontal) {
    return (
      <div className="space-y-2.5" role="img" aria-label={`${ariaLabel}. ${data.map((d) => `${d.label}: ${d.value}${suffix}`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[11.5px] text-fg-soft">{d.label}</span>
                {showValues && <span className="tnum shrink-0 text-[11px] font-medium text-fg-muted">{d.value}{suffix}</span>}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const W = 640;
  const H = height;
  const padB = 24;
  const padT = 14;
  const gap = 8;
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${ariaLabel}. ${data.map((d) => `${d.label}: ${d.value}${suffix}`).join(", ")}`}>
      {data.map((d, i) => {
        const h = Math.max(2, ((d.value / max) * (H - padB - padT)));
        const bx = i * (bw + gap);
        return (
          <g key={d.label}>
            <rect x={bx} y={padT} width={bw} height={H - padB - padT} rx={4} fill="currentColor" opacity="0.045" />
            <rect x={bx} y={H - padB - h} width={bw} height={h} rx={4} fill={d.color ?? color}>
              <title>{`${d.label}: ${d.value}${suffix}`}</title>
            </rect>
            {showValues && (
              <text x={bx + bw / 2} y={H - padB - h - 5} textAnchor="middle" fontSize="9.5" fill="currentColor" opacity="0.6">
                {d.value}{suffix}
              </text>
            )}
            <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize="9.5" fill="currentColor" opacity="0.45">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({
  segments,
  size = 150,
  thickness = 16,
  centerLabel,
  centerValue,
  ariaLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  ariaLabel: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${ariaLabel}. ${segments.map((s) => `${s.label}: ${s.value}`).join(", ")}`}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth={thickness} />
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                style={{ transition: "stroke-dasharray .6s ease" }}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            {centerValue && <p className="tnum text-lg font-semibold text-fg">{centerValue}</p>}
            {centerLabel && <p className="text-[10px] text-fg-muted">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="min-w-0 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[11.5px]">
            <span className="size-2 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate text-fg-soft">{s.label}</span>
            <span className="tnum ms-auto shrink-0 font-medium text-fg">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ data, color = "#38A5FF", width = 90, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / Math.max(1, data.length - 1)) * width},${height - 3 - ((v - min) / span) * (height - 6)}`)
    .join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Heatmap({
  cells,
  ariaLabel,
  weeks = 13,
}: {
  cells: { date: string; value: number; label?: string }[];
  ariaLabel: string;
  weeks?: number;
}) {
  const COLORS = ["color-mix(in srgb, var(--am-surface-3) 90%, transparent)", "#14513f", "#17795d", "#19B88A"];
  return (
    <div role="img" aria-label={ariaLabel} className="space-y-2">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridAutoColumns: "minmax(0, 1fr)" }}>
        {cells.map((c, i) => (
          <div
            key={c.date + i}
            className="aspect-square w-full rounded-[2.5px] transition hover:ring-1 hover:ring-white/30"
            style={{ background: COLORS[Math.min(3, Math.max(0, c.value))] }}
            title={`${c.date} — ${c.label ?? ""}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-fg-muted">
        <span className="me-1">أقل</span>
        {COLORS.map((col) => (
          <span key={col} className="size-2.5 rounded-[2px]" style={{ background: col }} />
        ))}
        <span className="ms-1">أكثر</span>
      </div>
    </div>
  );
}

export function Gauge({
  value,
  max = 100,
  label,
  tone = "#38A5FF",
  size = 132,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = size / 2 - 10;
  const c = Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div className="inline-grid place-items-end" style={{ width: size, height: size / 2 + 18 }} role="img" aria-label={`${label ?? ""} ${value} من ${max}`}>
      <svg width={size} height={size / 2 + 14} className="overflow-visible">
        <path d={`M10,${cy} A${r},${r} 0 0 1 ${size - 10},${cy}`} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="9" strokeLinecap="round" />
        <path
          d={`M10,${cy} A${r},${r} 0 0 1 ${size - 10},${cy}`}
          fill="none"
          stroke={tone}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          style={{ transition: "stroke-dasharray .7s ease" }}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="600" fill="currentColor">
          {Math.round(value)}
        </text>
      </svg>
      {label && <p className="-mt-1 text-center text-[10px] text-fg-muted">{label}</p>}
    </div>
  );
}

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cx("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
