"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ArrowLeft, ShieldAlert, ShieldCheck, Unplug, Terminal } from "lucide-react";
import { ADMIN_ADDRESS } from "@/app/config/admin";
import { MarketServiceControl } from "@/app/components/MarketServiceControl";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  
  const isAdmin = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  }, [address]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-20 selection:bg-purple-500/30">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link 
          href="/markets" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm transition-all w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Prediction Arenas
        </Link>
      </div>

      {/* Admin Title Jumbotron Panel */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#111122] to-[#06060c] p-6 mb-8 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/[0.02] to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-purple-400" />
              <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">Orchestrator Control Desk</h1>
            </div>
            <p className="text-xs text-gray-500 font-mono flex items-center gap-1.5 uppercase tracking-wide">
              Registered Node Key: <span className="text-gray-400 font-bold normal-case select-all break-all">{ADMIN_ADDRESS}</span>
            </p>
          </div>
          
          {isConnected && isAdmin && (
            <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 uppercase flex items-center gap-1.5 h-fit shadow-md self-start sm:self-center">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              Root Verified
            </span>
          )}
        </div>
      </div>

      {/* Main Execution Core Segment */}
      <div className="relative isolate">
        {!isConnected ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl p-6 bg-gradient-to-b from-black/20 to-transparent max-w-md mx-auto shadow-md">
            <Unplug className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-black text-gray-300 uppercase tracking-wider">Signature Core Detached</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Authenticate your active signature wallet layout to audit or update system parameters.
            </p>
          </div>
        ) : !isAdmin ? (
          <div className="py-14 text-center border border-rose-500/10 bg-rose-500/[0.01] rounded-2xl p-6 max-w-md mx-auto shadow-lg">
            <ShieldAlert className="h-8 w-8 text-rose-500/80 mx-auto mb-3 drop-shadow-[0_2px_10px_rgba(244,63,94,0.1)]" />
            <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">Access Breach Intercepted</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Your cryptographic address hash does not match administrative config variables. Execution denied.
            </p>
            <div className="mt-4 px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-gray-400 truncate max-w-full">
              Your Identity: {address}
            </div>
          </div>
        ) : (
          /* Authenticated Admin Management Shell View */
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 pb-4 border-b border-white/[0.04] mb-6">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">
                Active Node Environment Micro-Management
              </h2>
            </div>
            
            {/* Embedded Pipeline Component Module */}
            <MarketServiceControl defaultVariant="hero" showVariantToggle={true} />
          </div>
        )}
      </div>

    </div>
  );
}