"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

export type OddsPoint = { t: number; yes: number; no: number };

type RangeKey = "1H" | "6H" | "1D" | "ALL";

const RANGES: Array<{ key: RangeKey; label: string; ms: number | null }> = [
  { key: "1H", label: "1H", ms: 60 * 60_000 },
  { key: "6H", label: "6H", ms: 6 * 60 * 60_000 },
  { key: "1D", label: "1D", ms: 24 * 60 * 60_000 },
  { key: "ALL", label: "ALL", ms: null },
];

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function fmtPct(v: number): string {
  return `${clampPct(v).toFixed(1)}%`;
}

function fmtTimeLabel(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

/** Recharts needs at least two points to draw a visible line segment. */
function ensureRenderableSeries(series: OddsPoint[]): OddsPoint[] {
  if (series.length === 0) return [];
  if (series.length === 1) {
    const p = series[0];
    return [
      { t: p.t - 30_000, yes: p.yes, no: p.no },
      p,
    ];
  }
  return series;
}

export function MarketOddsHistoryChart({
  series,
  defaultRange = "ALL",
  yesLabel = "UP",
  noLabel = "DOWN",
  variant = "default",
}: {
  series: OddsPoint[];
  defaultRange?: RangeKey;
  yesLabel?: string;
  noLabel?: string;
  variant?: "default" | "embedded";
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [now, setNow] = useState(() => Date.now());
  const embedded = variant === "embedded";

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const ms = RANGES.find((r) => r.key === range)?.ms ?? null;
    if (!ms) return series;
    const cutoff = now - ms;
    return series.filter((p) => p.t >= cutoff);
  }, [now, range, series]);

  const chartData = useMemo(
    () => ensureRenderableSeries(filtered.length > 0 ? filtered : series),
    [filtered, series],
  );

  const last = chartData.length ? chartData[chartData.length - 1] : null;
  const first = chartData.length ? chartData[0] : null;

  const yesDelta = useMemo(() => {
    if (!last || !first) return null;
    return clampPct(last.yes) - clampPct(first.yes);
  }, [first, last]);

  const noDelta = useMemo(() => {
    if (!last || !first) return null;
    return clampPct(last.no) - clampPct(first.no);
  }, [first, last]);

  const yesDeltaAbs = yesDelta === null ? null : Math.abs(yesDelta);
  const noDeltaAbs = noDelta === null ? null : Math.abs(noDelta);

  const chartHeight = embedded ? 200 : 260;

  const chart = (
    <div
      className={embedded ? "w-full" : "rounded-2xl border border-white/10 bg-black/20 overflow-hidden"}
      style={{ height: chartHeight }}
    >
      {chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-xs text-gray-500">
          Waiting for pool data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="t"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(156,163,175,0.75)", fontSize: embedded ? 10 : 12 }}
              minTickGap={embedded ? 24 : 28}
              tickFormatter={fmtTimeLabel}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(156,163,175,0.75)", fontSize: embedded ? 10 : 12 }}
              tickFormatter={(v) => `${v}%`}
              width={embedded ? 36 : 42}
            />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.12)", strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0]?.payload as OddsPoint | undefined;
                if (!p) return null;
                return (
                  <div className="rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-xs text-white">
                    <div className="text-gray-400">{new Date(p.t).toLocaleTimeString()}</div>
                    <div className="mt-1 text-emerald-400">{yesLabel}: {fmtPct(p.yes)}</div>
                    <div className="text-rose-400">{noLabel}: {fmtPct(p.no)}</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="yes"
              name={yesLabel}
              stroke="#34d399"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#34d399", stroke: "#ecfdf5", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="no"
              name={noLabel}
              stroke="#fb7185"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#fb7185", stroke: "#fff1f2", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  if (embedded) {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <LegendLineRow
            lineColor="bg-emerald-400"
            textColor="text-emerald-400"
            label={yesLabel}
            pct={last ? fmtPct(last.yes) : "—"}
            delta={yesDelta}
            deltaAbs={yesDeltaAbs}
          />
          <LegendLineRow
            lineColor="bg-rose-400"
            textColor="text-rose-400"
            label={noLabel}
            pct={last ? fmtPct(last.no) : "—"}
            delta={noDelta}
            deltaAbs={noDeltaAbs}
          />
        </div>
        {chart}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="w-full space-y-6 lg:w-[280px]">
          <LegendLineRow
            lineColor="bg-emerald-400"
            textColor="text-emerald-400"
            label={yesLabel}
            pct={last ? fmtPct(last.yes) : "—"}
            delta={yesDelta}
            deltaAbs={yesDeltaAbs}
          />
          <LegendLineRow
            lineColor="bg-rose-400"
            textColor="text-rose-400"
            label={noLabel}
            pct={last ? fmtPct(last.no) : "—"}
            delta={noDelta}
            deltaAbs={noDeltaAbs}
          />
        </div>

        <div className="flex-1">
          <div className="mb-2 flex items-center justify-end">
            <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/30 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={[
                    "h-9 rounded-xl px-3 text-sm font-semibold transition-colors",
                    range === r.key ? "bg-sky-400 text-black" : "text-gray-400 hover:text-white",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {chart}
        </div>
      </div>
    </div>
  );
}

function LegendLineRow({
  lineColor,
  textColor,
  label,
  pct,
  delta,
  deltaAbs,
}: {
  lineColor: string;
  textColor: string;
  label: string;
  pct: string;
  delta: number | null;
  deltaAbs: number | null;
}) {
  const down = typeof delta === "number" && delta < 0;
  const up = typeof delta === "number" && delta > 0;
  const neutral = !down && !up;

  const DeltaIcon = down ? TrendingDown : TrendingUp;
  const deltaText =
    typeof deltaAbs === "number" ? deltaAbs.toFixed(deltaAbs >= 10 ? 0 : 1) : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-black/20 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-[3px] w-8 shrink-0 rounded-full ${lineColor}`} />
        <div className={`text-sm font-semibold ${textColor}`}>{label}</div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className={[
            "inline-flex items-center gap-1 text-xs tabular-nums",
            down ? "text-red-300" : up ? "text-green-300" : "text-gray-500",
          ].join(" ")}
        >
          {neutral || !deltaText ? null : <DeltaIcon className="h-3.5 w-3.5" />}
          {neutral || !deltaText ? null : <span>{deltaText}</span>}
        </div>
        <div className="text-xl font-bold tabular-nums text-white">{pct}</div>
      </div>
    </div>
  );
}
