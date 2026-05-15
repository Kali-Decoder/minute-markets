"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount } from "wagmi";
import { ADMIN_ADDRESS } from "@/app/config/admin";

const BACKEND_API_BASE = "https://minute-markets.onrender.com/api/market-service";

type ServiceState = {
  running: boolean;
  lastError: string | null;
  nextCreateAt: number | null;
  nextLockAt: number | null; // ✅ Restored to map with payload
  nextCloseAt: number | null;
  lastCreatedMarket?: { address: Address; coinId: string; createdAt: number; txHash: Hash };
  lastActions?: {
    startedAt?: number | null;
    lockRequestedAt?: number | null;
    closeRequestedAt?: number | null;
    startTxHash?: Hash | null;
    lockTxHash?: Hash | null;
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

  // ✅ Computed logic updates automatically based on which phase is active
  const nextActionLabel = useMemo(() => {
    if (!state?.running) return null;
    
    if (state.nextLockAt) {
      return { label: "Lock Price", time: formatCountdown(state.nextLockAt - now) };
    }
    if (state.nextCloseAt) {
      return { label: "Settle Round", time: formatCountdown(state.nextCloseAt - now) };
    }
    return null;
  }, [state?.nextLockAt, state?.nextCloseAt, state?.running, now]);

  const refresh = async () => {
    try {
      const res = await fetch(`${BACKEND_API_BASE}/status`, { cache: "no-store" });
      if (!res.ok) throw new Error("Status polling failed");
      const json = (await res.json()) as ServiceState;
      setState(json);
    } catch (err) {
      console.error("Error polling keeper bot state:", err);
    }
  };

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 3_000);
    return () => clearInterval(interval);
  }, []);

  const call = async (path: "start" | "stop") => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["x-admin-token"] = token;
      }

      const res = await fetch(`${BACKEND_API_BASE}/${path}`, {
        method: "POST",
        headers: headers,
      });
      
      const json = (await res.json()) as ServiceState & { error?: string };
      if (!res.ok) throw new Error(json.error || "Request execution rejected");
      setState(json);
    } catch (e) {
      setState((prev) => ({ 
        ...(prev ?? { running: false, lastError: null, nextCreateAt: null, nextLockAt: null, nextCloseAt: null }), 
        lastError: e instanceof Error ? e.message : String(e) 
      }));
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
    <div className={["rounded-2xl border border-white/10 bg-white/5 mb-6", variant === "hero" ? "p-6 sm:p-7" : "p-4 sm:p-5"].join(" ")}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={["text-[10px] px-2 py-0.5 rounded-full border", state?.running ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-300"].join(" ")}>
              {state?.running ? "Service Running" : "Service Stopped"}
            </span>
            {variant === "compact" && createCountdown ? (
              <span className="text-xs text-gray-400">Cycle loop: {createCountdown}</span>
            ) : null}
          </div>

          {variant === "hero" ? (
            <div className="mt-3">
              <div className="text-[12px] text-gray-400">Next Master Block Cycle</div>
              <div className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                {createCountdown ?? "—"}
              </div>
              {nextActionLabel ? (
                <div className="mt-2 text-sm text-gray-400">
                  ⚠️ Next: <span className="text-purple-400 font-medium">{nextActionLabel.label}</span> in <span className="text-gray-200">{nextActionLabel.time}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {state?.lastCreatedMarket ? (
            <p className="text-xs text-gray-400 mt-2">
              Last created: <span className="text-white font-semibold">{state.lastCreatedMarket.coinId.toUpperCase()}</span> @{" "}
              <a 
                href={`https://explorer.somnia.network/address/${state.lastCreatedMarket.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-gray-300 font-mono underline hover:text-purple-400 break-all select-all"
              >
                {state.lastCreatedMarket.address}
              </a>
            </p>
          ) : null}
          
          {variant === "compact" && nextActionLabel ? (
            <p className="text-xs text-gray-400 mt-1">
              Next Stage: <span className="text-gray-200">{nextActionLabel.label} ({nextActionLabel.time})</span>
            </p>
          ) : null}

          {state?.lastError ? <p className="text-xs text-red-400 mt-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">⚠️ Error: {state.lastError}</p> : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {allowToggle ? (
            <button
              onClick={() => setVariant((v) => (v === "compact" ? "hero" : "compact"))}
              className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition"
              type="button"
            >
              {variant === "compact" ? "Big Timer" : "Compact"}
            </button>
          ) : null}
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token password"
            className="h-10 w-full sm:w-64 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 outline-none focus:border-white/30"
          />
          <div className="flex gap-2">
            <button
              onClick={() => call("start")}
              disabled={loading || !!state?.running}
              className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Start Service
            </button>
            <button
              onClick={() => call("stop")}
              disabled={loading || !state?.running}
              className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Tracking Ledger Grid */}
      <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[11px]">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-gray-500 font-medium">1. Market Creation (Tx)</div>
          <div className="text-gray-300 font-mono mt-1 truncate">
            {state?.lastCreatedMarket?.txHash ? (
              <span className="text-green-400">{state.lastCreatedMarket.txHash}</span>
            ) : "Waiting loop..."}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-gray-500 font-medium">2. startRound() (Tx)</div>
          <div className="text-gray-300 font-mono mt-1 truncate">
            {state?.lastActions?.startTxHash ? (
              <span className="text-purple-400">{state.lastActions.startTxHash}</span>
            ) : "Pending start..."}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-gray-500 font-medium">3. requestLockPrice() (Tx)</div>
          <div className="text-gray-300 font-mono mt-1 truncate">
            {state?.lastActions?.lockTxHash ? (
              <span className="text-blue-400">{state.lastActions.lockTxHash}</span>
            ) : state?.nextLockAt ? `Executing in ${formatCountdown(state.nextLockAt - now)}` : "Idle"}
          </div>
        </div>
      </div>
    </div>
  );
}