"use client";

import Link from "next/link";
import { ArrowLeft, Award, TrendingUp, TrendingDown } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 sm:mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm sm:text-base">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-monad-purple flex items-center justify-center flex-shrink-0">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Rewards & Settlement <span className="text-monad-purple">Rules</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                How 5-minute UP/DOWN rounds settle and how payouts are calculated
              </p>
            </div>
          </div>
        </div>

        {/* Key Information */}
        <div className="mb-8 sm:mb-12 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Key Factors</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-monad-purple mt-1 flex-shrink-0">•</span>
                  <span>Rounds run every 5 minutes (4m bet + 1m lock)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-monad-purple mt-1 flex-shrink-0">•</span>
                  <span>Oracle records a lock price, then a close price for settlement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-monad-purple mt-1 flex-shrink-0">•</span>
                  <span>Winning side shares the pool (minus platform fee)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-monad-purple mt-1 flex-shrink-0">•</span>
                  <span>Betting is disabled during the lock phase</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-monad-purple mt-1 flex-shrink-0">•</span>
                  <span>Equal prices at settlement → House wins (round ends without winners)</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Formulas</h3>
              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <div className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-black/20">
                  <div className="text-gray-400 mb-1 text-[11px] sm:text-xs">Winning Rule</div>
                  <div className="text-white font-mono text-[11px] sm:text-xs md:text-sm break-all">
                    Close &gt; Lock → UP wins; Close &lt; Lock → DOWN wins; Close = Lock → House wins
                  </div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-black/20">
                  <div className="text-gray-400 mb-1 text-[11px] sm:text-xs">Fee</div>
                  <div className="text-white font-mono text-[11px] sm:text-xs md:text-sm">Fee = Pool × PlatformFee%</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg border border-white/10 bg-black/20">
                  <div className="text-gray-400 mb-1 text-[11px] sm:text-xs">Payout (Winner i)</div>
                  <div className="text-white font-mono text-[11px] sm:text-xs md:text-sm break-all">
                    Payout(i) = (Bet(i) / TotalWinningBets) × (Pool − Fee)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 sm:mt-12 rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Settlement Walkthrough</h3>
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm md:text-base text-gray-300">
            <p>
              Each round has a <span className="text-white font-semibold">betting phase</span> and a{" "}
              <span className="text-white font-semibold">lock phase</span>. During lock, new bets are disabled and the{" "}
              <span className="text-white font-semibold">lock price</span> is recorded.
            </p>
            <p>
              When the round ends, the oracle fetches the <span className="text-white font-semibold">close price</span>.
              If the close price is higher, <span className="inline-flex items-center gap-1 text-white font-semibold"><TrendingUp className="h-4 w-4 text-green-400" />UP</span>{" "}
              wins; if it&apos;s lower,{" "}
              <span className="inline-flex items-center gap-1 text-white font-semibold"><TrendingDown className="h-4 w-4 text-red-400" />DOWN</span>{" "}
              wins.
            </p>
            <p className="text-xs sm:text-sm text-gray-400">
              If close equals lock, the round is a tie and <span className="text-white font-semibold">House wins</span>{" "}
              (no winners). Exact tie behavior can differ by market configuration.
            </p>
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-white font-semibold mb-2">Example</h4>
              <p className="text-gray-300">
                Pool = 1,000 USDC, Platform fee = 3% → Fee = 30 USDC → Distributable = 970 USDC. If UP wins and total UP
                bets = 400 USDC, a user who bet 50 USDC on UP receives: (50 / 400) × 970 = 121.25 USDC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
