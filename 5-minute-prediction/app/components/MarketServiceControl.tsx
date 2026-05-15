"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount } from "wagmi";
import { ADMIN_ADDRESS } from "@/app/config/admin";

type ServiceState = {
  running: boolean;
  lastError: string | null;
  nextCreateAt: number | null;
  nextCloseAt: number | null;
  lastCreatedMarket?: { address: Address; coinId: string; createdAt: number; txHash: Hash };
  lastActions?: {
    startedAt?: number | null;
    closeRequestedAt?: number | null;
    startTxHash?: Hash | null;
    closeTxHash?: Hash | null;
  };
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function MarketServiceControl({
  defaultVariant = "compact",
  showVariantToggle = true,
}: {
  defaultVariant?: "compact" | "hero";
  showVariantToggle?: boolean;
} = {}) {
  const { address } = useAccount();
  const isAdmin = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  }, [address]);
  const [variant, setVariant] = useState<"compact" | "hero">(defaultVariant);
  const allowToggle = showVariantToggle;
  const [state, setState] = useState<ServiceState | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const createCountdown = useMemo(() => {
    if (!state?.nextCreateAt) return null;
    return formatCountdown(state.nextCreateAt - now);
  }, [state?.nextCreateAt, now]);

  const closeCountdown = useMemo(() => {
    if (!state?.nextCloseAt) return null;
    return formatCountdown(state.nextCloseAt - now);
  }, [state?.nextCloseAt, now]);

  const refresh = async () => {
    const res = await fetch("/api/market-service/status", { cache: "no-store" });
    const json = (await res.json()) as ServiceState;
    setState(json);
  };

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 3_000);
    return () => clearInterval(interval);
  }, []);

  const call = async (path: "start" | "stop") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-service/${path}`, {
        method: "POST",
        headers: token ? { "x-admin-token": token } : undefined,
      });
      const json = (await res.json()) as ServiceState & { error?: string };
      if (!res.ok) throw new Error(json.error || "Request failed");
      setState(json);
    } catch (e) {
      // keep previous state; surface error in UI
      setState((prev) => ({ ...(prev ?? { running: false, lastError: null, nextCreateAt: null }), lastError: e instanceof Error ? e.message : String(e) }));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 mb-6">
        <div className="text-sm text-gray-300 font-medium">Admin Board</div>
        <div className="text-xs text-gray-500 mt-1">
          Connect the admin wallet to view controls. Admin: <span className="text-gray-400">{ADMIN_ADDRESS}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/5 mb-6",
        variant === "hero" ? "p-6 sm:p-7" : "p-4 sm:p-5",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={[
                "text-[10px] px-2 py-0.5 rounded-full border",
                state?.running ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-300",
              ].join(" ")}
            >
              {state?.running ? "Service Running" : "Service Stopped"}
            </span>
            {variant === "compact" && createCountdown ? (
              <span className="text-xs text-gray-400">New market in {createCountdown}</span>
            ) : null}
          </div>

          {variant === "hero" ? (
            <div className="mt-3">
              <div className="text-[12px] text-gray-400">Next Market Launch</div>
              <div className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                {createCountdown ?? "—"}
              </div>
              {state?.running && closeCountdown ? (
                <div className="mt-2 text-sm text-gray-400">
                  {closeCountdown ? <span className="text-gray-200">Close in {closeCountdown}</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {state?.lastCreatedMarket ? (
            <p className="text-xs text-gray-400 mt-2">
              Last created: <span className="text-white">{state.lastCreatedMarket.coinId}</span> @{" "}
              <span className="text-gray-300">{state.lastCreatedMarket.address}</span>
            </p>
          ) : null}
          {state?.running && closeCountdown ? (
            <p className="text-xs text-gray-400 mt-2">
              Next action: {closeCountdown ? <span className="text-gray-300">close in {closeCountdown}</span> : null}
            </p>
          ) : null}
          {state?.lastError ? <p className="text-xs text-red-300 mt-2">Error: {state.lastError}</p> : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {allowToggle ? (
            <button
              onClick={() => setVariant((v) => (v === "compact" ? "hero" : "compact"))}
              className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:border-monad-purple/40"
              type="button"
            >
              {variant === "compact" ? "Big Timer" : "Compact"}
            </button>
          ) : null}
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token (optional)"
            className="h-10 w-full sm:w-64 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 outline-none focus:border-monad-purple/50"
          />
          <div className="flex gap-2">
            <button
              onClick={() => call("start")}
              disabled={loading || !!state?.running}
              className="h-10 px-4 rounded-xl bg-monad-purple text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Service
            </button>
            <button
              onClick={() => call("stop")}
              disabled={loading || !state?.running}
              className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:border-monad-purple/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-gray-400">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-gray-500">createMarket()</div>
          <div className="text-gray-300 mt-1">
            Admin • every 5m{createCountdown ? <span className="text-gray-500"> (in {createCountdown})</span> : null}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-gray-500">startRound()</div>
          <div className="text-gray-300 mt-1">Admin • immediately (auto-lock fetch)</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-gray-500">requestClosePrice()</div>
          <div className="text-gray-300 mt-1">
            Admin • +5m{closeCountdown ? <span className="text-gray-500"> (in {closeCountdown})</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
