"use client";

import Link from "next/link";
import { ArrowLeft, Award, TrendingUp, TrendingDown, ShieldAlert, Scale, Percent, Landmark, HelpCircle } from "lucide-react";
import { RewardsMechanicsGraph } from "@/app/components/RewardsMechanicsGraph";

export default function RewardsPage() {
  return (
    <div className="min-h-screen py-8 sm:py-12 selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Top Breadcrumb Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm transition-all w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Header Jumbotron Section */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0f0f1d] to-[#06060c] p-6 mb-8 shadow-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial-gradient from-purple-500/[0.01] to-transparent pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 inline-flex items-center justify-center shadow-inner flex-shrink-0">
              <Award className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Rewards & Settlement <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">Engine Rules</span>
              </h1>
              <p className="text-gray-400 mt-1 text-xs sm:text-sm font-medium uppercase tracking-wide">
                Protocol execution specs for 5-minute oracle checkout settlement pipelines
              </p>
            </div>
          </div>
        </div>

        {/* Master Execution Parameters & Mathematical Equations Core */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Key Operation Protocols */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04] mb-4">
                <Scale className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Protocol Parameters</h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-gray-400 font-medium">
                <li className="flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span>Continuous system cycle loops run strictly on <span className="text-white font-bold">5-minute timelines</span> (4-minute placement window followed by a 1-minute lock constraint stage).</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span>Oracle infrastructure records an immutable <span className="text-purple-400 font-bold font-mono">LockPrice</span>, validating it later against an automated epoch checkout <span className="text-purple-400 font-bold font-mono">ClosePrice</span> checkpoint.</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span>Winning address positions claim proportional weights of the entire consolidated pool (net of protocol infrastructure fees).</span>
                </li>
                <li className="flex items-start gap-2.5 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                  <span>Capital placements are strictly rejected by raw transaction assertion criteria once the timeline transitions into its active lock phase.</span>
                </li>
              </ul>
            </div>

            {/* Warning Alert Banner Embedded */}
            <div className="mt-4 flex items-center gap-3 border border-amber-500/10 bg-amber-500/[0.02] p-3 rounded-xl">
              <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                <span className="text-amber-400 font-black uppercase tracking-wide">Dead-Heat Rule:</span> If {`$\\text{ClosePrice} = \text{LockPrice}$`}, the round resolves as a tie. No platform winning payouts are distributed; positions settle to the house treasury wallet depending on node configuration parameters.
              </p>
            </div>
          </div>

          {/* Core Mathematical Foundations */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.04] mb-4">
              <Percent className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Protocol Mathematics</h3>
            </div>
            
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 shadow-inner">
                <div className="text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2">Directional Settle Condition</div>
                <div className="text-xs font-mono bg-black/20 p-2.5 rounded border border-white/[0.02] text-gray-300 leading-relaxed">
                  {/* FIXED: Wrapped directly inside safe string variables to prevent JSX tag confusion */}
                  {`$$\\begin{cases} \\text{Close} > \\text{Lock} \\implies \\text{UP Wins} \\\\ \\text{Close} < \\text{Lock} \\implies \\text{DOWN Wins} \\\\ \\text{Close} = \\text{Lock} \\implies \\text{House Settle} \\end{cases}$$`}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 shadow-inner">
                <div className="text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2">Protocol Fee Deduction</div>
                <div className="text-xs font-mono bg-black/20 p-2.5 rounded border border-white/[0.02] text-gray-300">
                  {`$$\\text{Fee} = \\text{Pool}_{\\text{Total}} \\times \\text{PlatformFee}\\%$$`}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/5 bg-black/40 shadow-inner">
                <div className="text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2">Winner Yield Attribution Formula</div>
                <div className="text-xs font-mono bg-black/20 p-2.5 rounded border border-white/[0.02] text-gray-300">
                  {`$$\\text{Payout}_{i} = \\frac{\\text{Bet}_{i}}{\\text{TotalWinningBets}} \\times (\\text{Pool}_{\\text{Total}} - \\text{Fee})$$`}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Recharts Mechanical Representation Wave Chart */}
        <div className="rounded-2xl border border-white/5 bg-[#0b0b14] p-4 sm:p-6 mb-8 shadow-md">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 pb-2 border-b border-white/[0.03]">
            <HelpCircle className="h-4 w-4 text-purple-400" /> Operational Phase Progression Vector
          </div>
          <RewardsMechanicsGraph />
        </div>

        {/* Walkthrough Progression Track & Code Spec Walkthrough */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 md:p-8 shadow-md">
          <div className="flex items-center gap-2 pb-3.5 border-b border-white/[0.04] mb-5">
            <Landmark className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Settlement Lifecycle Breakdown</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-white/5 bg-black/40 shadow-inner">
              <div className="text-purple-400 font-black text-xs uppercase tracking-wider mb-1">Phase 1: Open</div>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Deposits accepted transparently across call (UP) and put (DOWN) index pools. Odds adapt dynamically in real-time.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-black/40 shadow-inner">
              <div className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">Phase 2: Lock</div>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                New address positions are closed out. Oracle aggregates external data feeds to assert the baseline <span className="text-gray-300 font-bold font-mono">LockPrice</span>.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-black/40 shadow-inner">
              <div className="text-emerald-400 font-black text-xs uppercase tracking-wider mb-1">Phase 3: Settle</div>
              <p className="text-xs text-gray-400 font-medium leading-relaxed">
                Oracle fetches final price index. If the close values are higher, <span className="inline-flex items-center gap-0.5 text-emerald-400 font-black"><TrendingUp className="h-3 w-3" />UP</span> claims the allocation; otherwise <span className="inline-flex items-center gap-0.5 text-rose-400 font-black"><TrendingDown className="h-3 w-3" />DOWN</span> claims.
              </p>
            </div>
          </div>

          {/* Concrete Computational Arithmetic Sample Block Card */}
          <div className="pt-5 border-t border-white/[0.04] bg-white/[0.01] p-4 rounded-xl border border-white/5">
            <h4 className="text-white font-black uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Arithmetic Pipeline Scenario Example
            </h4>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              Suppose {`$\\text{Pool}_{\\text{Total}} = 1,000\\text{ USDC}$`} and the protocol is initialized to deduct a {`$\\text{PlatformFee} = 3\\%$`}. 
              This isolates {`$\\text{Fee} = 30\\text{ USDC}$`}, leaving a net distributable liquidity pool of {`$970\\text{ USDC}$`}. If the epoch checklist determines a higher oracle close value, the UP side claims settlement. 
              If the aggregated sum of all winning positions equals {`$400\\text{ USDC}$`}, a target wallet address that allocated a position of {`$50\text{ USDC}$`} onto UP will extract a net redemption receipt matching:
            </p>
            <div className="mt-3 bg-black/30 border border-white/5 rounded-xl p-3 text-center text-xs font-mono font-bold text-white tracking-tight">
              {/* FIXED: Safely wrapped example formula string */}
              {`$$\\text{Receipt Redemption} = \\frac{50}{400} \\times 970 = 121.25\\text{ USDC}$$`}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}