"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  return `${clampPct(v).toFixed(0)}%`;
}

function fmtTimeLabel(t: number): string {
  const d = new Date(t);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MarketOddsHistoryChart({
  series,
  defaultRange = "6H",
  yesLabel = "Yes",
  noLabel = "No",
}: {
  series: OddsPoint[];
  defaultRange?: RangeKey;
  yesLabel?: string;
  noLabel?: string;
}) {
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [now, setNow] = useState(() => Date.now());

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

  const last = filtered.length ? filtered[filtered.length - 1] : null;
  const first = filtered.length ? filtered[0] : null;

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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="w-full lg:w-[280px] space-y-6">
          <LegendRow
            color="bg-green-400"
            label={yesLabel}
            pct={last ? fmtPct(last.yes) : "—"}
            delta={yesDelta}
            deltaAbs={yesDeltaAbs}
          />
          <LegendRow
            color="bg-blue-400"
            label={noLabel}
            pct={last ? fmtPct(last.no) : "—"}
            delta={noDelta}
            deltaAbs={noDeltaAbs}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-end mb-2">
            <div className="inline-flex items-center rounded-2xl border border-white/10 bg-black/30 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={[
                    "h-9 px-3 text-sm font-semibold rounded-xl transition-colors",
                    range === r.key ? "bg-sky-400 text-black" : "text-gray-400 hover:text-white",
                  ].join(" ")}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[220px] sm:h-[260px] rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filtered} margin={{ top: 12, right: 16, bottom: 12, left: 8 }}>
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 12 }}
                  minTickGap={28}
                  tickFormatter={fmtTimeLabel}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.12)", strokeDasharray: "4 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0]?.payload as OddsPoint | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-xs text-white">
                        <div className="text-gray-400">{new Date(p.t).toLocaleString()}</div>
                        <div className="mt-1">Yes: {fmtPct(p.yes)}</div>
                        <div>No: {fmtPct(p.no)}</div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="yes" stroke="#22c55e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="no" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  pct,
  delta,
  deltaAbs,
}: {
  color: string;
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
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={["h-3 w-3 rounded-full", color].join(" ")} />
        <div className="text-lg text-white font-semibold">{label}</div>
      </div>
      <div className="flex items-center gap-4">
        <div
          className={[
            "inline-flex items-center gap-1 text-sm tabular-nums",
            down ? "text-red-300" : up ? "text-green-300" : "text-gray-500",
          ].join(" ")}
        >
          {neutral || !deltaText ? null : <DeltaIcon className="h-4 w-4" />}
          {neutral || !deltaText ? null : <span>{deltaText}</span>}
        </div>
        <div className="text-3xl text-white font-bold tabular-nums">{pct}</div>
      </div>
    </div>
  );
}
