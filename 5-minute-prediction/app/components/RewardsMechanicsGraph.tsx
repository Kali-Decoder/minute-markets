"use client";

import { ExternalLink, Sparkles, Database, Bot, Filter, Trophy } from "lucide-react";

type Step = {
  id: number;
  title: string;
  subtitle: string;
};

const STEPS: Step[] = [
  { id: 1, title: "Market", subtitle: "Round question and asset" },
  { id: 2, title: "Sources", subtitle: "Independent price feeds" },
  { id: 3, title: "Oracle", subtitle: "Fetch lock and close prices" },
  { id: 4, title: "Condition", subtitle: "UP/DOWN outcome decided" },
  { id: 5, title: "Rewards", subtitle: "Pool distributed to winners" },
];

function Panel({
  tone,
  label,
  title,
  right,
  children,
}: {
  tone: "teal" | "blue" | "purple" | "orange" | "gold";
  label: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "teal"
      ? "border-teal-400/20 bg-teal-500/5"
      : tone === "blue"
        ? "border-blue-400/20 bg-blue-500/5"
        : tone === "purple"
          ? "border-purple-400/20 bg-purple-500/5"
          : tone === "orange"
            ? "border-orange-400/20 bg-orange-500/5"
            : "border-amber-400/20 bg-amber-500/5";

  const labelClasses =
    tone === "teal"
      ? "text-teal-300"
      : tone === "blue"
        ? "text-blue-300"
        : tone === "purple"
          ? "text-purple-300"
          : tone === "orange"
            ? "text-orange-300"
            : "text-amber-300";

  return (
    <div className={["rounded-2xl border shadow-[0_0_80px_-40px_rgba(135,109,255,0.35)]", toneClasses].join(" ")}>
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className={["text-xs font-semibold tracking-widest uppercase", labelClasses].join(" ")}>{label}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-400">{title}</span>
        </div>
        {right ? <div className="flex items-center gap-2 text-xs text-gray-400">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function MiniCard({
  tone,
  label,
  href,
  lines,
  index,
}: {
  tone: "blue" | "purple";
  label: string;
  href: string;
  lines: string[];
  index: string;
}) {
  const toneBar = tone === "blue" ? "bg-blue-500/30" : "bg-purple-500/30";
  const labelColor = tone === "blue" ? "text-blue-300" : "text-purple-300";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className={["h-1 w-full", toneBar].join(" ")} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className={["h-4 w-4", labelColor].join(" ")} />
            <div className={["text-xs font-semibold tracking-widest uppercase", labelColor].join(" ")}>{label}</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="tabular-nums">{index}</span>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              aria-label={`Open source ${label}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          {lines.map((line) => (
            <div key={line} className="font-mono text-[12px] text-gray-200 truncate">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ side }: { side: "left" | "right" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-monad-purple" />
            <div className="text-xs font-semibold tracking-widest uppercase text-monad-purple">Somnia Oracle</div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300">
            {side === "left" ? "LOCK" : "CLOSE"}
          </span>
        </div>
        <div className="mt-3 text-[11px] text-gray-400 tracking-widest uppercase">Function</div>
        <div className="mt-1 font-mono text-[12px] text-gray-200">
          {side === "left" ? "requestLockPrice()" : "requestClosePrice()"}
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
          <div className="text-[11px] text-gray-500 tracking-widest uppercase">{">> Output"}</div>
          <div className="mt-1 font-mono text-[12px] text-gray-200">{side === "left" ? "lockPrice" : "closePrice"}</div>
        </div>
      </div>
    </div>
  );
}

export function RewardsMechanicsGraph() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      <div className="px-5 sm:px-7 py-5 border-b border-white/10">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-monad-purple" />
            </div>
            <div>
              <div className="text-xs tracking-[0.25em] uppercase text-gray-500">Settlement Graph</div>
              <div className="text-xl sm:text-2xl font-semibold text-white">Automated decision pipeline</div>
            </div>
          </div>
          <div className="text-xs text-gray-400 max-w-md">
            A visual overview of how each 5-minute round pulls prices, decides the outcome, and distributes rewards.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Left steps */}
        <aside className="border-b lg:border-b-0 lg:border-r border-white/10 bg-black/10">
          <div className="px-5 sm:px-7 py-6 space-y-5">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-start gap-4">
                <div className="flex items-center justify-center h-9 w-9 rounded-full border border-white/10 bg-white/5 text-monad-purple font-semibold tabular-nums">
                  {s.id}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Graph */}
        <div className="relative px-5 sm:px-7 py-7">
          {/* Connectors (desktop only) */}
          <svg
            className="hidden lg:block absolute inset-0 pointer-events-none"
            viewBox="0 0 1000 560"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="mm-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="1" stopColor="rgba(135,109,255,0.35)" />
              </linearGradient>
            </defs>
            <path d="M500 140 C500 170 360 170 360 200" stroke="url(#mm-line)" strokeWidth="2" fill="none" />
            <path d="M500 140 C500 170 640 170 640 200" stroke="url(#mm-line)" strokeWidth="2" fill="none" />
            <path d="M360 300 L360 330" stroke="url(#mm-line)" strokeWidth="2" />
            <path d="M640 300 L640 330" stroke="url(#mm-line)" strokeWidth="2" />
            <path d="M360 455 C360 485 460 485 500 505" stroke="url(#mm-line)" strokeWidth="2" fill="none" />
            <path d="M640 455 C640 485 540 485 500 505" stroke="url(#mm-line)" strokeWidth="2" fill="none" />
          </svg>

          <div className="grid grid-cols-1 gap-6 lg:gap-8">
            <div className="lg:max-w-[760px] lg:mx-auto">
              <Panel tone="teal" label="Market" title="Prompt">
                <div className="font-mono text-sm sm:text-base text-gray-200 leading-relaxed">
                  Will <span className="text-white font-semibold">BTC</span> close above its lock price in this{" "}
                  <span className="text-white font-semibold">5-minute</span> round? Return{" "}
                  <span className="text-white font-semibold">UP</span> or{" "}
                  <span className="text-white font-semibold">DOWN</span>.
                </div>
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:px-8">
              <MiniCard
                tone="blue"
                label="Source"
                index="01"
                href="https://www.coingecko.com/"
                lines={["coingecko.com", "/api/v3/simple/price"]}
              />
              <MiniCard
                tone="purple"
                label="Source"
                index="02"
                href="https://www.binance.com/"
                lines={["binance.com", "/api/v3/ticker/price"]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:px-8">
              <AgentCard side="left" />
              <AgentCard side="right" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:px-8">
              <Panel
                tone="orange"
                label="Condition"
                title="Lock vs Close"
                right={
                  <span className="inline-flex items-center gap-2">
                    <Filter className="h-4 w-4 text-orange-300" />
                    <span className="text-gray-300">rule</span>
                  </span>
                }
              >
                <div className="font-mono text-[12px] sm:text-sm text-gray-200">
                  closePrice {">"} lockPrice → <span className="text-green-300 font-semibold">UP wins</span>
                  <br />
                  closePrice {"<"} lockPrice → <span className="text-red-300 font-semibold">DOWN wins</span>
                  <br />
                  closePrice {"="} lockPrice → <span className="text-gray-300 font-semibold">House wins</span>
                </div>
              </Panel>

              <Panel
                tone="gold"
                label="Rewards"
                title="Distribution"
                right={
                  <span className="inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <span className="text-gray-300">payout</span>
                  </span>
                }
              >
                <div className="font-mono text-[12px] sm:text-sm text-gray-200">
                  payout(i) = (bet(i) / totalWinningBets) × (pool − fee)
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Winners can claim rewards after the round is closed and the outcome is finalized on-chain.
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

