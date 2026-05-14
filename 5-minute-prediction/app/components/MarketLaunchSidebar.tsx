"use client";

import { useEffect, useState } from "react";
import type { Address, Hash } from "viem";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type ServiceState = {
  running: boolean;
  lastError: string | null;
  nextCreateAt: number | null;
  nextLockAt: number | null;
  nextCloseAt: number | null;
  lastCreatedMarket?: { address: Address; coinId: string; createdAt: number; txHash: Hash };
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function StepRow({
  done,
  title,
  subtitle,
}: {
  done: boolean;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-green-300" />
        ) : (
          <Circle className="h-4 w-4 text-white/20" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-white font-medium">{title}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

export function MarketLaunchSidebar() {
  const [now, setNow] = useState(() => Date.now());

  const { data: state } = useQuery<ServiceState>({
    queryKey: ["market-service-status"],
    queryFn: async () => {
      const res = await fetch("/api/market-service/status", { cache: "no-store" });
      return (await res.json()) as ServiceState;
    },
    refetchInterval: 3_000,
    staleTime: 0,
  });

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tick);
  }, []);

  const nextLaunch = state?.nextCreateAt ? formatCountdown(state.nextCreateAt - now) : null;
  const lockIn = state?.nextLockAt ? formatCountdown(state.nextLockAt - now) : null;
  const closeIn = state?.nextCloseAt ? formatCountdown(state.nextCloseAt - now) : null;

  const createdAt = state?.lastCreatedMarket?.createdAt ?? null;
  const progress = createdAt
    ? {
        created: true,
        started: !!state?.lastActions?.startTxHash,
        locked: !!state?.lastActions?.lockTxHash,
        closed: !!state?.lastActions?.closeTxHash,
      }
    : { created: false, started: false, locked: false, closed: false };

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-monad-purple" />
          <h3 className="text-white font-semibold">Next Market</h3>
        </div>
        <span
          className={[
            "text-[10px] px-2 py-0.5 rounded-full border",
            state?.running ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-300",
          ].join(" ")}
        >
          {state?.running ? "Live" : "Paused"}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-[12px] text-gray-400">Launching in</div>
        <div className="text-4xl font-bold tracking-tight text-white mt-1">{nextLaunch ?? "—"}</div>
        {state?.lastCreatedMarket ? (
          <div className="mt-2 text-xs text-gray-400">
            Last: <span className="text-white">{state.lastCreatedMarket.coinId}</span>{" "}
            <span className="text-gray-500">•</span>{" "}
            <span className="text-gray-300">{state.lastCreatedMarket.address}</span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-500">No market created yet by the service.</div>
        )}
        {state?.lastError ? <div className="mt-2 text-xs text-red-300">Error: {state.lastError}</div> : null}
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs text-gray-400 mb-3">Round lifecycle (auto)</div>
        <div className="space-y-3">
          <StepRow
            done={progress.created}
            title="Market created"
            subtitle={progress.created ? "Done" : "Waiting for next launch"}
          />
          <StepRow
            done={progress.started}
            title="Round started"
            subtitle={progress.started ? "Done" : "After create"}
          />
          <StepRow
            done={progress.locked}
            title="Lock price"
            subtitle={progress.locked ? "Done" : lockIn ? `In ${lockIn}` : "After +5m"}
          />
          <StepRow
            done={progress.closed}
            title="Close price"
            subtitle={progress.closed ? "Done" : closeIn ? `In ${closeIn}` : "After +10m"}
          />
        </div>
      </div>
    </aside>
  );
}
