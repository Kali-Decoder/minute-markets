"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { 
  ArrowLeft, 
  User, 
  Wallet, 
  Zap, 
  CheckCircle2, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Share2, 
  Lock, 
  Globe, 
  Copy, 
  Check,
  History,
  Clock
} from "lucide-react";
import { formatEther } from "viem";

// Dummy type definitions mirroring your schema style
type UserProfileData = {
  username: string;
  address: string;
  joinedDate: string;
  prophecyPoints: number;
  multiplier: number;
  streak: number;
  resolvedCount: number;
  edgeMarketsNeeded: number;
};

type ActivePosition = {
  id: string;
  marketName: string;
  prediction: "UP" | "DOWN";
  allocation: string;
  entryPrice: string;
  currentPrice: string;
  pnlPercentage: number;
  pnlValue: string;
};

export default function UserProfilePage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [isPublicProfile, setIsPublicProfile] = useState(true);

  // Mock profile data styled around your system parameters
  const profile = useMemo<UserProfileData>(() => ({
    username: "Nikku_Dev",
    address: connectedAddress ?? "0x4083a2B9d38c6439393354E5be4eC84C6bF109c1",
    joinedDate: "Joined May 2026",
    prophecyPoints: 52,
    multiplier: 1.00,
    streak: 0,
    resolvedCount: 0,
    edgeMarketsNeeded: 10,
  }), [connectedAddress]);

  // Live matching arrays corresponding to your prediction structures
  const activePositions = useMemo<ActivePosition[]>(() => [
    {
      id: "0x1",
      marketName: "Will the Coingecko price of Solana (SOL) gain 10% before expiration close?",
      prediction: "UP",
      allocation: "50.00 STT",
      entryPrice: "$142.50",
      currentPrice: "$149.62",
      pnlPercentage: 5.0,
      pnlValue: "+2.50 STT",
    }
  ], []);

  const positionHistory = useMemo(() => [
    {
      id: "h1",
      marketName: "Will the NFT collections Quills and/or Somzies be used for a Boost in Season 6?",
      prediction: "DOWN",
      status: "OPEN",
      cost: "10 STT",
      date: "19/05/2026",
      won: null,
    },
    {
      id: "h2",
      marketName: "Will Ethereum gas metrics spike past 45 Gwei during the next master block validation loop?",
      prediction: "UP",
      status: "RESOLVED",
      cost: "50 STT",
      date: "06/05/2026",
      won: true,
    },
    {
      id: "h3",
      marketName: "Will a new L1 series be #1 on the Global Network active throughput checklist charts?",
      prediction: "UP",
      status: "RESOLVED",
      cost: "50 STT",
      date: "06/05/2026",
      won: false,
    },
  ], []);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(profile.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20 selection:bg-purple-500/30">
      
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

      {/* Main Account Info Banner Sheet */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0f0f1d] to-[#06060c] p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/[0.01] to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            {/* Identity Avatar Vector Frame */}
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-500 to-purple-700 p-0.5 shadow-lg flex-none relative">
              <div className="h-full w-full bg-[#07070d] rounded-[14px] flex items-center justify-center">
                <User className="h-7 w-7 text-gray-300" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-purple-600 rounded-lg border border-[#0f0f1d] flex items-center justify-center text-[10px] text-white font-mono font-bold">
                {"{M}"}
              </div>
            </div>

            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {profile.username}
              </h1>
              
              {/* Crypto Identity Hash Link Button */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button 
                  onClick={handleCopyAddress}
                  className="font-mono text-gray-500 hover:text-gray-300 transition-colors bg-black/30 px-2.5 py-1 rounded-lg border border-white/[0.03] flex items-center gap-1.5"
                  title="Copy address hash"
                >
                  <Wallet className="h-3 w-3 text-purple-400" />
                  <span>{`${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`}</span>
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
                <span className="text-gray-600 font-medium font-mono">{profile.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Profile Visibility Controls / Actions Block */}
          <div className="flex items-center gap-2.5 self-start md:self-center w-full md:w-auto justify-between md:justify-end border-t border-white/[0.03] pt-4 md:pt-0 md:border-none">
            <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-white/5 h-10">
              <button
                onClick={() => setIsPublicProfile(!isPublicProfile)}
                className={`px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  isPublicProfile 
                    ? "bg-purple-600/15 border border-purple-500/30 text-purple-300" 
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Public Profile</span>
              </button>
            </div>

            <button className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-xs font-black tracking-wider uppercase hover:text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 shadow-sm">
              <Share2 className="h-3.5 w-3.5" />
              <span>Share Profile Layout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Profile Performance Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Your Edge Progress Tracker */}
        <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-purple-400" /> Your Trading Edge
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-3 overflow-hidden shadow-inner relative">
              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 w-0" />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-amber-400 mt-4 font-mono">
            {profile.edgeMarketsNeeded} more resolved arenas to unlock edge analysis
          </p>
        </div>

        {/* Markets Resolved Stat Item */}
        <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent p-4 shadow-sm">
          <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" /> Arenas Resolved
          </div>
          <div className="text-3xl font-black text-white tracking-tight font-mono mt-1.5">{profile.resolvedCount}</div>
          <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wide">Trade & settle a market arena to accumulate values</p>
        </div>

        {/* Win Streak Stat Item */}
        <div className="rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent p-4 shadow-sm">
          <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-purple-400" /> Active Win Streak
          </div>
          <div className="text-3xl font-black text-white tracking-tight font-mono mt-1.5">{profile.streak}</div>
          <p className="text-[10px] text-gray-500 font-medium mt-1 uppercase tracking-wide">Consecutive accurate prediction wins in a row</p>
        </div>

        {/* Prophecy Points Core Stat Item */}
        <div className="rounded-xl border border-purple-500/10 bg-gradient-to-b from-purple-500/[0.05] to-transparent p-4 shadow-sm relative group">
          <div className="text-[9px] uppercase font-black text-purple-400 tracking-widest flex items-center gap-1">
            PROPHACY WEIGHT POINTS
          </div>
          <div className="text-4xl font-black tracking-tight text-white mt-1 tabular-nums bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {profile.prophecyPoints}
          </div>
          <div className="mt-2 text-[10px] font-mono font-bold text-gray-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit">
            💥 {profile.multiplier.toFixed(2)}x Multiplier Pool Allocation
          </div>
        </div>

      </div>

      {/* Account Activity Split Segments */}
      <div className="space-y-8">
        
        {/* 1. Live Positions Module Section */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
            <Clock className="h-4 w-4 text-purple-400" />
            <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Active Open Positions</h2>
            <span className="text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 rounded text-purple-300">
              {activePositions.length} Open
            </span>
          </div>

          <div className="space-y-2.5">
            {activePositions.map((pos) => (
              <div 
                key={pos.id}
                className="rounded-xl border border-white/5 bg-gradient-to-b from-[#0a0a14] to-transparent p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-white/10 shadow-sm relative group"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-white font-extrabold text-sm tracking-tight pr-4">
                    {pos.marketName}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span className={`px-2 py-0.5 rounded font-black tracking-widest border ${
                      pos.prediction === "UP" 
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                        : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                    }`}>
                      ▲ {pos.prediction} POSITION
                    </span>
                    <span>•</span>
                    <span>Cost: <span className="text-gray-300 font-mono">{pos.allocation}</span></span>
                    <span>•</span>
                    <span>Entry Pool Strike: <span className="text-gray-300 font-mono">{pos.entryPrice}</span></span>
                  </div>
                </div>

                {/* Right Metrics Profit/Loss Indicator Bar */}
                <div className="flex items-center gap-4 bg-black/20 p-2.5 rounded-xl border border-white/[0.03] self-start md:self-center h-fit flex-none w-full md:w-auto justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Oracle Value Drift</div>
                    <div className="text-xs font-mono font-bold text-gray-300 mt-0.5">{pos.currentPrice}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Unrealized Delta Yield</div>
                    <div className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{pos.pnlValue} ({pos.pnlPercentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* 2. Position History Module Section */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.04]">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Historical Archive Logs</h2>
          </div>

          <div className="rounded-xl border border-white/5 bg-gradient-to-b from-[#07070c] to-transparent p-1 shadow-inner overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.04] text-[9px] font-black uppercase tracking-widest text-gray-500 bg-white/[0.01]">
                    <th className="py-3 px-4">Arena Context Parameter Target</th>
                    <th className="py-3 px-4">Predicted Allocation</th>
                    <th className="py-3 px-4">Allocated Stake</th>
                    <th className="py-3 px-4">Settle Timestamp</th>
                    <th className="py-3 px-4 text-right">Operational Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] text-xs font-medium text-gray-300">
                  {positionHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-3.5 px-4 max-w-sm sm:max-w-md md:max-w-xl truncate font-semibold text-white/90">
                        {history.marketName}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`inline-flex items-center gap-1 ${history.prediction === "UP" ? "text-emerald-400" : "text-rose-400"}`}>
                          {history.prediction === "UP" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {history.prediction}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-400">{history.cost}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-500">{history.date}</td>
                      <td className="py-3.5 px-4 text-right">
                        {history.status === "OPEN" ? (
                          <span className="text-[10px] font-black bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded px-2 py-0.5 tracking-wider uppercase">
                            Active Open
                          </span>
                        ) : history.won ? (
                          <span className="text-[10px] font-black bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded px-2 py-0.5 tracking-wider uppercase">
                            Payout Settle
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-white/5 border border-white/10 text-gray-500 rounded px-2 py-0.5 tracking-wider uppercase">
                            Zero Settle
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

/* ==================== REUSABLE DASHBOARD CORE SUB-COMPONENTS ==================== */

function PositionStatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
      <p className="text-xs font-black mt-0.5 truncate text-gray-300">
        {value}
      </p>
    </div>
  );
}