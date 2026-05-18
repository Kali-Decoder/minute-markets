"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount } from "wagmi";
import { Play, Square, Eye, EyeOff, KeyRound, ExternalLink, ShieldAlert, Cpu, Network } from "lucide-react";
import { ADMIN_ADDRESS } from "@/app/config/admin";

const BACKEND_API_BASE = "https://minute-markets.onrender.com/api/market-service";

type ServiceState = {
  running: boolean;
  lastError: string | null;
  nextCreateAt: number | null;
  nextLockAt: number | null;
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
}) {
  const { address } = useAccount();
  const isAdmin = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  }, [address]);
  
  const [variant, setVariant] = useState<"compact" | "hero">(defaultVariant);
  const [state, setState] = useState<ServiceState | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  
  // FIXED: Restored variable pointer reference mapping from props assignment
  const allowToggle = showVariantToggle;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const createCountdown = useMemo(() => {
    if (!state?.nextCreateAt) return null;
    return formatCountdown(state.nextCreateAt - now);
  }, [state?.nextCreateAt, now]);

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
    const interval = setInterval(() => void refresh(), 3000);
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
      <div className="rounded-xl border border-rose-500/10 bg-rose-500/[0.01] p-5 text-center shadow-lg max-w-md mx-auto">
        <ShieldAlert className="h-6 w-6 text-rose-400 mx-auto mb-2" />
        <div className="text-xs font-black text-rose-400 uppercase tracking-wider">Access Node Restricted</div>
        <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
          Connect your authenticated administrator wallet profile to audit automated cycle scripts. Configured Root:
          <span className="block mt-2 font-mono font-bold text-gray-400 bg-black/30 py-1 px-2 rounded border border-white/5 break-all select-all">{ADMIN_ADDRESS}</span>
        </div>
      </div>
    );
  }

  const isLive = state?.running;

  return (
    <div className={`rounded-xl border border-white/5 bg-gradient-to-b from-black/40 to-black/10 transition-all duration-300 relative ${variant === "hero" ? "p-6" : "p-4"}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left Side Status Information Cluster */}
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded border uppercase flex items-center gap-1.5 shadow-sm ${
              isLive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-gray-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              {isLive ? "Node Operational" : "Node Suspended"}
            </span>
            
            {variant === "compact" && createCountdown && (
              <span className="text-[11px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">
                Pipeline Loop: <span className="text-white font-bold">{createCountdown}</span>
              </span>
            )}
          </div>

          {/* Expanded Hero Timer Block */}
          {variant === "hero" && (
            <div className="mt-4 bg-black/20 p-4 rounded-xl border border-white/[0.02] relative overflow-hidden group">
              <div className="absolute top-2 right-2 text-white/[0.01] group-hover:text-white/[0.03] transition-colors pointer-events-none">
                <Cpu className="h-20 w-20" />
              </div>
              <div className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Next Master Pipeline Generation In</div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tabular-nums mt-0.5">
                {createCountdown ?? "—"}
              </div>
              {nextActionLabel && (
                <div className="mt-2.5 text-xs text-gray-400 flex items-center gap-1.5 bg-purple-500/5 border border-purple-500/10 py-1 px-2.5 rounded-lg w-fit">
                  <span className="h-1 w-1 rounded-full bg-purple-400 animate-pulse" />
                  Next Intercept Phase: <span className="text-purple-400 font-black uppercase tracking-wide">{nextActionLabel.label}</span> in <span className="text-gray-200 font-mono font-bold">{nextActionLabel.time}</span>
                </div>
              )}
            </div>
          )}

          {/* Last Deployed Arena Metadata Track */}
          {state?.lastCreatedMarket && (
            <div className="text-xs text-gray-400 bg-white/[0.01] border border-white/5 rounded-xl p-2.5 flex items-center gap-2.5 flex-wrap w-fit max-w-full shadow-inner">
              <div className="flex items-center gap-1.5 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <Network className="h-3.5 w-3.5 text-purple-400" /> Active Arena:
              </div>
              <span className="text-white font-black uppercase bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 rounded text-[10px]">{state.lastCreatedMarket.coinId}</span>
              <a 
                href={`https://explorer.somnia.network/address/${state.lastCreatedMarket.address}`}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 font-mono text-[11px] hover:text-purple-400 break-all select-all flex items-center gap-1 underline decoration-white/10 hover:decoration-purple-500/40"
              >
                {state.lastCreatedMarket.address}
                <ExternalLink className="h-3 w-3 flex-none" />
              </a>
            </div>
          )}
          
          {variant === "compact" && nextActionLabel && (
            <p className="text-[11px] text-gray-400 bg-white/[0.01] border border-white/5 py-1 px-2.5 rounded-lg w-fit">
              Next Step Interrupt: <span className="text-gray-200 font-bold">{nextActionLabel.label} ({nextActionLabel.time})</span>
            </p>
          )}

          {state?.lastError && (
            <p className="text-xs font-semibold text-rose-400 mt-2 bg-rose-500/5 border border-rose-500/10 px-3 py-2 rounded-xl flex items-center gap-2">
              ⚠️ Script Warning Exception: {state.lastError}
            </p>
          )}
        </div>

        {/* Right Side Control Interface Panel */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-none w-full lg:w-auto">
          {/* Toggle View Layout Dimensions Trigger Button */}
          {allowToggle && (
            <button
              onClick={() => setVariant((v) => (v === "compact" ? "hero" : "compact"))}
              className="h-10 px-3.5 rounded-xl border border-white/10 bg-white/5 text-gray-200 text-xs font-black tracking-wider uppercase hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
              type="button"
            >
              {variant === "compact" ? <Eye className="h-3.5 w-3.5 text-purple-400" /> : <EyeOff className="h-3.5 w-3.5 text-purple-400" />}
              <span>{variant === "compact" ? "Expand Focus" : "Compact"}</span>
            </button>
          )}

          {/* Secure Administrative Access Token Field */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Admin script pass token"
              className="h-10 w-full sm:w-56 rounded-xl border border-white/5 bg-black/40 pl-8.5 pr-3 text-xs text-white font-medium outline-none focus:border-white/20 focus:ring-1 focus:ring-white/5 transition-all placeholder:text-gray-600 shadow-inner"
            />
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
          </div>

          {/* Bot State Script Triggers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => call("start")}
              disabled={loading || !!state?.running}
              className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black tracking-wider uppercase text-xs shadow-md shadow-purple-600/5 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed disabled:active:scale-100 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Pipeline
            </button>
            <button
              onClick={() => call("stop")}
              disabled={loading || !state?.running}
              className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white font-black tracking-wider uppercase text-xs hover:bg-white/10 hover:border-white/20 active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed disabled:active:scale-100 transition-all flex items-center justify-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Halt
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Tracking Ledger Transaction Block Strip Grid */}
      <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[10px] font-bold uppercase tracking-wider">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 shadow-inner">
          <div className="text-gray-500 font-bold">1. Arena Target Deploy Hash</div>
          <div className="text-gray-400 font-mono mt-1 truncate lowercase normal-case text-[11px] font-medium">
            {state?.lastCreatedMarket?.txHash ? (
              <span className="text-emerald-400 font-bold select-all">{state.lastCreatedMarket.txHash}</span>
            ) : "Listening pipeline cycle..."}
          </div>
        </div>
        
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 shadow-inner">
          <div className="text-gray-500 font-bold">2. startRound() Call Broadcast</div>
          <div className="text-gray-400 font-mono mt-1 truncate lowercase normal-case text-[11px] font-medium">
            {state?.lastActions?.startTxHash ? (
              <span className="text-purple-400 font-bold select-all">{state.lastActions.startTxHash}</span>
            ) : "Awaiting deployment index trigger..."}
          </div>
        </div>
        
        <div className="rounded-xl border border-white/5 bg-black/20 p-3 shadow-inner">
          <div className="text-gray-500 font-bold">3. requestLockPrice() Oracle Sync</div>
          <div className="text-gray-400 font-mono mt-1 truncate lowercase normal-case text-[11px] font-medium flex items-center">
            {state?.lastActions?.lockTxHash ? (
              <span className="text-blue-400 font-bold select-all">{state.lastActions.lockTxHash}</span>
            ) : state?.nextLockAt ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                Auto dispatch in {formatCountdown(state.nextLockAt - now)}
              </span>
            ) : (
              "Idle Standby"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}