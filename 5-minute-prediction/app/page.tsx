"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Coins,
  Shield,
  Sparkles,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16 sm:pb-24 md:pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-monad-purple/30 bg-monad-purple/10 mb-6 sm:mb-8">
            <Sparkles className="h-3 w-3 text-monad-purple" />
            <span className="text-[10px] sm:text-xs font-medium text-monad-purple uppercase tracking-wider">
              AI-Powered 5-Minute Prediction Market
            </span>
          </div>

          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_0_40px_-12px_rgba(255,255,255,0.28)]">
              <Image src="/mm-logo.svg" alt="MinuteMarkets" fill className="object-cover" priority />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight px-2">
            <span className="text-monad-purple">Minute</span>Markets
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-400 mb-3 sm:mb-4 max-w-3xl mx-auto leading-relaxed px-2">
            Predict whether an asset goes <span className="text-white font-semibold">UP</span> or{" "}
            <span className="text-white font-semibold">DOWN</span> in ultra-fast{" "}
            <span className="text-white font-semibold">5-minute rounds</span>.
          </p>
          <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            Built on Somnia with oracle settlement, automated payouts, and AI insights (sentiment, whale tracking, risk
            analysis) to help you trade smarter.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 px-2">
            <Link
              href="/markets"
              className="group flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-monad-purple text-white font-semibold text-base sm:text-lg transition-all hover:shadow-[0_0_30px_-5px_rgba(135,109,255,0.5)] hover:scale-105"
            >
              Explore Markets
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/rewards"
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold text-base sm:text-lg transition-all hover:border-monad-purple/50 hover:bg-white/10"
            >
              How Rewards Work
            </Link>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8 md:p-12 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6">
              A Faster, Smarter <span className="text-monad-purple">Prediction Market</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 leading-relaxed mb-6">
              Inspired by markets like PancakeSwap Prediction, but enhanced with AI-powered sentiment analysis, whale
              tracking, smart risk warnings, and real-time insights—optimized for 5-minute execution on Somnia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
              {[
                "5-minute rolling rounds (4m bet + 1m lock)",
                "Oracle-based settlement and freshness checks",
                "Automated reward distribution",
                "Gamified experience (XP, streaks, leaderboards)",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-white/10 bg-white/5"
                >
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-monad-purple flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-white">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            How It <span className="text-monad-purple">Works</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
            Five simple steps to predict UP or DOWN in 5-minute rounds
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
          {[
            { title: "Select a Market", body: "Choose an asset like BTC/USD, ETH/USD, SOMNIA/USD, or BNB/USD." },
            { title: "Predict UP / DOWN", body: "Pick whether the price will be higher or lower by the end of the round." },
            { title: "Place Your Bet", body: "Enter your amount during the 4-minute betting phase." },
            { title: "Lock & Settle", body: "Lock price is recorded, then the oracle fetches the close price." },
            { title: "Claim Rewards", body: "If you&apos;re correct, claim your payout automatically from the pool." },
          ].map((step, idx) => (
            <div
              key={step.title}
              className="rounded-xl border border-white/5 bg-white/5 p-4 sm:p-6 backdrop-blur-sm hover:border-monad-purple/30 transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-monad-purple flex items-center justify-center mb-3 sm:mb-4">
                <span className="text-lg sm:text-xl font-bold text-white">{idx + 1}</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Engine */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8 md:p-12 backdrop-blur-sm">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Core <span className="text-monad-purple">Prediction Engine</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-3xl mx-auto px-2">
              A fast 5-minute loop with automated settlement and payouts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: Timer, title: "5-Minute Rounds", body: "4 minutes betting + 1 minute lock, repeated continuously." },
              { icon: TrendingUp, title: "Real-Time Odds", body: "Pool-weighted odds update as bets come in." },
              { icon: Zap, title: "Automated Payouts", body: "Rewards are calculated and distributed on settlement." },
              {
                icon: Coins,
                title: "Dynamic Multipliers",
                body: "Reward multipliers adjust based on pool imbalance and participation.",
              },
              { icon: Activity, title: "Live Insights", body: "AI market summaries and risk warnings alongside each market." },
              { icon: Shield, title: "Oracle Protections", body: "Stale price checks, deviation limits, and failover support." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-monad-purple flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base text-white font-semibold mb-1">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            AI-Powered <span className="text-monad-purple">Somnia Agents</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
            Real-time AI insights to help you decide — without taking custody of your funds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              icon: Bot,
              title: "Sentiment Analysis",
              body: "Analyzes news + social sentiment and returns a Bullish/Bearish signal with confidence.",
            },
            {
              icon: Activity,
              title: "Whale Tracking",
              body: "Monitors large transfers, exchange inflows/outflows, and smart money activity.",
            },
            {
              icon: Sparkles,
              title: "Market Summary",
              body: "Generates quick market summaries so you can scan momentum at a glance.",
            },
            {
              icon: AlertTriangle,
              title: "Risk Analysis",
              body: "Flags high volatility, potential manipulation, and extreme market movements.",
            },
          ].map((agent) => (
            <div
              key={agent.title}
              className="rounded-xl border border-white/5 bg-white/5 p-6 sm:p-8 backdrop-blur-sm hover:border-monad-purple/30 transition-all"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-monad-purple flex items-center justify-center mb-3 sm:mb-4">
                <agent.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{agent.title}</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{agent.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Markets */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Supported <span className="text-monad-purple">Markets</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-2">
            Initial markets focus on high-liquidity assets for reliable 5-minute settlement.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[
            { name: "BTC/USD", icon: Coins, color: "text-orange-500" },
            { name: "ETH/USD", icon: Coins, color: "text-blue-400" },
            { name: "SOMNIA/USD", icon: Zap, color: "text-monad-purple" },
            { name: "BNB/USD", icon: Coins, color: "text-yellow-400" },
          ].map((market) => (
            <div
              key={market.name}
              className="rounded-xl border border-white/5 bg-white/5 p-4 sm:p-6 backdrop-blur-sm hover:border-monad-purple/30 transition-all text-center"
            >
              <market.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${market.color} mx-auto mb-2 sm:mb-3`} />
              <h3 className="text-xs sm:text-sm text-white font-semibold">{market.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8 md:p-12 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-6 text-center">
              Future <span className="text-monad-purple">Roadmap</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                "Leaderboards + streak rewards",
                "Advanced analytics and insights",
                "Social prediction rooms + referrals",
                "Cross-chain markets + prediction NFTs",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border border-white/10 bg-white/5"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-monad-purple flex-shrink-0" />
                  <span className="text-sm sm:text-base text-white">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mb-16 sm:mb-24 md:mb-32">
        <div className="rounded-xl sm:rounded-2xl border border-white/5 bg-white/5 p-6 sm:p-8 md:p-12 text-center backdrop-blur-sm">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
            Ready to <span className="text-monad-purple">Predict?</span>
          </h2>
          <p className="text-gray-400 mb-8 text-lg max-w-2xl mx-auto">
            Join 5-minute rounds, use AI insights, and claim rewards automatically when you&apos;re right.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/binary-markets"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-monad-purple text-white font-semibold text-base sm:text-lg transition-all hover:shadow-[0_0_30px_-5px_rgba(135,109,255,0.5)] hover:scale-105"
            >
              Explore Markets
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link
              href="/rewards"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold text-base sm:text-lg transition-all hover:border-monad-purple/50 hover:bg-white/10"
            >
              View Rewards
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
