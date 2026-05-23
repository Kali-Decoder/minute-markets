"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { formatEther } from "viem";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Database, RefreshCcw, Users2 } from "lucide-react";
import { PredictionMarketABI } from "@/app/config/predictionMarketAbi";
import { PredictionMarketFactoryABI } from "@/app/config/predictionMarketFactoryAbi";
import { usePredictionMarketFactoryAddress, usePredictionMarketFactoryGetAllMarkets } from "@/app/hooks/usePredictionMarketFactory";

type MarketMeta = {
  marketAddress: Address;
  marketName: string;
  marketSymbol: string;
  coinId: string;
  creator: Address;
  createdAt: bigint;
  active: boolean;
};

type MarketSnapshot = {
  market: Address;
  name: string;
  symbol: string;
  active: boolean; // factory-level toggle
  createdAtMs: number | null;
  contractBalanceWei: bigint | null;
  currentPoolWei: bigint | null;
  currentEpoch: bigint | null;
  roundStatus: number | null; // PredictionMarket.RoundStatus
};

type TotalsPoint = { t: number; totalBalance: number; totalPool: number };

type RoundLike = { totalPool?: bigint; status?: number };

const STATUS_COLORS = {
  LIVE: "#22c55e",
  LOCKED: "#60a5fa",
  ENDED: "#a855f7",
  CANCELLED: "#f97316",
  INACTIVE: "rgba(156,163,175,0.75)",
};

type ContractCall = {
  address: Address;
  abi: unknown;
  functionName: string;
  args?: readonly unknown[];
};

type CallResult<T> =
  | { status: "success"; result: T }
  | { status: "failure"; error: Error };

type MinimalPublicClient = {
  multicall: (params: { contracts: ContractCall[]; allowFailure: boolean }) => Promise<unknown[]>;
  readContract: (params: {
    address: Address;
    abi: unknown;
    functionName: string;
    args?: readonly unknown[];
  }) => Promise<unknown>;
};

function safeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function fmtNative(wei: bigint | null | undefined): string {
  if (wei === null || wei === undefined) return "—";
  const n = Number(formatEther(wei));
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  if (n < 0.001) return "<0.001";
  if (n < 1) return n.toFixed(3);
  if (n < 1000) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function roundStatusLabel(status: number | null | undefined): keyof typeof STATUS_COLORS | "—" {
  if (status === null || status === undefined) return "—";
  switch (status) {
    case 0:
      return "LIVE";
    case 1:
      return "LOCKED";
    case 2:
      return "ENDED";
    case 3:
      return "CANCELLED";
    default:
      return "—";
  }
}

function toMs(ts: bigint | null | undefined): number | null {
  if (ts === null || ts === undefined) return null;
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return n * 1000;
}

async function readMany<T = unknown>(
  publicClient: MinimalPublicClient,
  calls: ContractCall[]
): Promise<Array<CallResult<T>>> {
  try {
    const results = await publicClient.multicall({
      contracts: calls,
      allowFailure: true,
    });
    return results.map((r) => {
      if (r && typeof r === "object" && "status" in r) {
        const rr = r as { status: string; result?: unknown; error?: unknown };
        if (rr.status === "success") return { status: "success", result: rr.result as T } as CallResult<T>;
        const err = rr.error instanceof Error ? rr.error : new Error("Call failed");
        return { status: "failure", error: err } as CallResult<T>;
      }
      return { status: "failure", error: new Error("Call failed") } as CallResult<T>;
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Some chains (like Somnia Testnet) may not have multicall3 configured in viem.
    if (!message.toLowerCase().includes("multicall3")) throw e;
    const settled = await Promise.allSettled(
      calls.map((c) =>
        publicClient.readContract({
          address: c.address,
          abi: c.abi,
          functionName: c.functionName,
          args: c.args ? [...c.args] : undefined,
        })
      )
    );
    return settled.map((r) =>
      r.status === "fulfilled"
        ? ({ status: "success", result: r.value } as CallResult<T>)
        : ({ status: "failure", error: (r.reason instanceof Error ? r.reason : new Error(String(r.reason))) } as CallResult<T>)
    );
  }
}

export function AdminPlatformAnalytics({ enabled }: { enabled: boolean }) {
  const publicClient = usePublicClient();
  const factoryAddress = usePredictionMarketFactoryAddress();
  const markets = usePredictionMarketFactoryGetAllMarkets(enabled);

  const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<TotalsPoint[]>([]);
  const [, bumpHistoryVersion] = useState(0);

  const marketAddresses = useMemo(() => {
    const data = markets.data;
    return Array.isArray(data) ? (data as Address[]) : [];
  }, [markets.data]);

  const refresh = async () => {
    if (!enabled) return;
    if (!publicClient || !factoryAddress) return;
    if (!marketAddresses.length) {
      setSnapshots([]);
      setLastUpdatedAt(Date.now());
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const metaCalls = marketAddresses.map((market) => ({
        address: factoryAddress,
        abi: PredictionMarketFactoryABI,
        functionName: "getMarketInfo" as const,
        args: [market] as const,
      }));

      const metaResults = await readMany<MarketMeta>(publicClient, metaCalls);

      const metas: MarketMeta[] = metaResults
        .map((r) => (r.status === "success" ? r.result : null))
        .filter((m): m is MarketMeta => !!m);

      const balanceCalls = metas.map((m) => ({
        address: m.marketAddress,
        abi: PredictionMarketABI,
        functionName: "getContractBalance" as const,
        args: [] as const,
      }));

      const poolCalls = metas.map((m) => ({
        address: m.marketAddress,
        abi: PredictionMarketABI,
        functionName: "getCurrentRound" as const,
        args: [] as const,
      }));

      const epochCalls = metas.map((m) => ({
        address: m.marketAddress,
        abi: PredictionMarketABI,
        functionName: "currentEpoch" as const,
        args: [] as const,
      }));

      const [balanceResults, poolResults, epochResults] = await Promise.all([
        readMany<bigint>(publicClient, balanceCalls),
        readMany<unknown>(publicClient, poolCalls),
        readMany<bigint>(publicClient, epochCalls),
      ]);

      const next: MarketSnapshot[] = metas.map((m, i) => {
        const balance = balanceResults[i]?.status === "success" ? balanceResults[i].result : null;
        const roundResult = poolResults[i]?.status === "success" ? poolResults[i].result : null;
        const epoch = epochResults[i]?.status === "success" ? epochResults[i].result : null;

        const round = (roundResult && typeof roundResult === "object" ? (roundResult as RoundLike) : null);
        const totalPoolWei = round?.totalPool ?? null;
        const roundStatus = typeof round?.status === "number" ? round.status : null;

        return {
          market: m.marketAddress,
          name: m.marketName,
          symbol: m.marketSymbol,
          active: m.active,
          createdAtMs: toMs(m.createdAt),
          contractBalanceWei: balance,
          currentPoolWei: totalPoolWei,
          currentEpoch: epoch,
          roundStatus,
        };
      });

      next.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
      setSnapshots(next);

      const totalBalanceWei = next.reduce((acc, s) => (s.contractBalanceWei ? acc + s.contractBalanceWei : acc), 0n);
      const totalPoolWei = next.reduce((acc, s) => (s.currentPoolWei ? acc + s.currentPoolWei : acc), 0n);
      const point: TotalsPoint = {
        t: Date.now(),
        totalBalance: safeNumber(Number(formatEther(totalBalanceWei))) ?? 0,
        totalPool: safeNumber(Number(formatEther(totalPoolWei))) ?? 0,
      };

      const history = historyRef.current;
      history.push(point);
      while (history.length > 120) history.shift();
      bumpHistoryVersion((v) => v + 1);

      setLastUpdatedAt(point.t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, factoryAddress, publicClient, marketAddresses.join(",")]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, factoryAddress, publicClient, marketAddresses.join(",")]);

  const totals = useMemo(() => {
    const totalMarkets = snapshots.length;
    const liveMarkets = snapshots.filter((s) => s.active && s.roundStatus === 0).length;
    const totalBalanceWei = snapshots.reduce((acc, s) => (s.contractBalanceWei ? acc + s.contractBalanceWei : acc), 0n);
    const totalPoolWei = snapshots.reduce((acc, s) => (s.currentPoolWei ? acc + s.currentPoolWei : acc), 0n);
    return { totalMarkets, liveMarkets, totalBalanceWei, totalPoolWei };
  }, [snapshots]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { LIVE: 0, LOCKED: 0, ENDED: 0, CANCELLED: 0, INACTIVE: 0 };
    for (const s of snapshots) {
      if (!s.active) {
        counts.INACTIVE += 1;
        continue;
      }
      const label = roundStatusLabel(s.roundStatus);
      if (label === "—") continue;
      counts[label] += 1;
    }
    return (Object.keys(counts) as Array<keyof typeof STATUS_COLORS>).map((k) => ({
      name: k,
      value: counts[k] ?? 0,
      fill: STATUS_COLORS[k],
    }));
  }, [snapshots]);

  const balanceBars = useMemo(() => {
    return snapshots
      .map((s) => ({
        name: s.symbol || s.name || shortAddr(s.market),
        balance: safeNumber(Number(formatEther(s.contractBalanceWei ?? 0n))) ?? 0,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [snapshots]);

  const poolBars = useMemo(() => {
    return snapshots
      .map((s) => ({
        name: s.symbol || s.name || shortAddr(s.market),
        pool: safeNumber(Number(formatEther(s.currentPoolWei ?? 0n))) ?? 0,
      }))
      .sort((a, b) => b.pool - a.pool)
      .slice(0, 10);
  }, [snapshots]);

  const history = historyRef.current;

  return (
    <section className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.04] mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Platform Analytics</h2>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className={[
            "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border shadow-sm transition-all",
            loading
              ? "border-white/10 bg-white/5 text-gray-500 cursor-not-allowed"
              : "border-purple-500/20 bg-purple-500/10 text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/30",
          ].join(" ")}
        >
          <RefreshCcw className={["h-3.5 w-3.5", loading ? "animate-spin" : ""].join(" ")} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.03] p-4 text-xs text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={<Database className="h-4 w-4 text-purple-300" />}
          label="Markets"
          value={String(totals.totalMarkets)}
          hint={`${totals.liveMarkets} LIVE`}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4 text-purple-300" />}
          label="Open Pool"
          value={fmtNative(totals.totalPoolWei)}
          hint="Across current rounds"
        />
        <MetricCard
          icon={<Database className="h-4 w-4 text-purple-300" />}
          label="Contract Balance"
          value={fmtNative(totals.totalBalanceWei)}
          hint="Native token (sum)"
        />
        <MetricCard
          icon={<Users2 className="h-4 w-4 text-purple-300" />}
          label="Last Updated"
          value={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "—"}
          hint={lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleDateString() : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Market Status">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={78} innerRadius={48} paddingAngle={3}>
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Balances (Native)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceBars} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <Bar dataKey="balance" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Open Pools (Native)">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={poolBars} layout="vertical" margin={{ top: 6, right: 10, bottom: 6, left: 18 }}>
                <defs>
                  <linearGradient id="poolFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={86}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "rgba(156,163,175,0.8)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}
                  formatter={(v: number | string) => [
                    Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }),
                    "Pool",
                  ]}
                />
                <Bar dataKey="pool" fill="url(#poolFill)" radius={[10, 10, 10, 10]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Live Totals (Session)">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 11 }}
                  tickFormatter={(t) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "rgba(156,163,175,0.75)", fontSize: 11 }} />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.12)", strokeDasharray: "4 4" }}
                  contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.1)" }}
                  labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
                />
                <Line type="monotone" dataKey="totalPool" stroke="#60a5fa" strokeWidth={2.5} dot={false} name="Open Pool" />
                <Line type="monotone" dataKey="totalBalance" stroke="#a855f7" strokeWidth={2.5} dot={false} name="Contract Balance" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[10px] text-gray-500">
            Captures a snapshot every ~30s while this page stays open.
          </div>
        </Panel>

        <Panel title="Markets">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-12 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <div className="col-span-5">Market</div>
              <div className="col-span-2 text-right">Balance</div>
              <div className="col-span-2 text-right">Open Pool</div>
              <div className="col-span-2 text-right">Epoch</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            <div className="divide-y divide-white/5">
              {snapshots.slice(0, 8).map((s) => (
                (() => {
                  const label = !s.active ? "INACTIVE" : roundStatusLabel(s.roundStatus);
                  const color =
                    label !== "—" && label in STATUS_COLORS
                      ? STATUS_COLORS[label as keyof typeof STATUS_COLORS]
                      : "rgba(156,163,175,0.75)";
                  return (
                <Link
                  key={s.market}
                  href={`/markets/${s.market}`}
                  className="grid grid-cols-12 px-3 py-2.5 text-xs hover:bg-white/[0.03] transition-colors"
                >
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <span
                      className={[
                        "h-2 w-2 rounded-full shrink-0",
                        s.active && s.roundStatus === 0 ? "bg-green-400" : s.active ? "bg-purple-400" : "bg-gray-600",
                      ].join(" ")}
                    />
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">
                        {s.symbol ? s.symbol : s.name ? s.name : shortAddr(s.market)}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">{shortAddr(s.market)}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-gray-200">{fmtNative(s.contractBalanceWei)}</div>
                  <div className="col-span-2 text-right tabular-nums text-gray-200">{fmtNative(s.currentPoolWei)}</div>
                  <div className="col-span-2 text-right tabular-nums text-gray-400">{s.currentEpoch?.toString() ?? "—"}</div>
                  <div className="col-span-1 text-right">
                    <span
                      className="inline-flex items-center justify-end rounded-lg border px-1.5 py-0.5 text-[10px] font-black tracking-widest"
                      style={{ borderColor: "rgba(255,255,255,0.10)", color }}
                    >
                      {label}
                    </span>
                  </div>
                </Link>
                  );
                })()
              ))}

              {!snapshots.length && !loading ? (
                <div className="px-3 py-10 text-center text-xs text-gray-500">No markets found on this chain.</div>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/30">
            {icon}
          </span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</div>
            <div className="text-2xl font-black text-white tabular-nums">{value}</div>
          </div>
        </div>
      </div>
      {hint ? <div className="mt-2 text-[10px] text-gray-500">{hint}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{title}</div>
      {children}
    </div>
  );
}
