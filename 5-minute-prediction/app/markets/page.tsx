"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, HelpCircle, History, Trophy, X, Sparkles, Activity } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { PredictionMarketCard } from "@/app/components/PredictionMarketCard";
import { type ServiceState } from "@/app/components/MarketLaunchSidebar";
import { useQuery } from "@tanstack/react-query";
import { usePredictionMarketFactoryCreateMarket, usePredictionMarketFactoryGetAllMarkets, usePredictionMarketFactoryGetMarketInfo } from "@/app/hooks/usePredictionMarketFactory";
import { useMarketCurrentRound } from "@/app/hooks/usePredictionMarketContract";
import { somniaTestnet } from "@/app/config/chains";
import { getPredictionMarketFactoryAddress } from "@/app/config/predictionAddresses";
import { useCoinPrice } from "@/app/hooks/useCoinPrice";
import { TokenAvatar } from "@/app/components/TokenAvatar";
import { toPng } from "html-to-image";

function asAddress(value: string): Address | null {
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

type MarketTab = "bitcoin" | "ethereum" | "solana" | "somnia";

function matchesTab(coinId: string, tab: MarketTab): boolean {
  const normalized = (coinId || "").trim().toLowerCase();
  if (!normalized) return false;
  if (tab === "bitcoin") return normalized === "bitcoin" || normalized === "btc";
  if (tab === "ethereum") return normalized === "ethereum" || normalized === "eth";
  if (tab === "solana") return normalized === "solana" || normalized === "sol";
  if (tab === "somnia") return normalized === "somnia" || normalized === "somi";
  return true;
}

function tabFromCoinId(coinId: string): MarketTab | null {
  const normalized = coinId.trim().toLowerCase();
  if (!normalized) return null;
  if (matchesTab(normalized, "bitcoin")) return "bitcoin";
  if (matchesTab(normalized, "ethereum")) return "ethereum";
  if (matchesTab(normalized, "solana")) return "solana";
  if (matchesTab(normalized, "somnia")) return "somnia";
  return null;
}

function scrollMarketCardIntoCenter(scrollRoot: HTMLElement | null, addressLower: string) {
  const el = scrollRoot?.querySelector(`[data-market-address="${addressLower}"]`);
  el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatCompactCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatRelativeTime(targetMs: number | null, nowMs: number): string | null {
  if (!targetMs) return null;
  const diff = nowMs - targetMs;
  const abs = Math.abs(diff);
  if (abs < 1000) return "just now";
  const totalSec = Math.floor(abs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const suffix = diff >= 0 ? "ago" : "from now";
  if (mins <= 0) return `${secs}s ${suffix}`;
  if (mins < 60) return `${mins}m ${secs}s ${suffix}`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m ${suffix}`;
}

function getSettlementClock(state: ServiceState | undefined, nowMs: number) {
  if (state?.nextLockAt) {
    return {
      primaryLabel: "Lock",
      primaryValue: formatCompactCountdown(state.nextLockAt - nowMs),
      secondaryLabel: "Close",
      secondaryValue: state.nextCloseAt ? formatCompactCountdown(state.nextCloseAt - nowMs) : "pending",
    };
  }

  if (state?.nextCloseAt) {
    return {
      primaryLabel: "Close",
      primaryValue: formatCompactCountdown(state.nextCloseAt - nowMs),
      secondaryLabel: "Settlement",
      secondaryValue: "finalizing",
    };
  }

  return {
    primaryLabel: "Launch",
    primaryValue: formatCompactCountdown(state?.nextCreateAt ? state.nextCreateAt - nowMs : 0),
    secondaryLabel: "Settlement",
    secondaryValue: "queued",
  };
}

export default function MarketsPage() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const factoryAddress = useMemo(() => getPredictionMarketFactoryAddress(chainId), [chainId]);
  const { data: allMarkets, isLoading, error, refetch } = usePredictionMarketFactoryGetAllMarkets(true);
  const { createMarket, isPending: isCreating, isConfirming } = usePredictionMarketFactoryCreateMarket();

  const [sharingAddress, setSharingAddress] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ marketName: "", marketSymbol: "", coinId: "" });
  const [tab, setTab] = useState<MarketTab>("bitcoin");
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [marketMeta, setMarketMeta] = useState<
    Record<
      string,
      {
        tab: MarketTab | null;
        epoch: bigint;
        lockPrice: bigint;
        closePrice: bigint;
        closeTimestamp: bigint;
      }
    >
  >({});

  const markets = useMemo(() => {
    const list = (allMarkets as Address[] | undefined) ?? [];
    return list.filter(Boolean);
  }, [allMarkets]);

  const marketsNewestFirst = useMemo(() => [...markets].reverse(), [markets]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastHandledLaunchKeyRef = useRef<string | null>(null);
  const seenMarketIdsRef = useRef<Set<string>>(new Set());

  const scrollByCards = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-market-card]");
    const step = (firstCard?.offsetWidth ?? 360) + 16;
    const amount = Math.max(step, Math.floor(el.clientWidth * 0.8));
    const delta = direction === "left" ? -amount : amount;
    try {
      el.scrollTo({ left: el.scrollLeft + delta, behavior: "smooth" });
    } catch {
      el.scrollLeft += delta;
    }
  };

  const headerSymbol = useMemo(() => {
    if (tab === "bitcoin") return "BTC";
    if (tab === "ethereum") return "ETH";
    if (tab === "solana") return "SOL";
    return "SOMI";
  }, [tab]);

  const { data: headerPriceData, isLoading: headerPriceLoading } = useCoinPrice({
    symbol: headerSymbol,
    enabled: true,
    refetchInterval: 10000,
  });

  const headerPriceUsd = useMemo(() => {
    const coinData = headerPriceData?.data?.[0];
    const usd = coinData?.prices?.find((p) => p.currency?.toUpperCase() === "USD")?.value;
    const any = coinData?.prices?.[0]?.value;
    const value = usd || any || null;
    if (!value) return null;
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return null;
    return asNumber;
  }, [headerPriceData]);

  const [serviceNow, setServiceNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setServiceNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<MarketTab, number> = { bitcoin: 0, ethereum: 0, solana: 0, somnia: 0 };
    for (const v of Object.values(marketMeta)) {
      if (!v.tab) continue;
      counts[v.tab] += 1;
    }
    return counts;
  }, [marketMeta]);

  const liveCounts = useMemo(() => {
    const counts: Record<MarketTab, number> = { bitcoin: 0, ethereum: 0, solana: 0, somnia: 0 };
    for (const v of Object.values(marketMeta)) {
      if (!v.tab) continue;
      const closeMs = Number(v.closeTimestamp) * 1000;
      const isLive =
        v.epoch !== 0n &&
        v.lockPrice !== 0n &&
        v.closePrice === 0n &&
        Number.isFinite(closeMs) &&
        serviceNow < closeMs;
      if (isLive) counts[v.tab] += 1;
    }
    return counts;
  }, [marketMeta, serviceNow]);

  const { data: serviceState } = useQuery<ServiceState>({
    queryKey: ["market-service-status-mini"],
    queryFn: async () => {
      const res = await fetch("https://minute-markets.onrender.com/api/market-service/status", { 
        cache: "no-store" 
      });
      return (await res.json()) as ServiceState;
    },
    refetchInterval: 3000,
    staleTime: 0,
  });

  const nextLaunchIn = serviceState?.nextCreateAt ? formatCountdown(serviceState.nextCreateAt - serviceNow) : null;
  const settlementClock = useMemo(() => getSettlementClock(serviceState, serviceNow), [serviceState, serviceNow]);

  const canCreate = chainId === somniaTestnet.id && !!factoryAddress;

  const handleMarketMeta = useCallback(
    (
      address: Address,
      meta: { tab: MarketTab | null; epoch: bigint; lockPrice: bigint; closePrice: bigint; closeTimestamp: bigint }
    ) => {
      setMarketMeta((prev) => {
        const key = address.toLowerCase();
        if (
          prev[key] &&
          prev[key].tab === meta.tab &&
          prev[key].epoch === meta.epoch &&
          prev[key].lockPrice === meta.lockPrice &&
          prev[key].closePrice === meta.closePrice &&
          prev[key].closeTimestamp === meta.closeTimestamp
        ) {
          return prev;
        }
        return { ...prev, [key]: meta };
      });
    },
    []
  );

  useEffect(() => {
    const lc = serviceState?.lastCreatedMarket;
    if (!lc?.address) return;
    const addr = lc.address.toLowerCase();
    const key = `${addr}:${lc.createdAt}`;
    if (lastHandledLaunchKeyRef.current === key) return;
    lastHandledLaunchKeyRef.current = key;

    const tabGuess = tabFromCoinId(lc.coinId);
    if (tabGuess) setTab(tabGuess);

    const run = () => scrollMarketCardIntoCenter(scrollRef.current, addr);
    requestAnimationFrame(() => requestAnimationFrame(run));
    const t1 = setTimeout(run, 250);
    const t2 = setTimeout(run, 700);
    const t3 = setTimeout(run, 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [serviceState?.lastCreatedMarket]);

  useEffect(() => {
    const ordered = marketsNewestFirst.map((a) => (a as string).toLowerCase());
    const next = new Set(ordered);
    const prev = seenMarketIdsRef.current;
    let added: string | undefined;
    if (prev.size > 0) {
      for (const id of ordered) {
        if (!prev.has(id)) {
          added = id;
          break;
        }
      }
    }
    seenMarketIdsRef.current = next;
    if (!added) return;

    const run = () => scrollMarketCardIntoCenter(scrollRef.current, added!);
    requestAnimationFrame(() => requestAnimationFrame(run));
    const t1 = setTimeout(run, 200);
    const t2 = setTimeout(run, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [marketsNewestFirst]);

  const handleCreate = async () => {
    setCreateError(null);
    try {
      const hash = await createMarket(form);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      setIsCreateOpen(false);
      setForm({ marketName: "", marketSymbol: "", coinId: "" });
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create market.");
    }
  };

  const handleShareSnapshot = async (targetAddress: Address, marketName: string, coinSymbol: string | null) => {
    const lowerAddress = targetAddress.toLowerCase();
    const targetEl = scrollRef.current?.querySelector(`[data-market-address="${lowerAddress}"]`) as HTMLDivElement;
    if (!targetEl) return;

    try {
      setSharingAddress(lowerAddress);

      const dataUrl = await toPng(targetEl, {
        quality: 0.95,
        backgroundColor: "#0b0b14",
        style: {
          transform: "scale(1)",
          transition: "none",
        },
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        alert("Snapshot copied to clipboard! You can paste it directly into your Tweet.");
      } else {
        const link = document.createElement("a");
        link.download = `market-${targetAddress.slice(0, 6)}.png`;
        link.href = dataUrl;
        link.click();
      }

      const marketUrl = `${window.location.origin}/markets/${targetAddress}`;
      const tweetText = `Checking out the ${marketName} (${coinSymbol ?? 'Crypto'}) prediction market on Somnia! 🔮💰\n\nTake a look here: `;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(marketUrl)}`;
      
      window.open(twitterUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error generating marketplace snapshot:", err);
    } finally {
      setSharingAddress(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 selection:bg-purple-500/30 selection:text-white">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-gray-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back Home
        </Link>
      </div>

      {/* Page Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            Prediction Arenas
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-1.5 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500/50" />
            Factory Address: <span className="text-gray-400 break-all">{factoryAddress ?? "Not configured for this chain"}</span>
            {chainId !== somniaTestnet.id && <span className="text-rose-400 font-bold">(Switch to {somniaTestnet.name})</span>}
          </p>
        </div>

        {/* Top Service Status indicator */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.01] px-3 py-2 w-full justify-between">
            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${
              serviceState?.running ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-gray-400"
            }`}>
              {serviceState?.running ? "Engine Active" : "Engine Paused"}
            </span>
            <span className="text-xs font-medium text-gray-400">
              Next batch: <span className="text-white font-black tabular-nums">{nextLaunchIn ?? "—"}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Orchestrator Control Panel Card */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0e0e1a] to-[#06060c] p-5 mb-8 shadow-[0_4px_30px_rgba(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/[0.02] to-transparent pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative z-10 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 inline-flex items-center justify-center shadow-inner">
              <Clock className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <div className="text-white font-black tracking-tight text-sm">Automated Launch Node</div>
              <div className="text-[10px] text-gray-500 font-medium tracking-wide">Settlement clock, launch status, and pipeline state</div>
            </div>
          </div>
          <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-md border tracking-widest ${
            serviceState?.running ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]" : "border-white/10 bg-white/5 text-gray-500"
          }`}>
            {serviceState?.running ? "Pipeline Active" : "Pipeline Paused"}
          </span>
        </div>

        <div className="mt-4 relative z-10 rounded-2xl border border-white/5 bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="text-[10px] uppercase font-black text-gray-500 tracking-[0.28em]">Settlement Clock</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-purple-300/80 font-black">{settlementClock.primaryLabel}</span>
                  <span className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tabular-nums leading-none">
                    {settlementClock.primaryValue}
                  </span>
                </div>
              </div>

              <div className="pb-1">
                <div className="text-[10px] uppercase font-black text-gray-500 tracking-[0.28em]">Next Stage</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-gray-400 font-black">{settlementClock.secondaryLabel}</span>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-white tabular-nums leading-none">
                    {settlementClock.secondaryValue}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/[0.04] pt-4">
              {serviceState?.lastCreatedMarket ? (
                <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                  <span className="text-gray-500 uppercase tracking-wider font-black text-[10px]">Last market launch</span>
                  <span className="text-white font-black uppercase bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/20">{serviceState.lastCreatedMarket.coinId}</span>
                  <span className="text-gray-500 font-mono text-[11px]">{formatRelativeTime(serviceState.lastCreatedMarket.createdAt, serviceNow)}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-500 font-medium italic">Waiting for the first market launch.</div>
              )}

              <div className="text-xs text-gray-400">
                Pipeline status: <span className={`font-black ${serviceState?.running ? "text-emerald-400" : "text-gray-300"}`}>{serviceState?.running ? "Running" : "Paused"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Navigation Filter Bar */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5 p-3 rounded-2xl shadow-inner backdrop-blur-md">
          
          {/* Left Block: Price Tracker & Asset Filters */}
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {/* Embedded Mini Live Asset Price Frame */}
            <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 flex items-center gap-3 shadow-inner h-11">
              <div className="flex items-center gap-1.5">
                <TokenAvatar symbol={headerSymbol} coinId={null} size={18} />
                <div className="text-[10px] text-gray-400 font-black tracking-wider uppercase">{headerSymbol}/USD</div>
              </div>
              <div className="text-emerald-400 font-black tabular-nums text-sm tracking-tight">
                {headerPriceLoading ? (
                  <span className="text-xs font-normal text-gray-500 animate-pulse">Loading...</span>
                ) : headerPriceUsd != null ? (
                  `$${headerPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                ) : (
                  "—"
                )}
              </div>
            </div>

            {/* Asset Tab List Group */}
            <div className="bg-black/30 border border-white/5 p-1 rounded-xl flex flex-wrap items-center gap-1">
              {([
                { key: "bitcoin", label: "BTC", symbol: "BTC" },
                { key: "ethereum", label: "ETH", symbol: "ETH" },
                { key: "solana", label: "SOL", symbol: "SOL" },
                { key: "somnia", label: "SOMI", symbol: "SOMI" },
              ] as const).map((t) => {
                const isActive = tab === t.key;
                const totalMarketsForTab = tabCounts[t.key] || 0;
                const liveMarketsForTab = liveCounts[t.key] || 0;

                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`h-9 px-3 rounded-lg text-xs font-black tracking-wide duration-200 ease-out flex items-center gap-2.5 transition-all relative ${
                      isActive
                        ? "bg-purple-600/15 border border-purple-500/30 text-white shadow-sm"
                        : "border border-transparent text-gray-400 hover:text-white hover:bg-white/[0.02]"
                    }`}
                    aria-label={`Filter ${t.label}`}
                  >
                    <TokenAvatar symbol={t.symbol} coinId={null} size={14} className="shadow-sm" />
                    <span>{t.label}</span>
                    
                    {/* Metrics Counter Pill Badges */}
                    <div className="flex items-center gap-1 ml-0.5">
                      {/* Total Market Count Badge */}
                      <span className={`h-4.5 px-1.5 inline-flex items-center justify-center rounded text-[9px] font-bold border font-mono ${
                        isActive ? "bg-purple-500/20 text-purple-200 border-purple-500/20" : "bg-white/5 text-gray-500 border-white/5"
                      }`}>
                        {totalMarketsForTab}
                      </span>

                      {/* Live Market Counter Notification Badge */}
                      {liveMarketsForTab > 0 && (
                        <span className="h-4.5 px-1.5 inline-flex items-center justify-center rounded text-[9px] font-black font-mono border border-emerald-500/20 bg-emerald-500/15 text-emerald-400 relative overflow-hidden shadow-sm animate-none">
                          <span className="absolute inset-0 bg-emerald-400/10 animate-pulse pointer-events-none" />
                          {liveMarketsForTab}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Block: Actions, Filters, Utilities */}
          <div className="flex items-center justify-between lg:justify-end gap-2.5 flex-wrap">
            {/* Live-Only Filter Toggle Switch */}
            <button
              type="button"
              onClick={() => setShowLiveOnly((v) => !v)}
              className={`h-9 px-3 rounded-xl border text-xs font-black tracking-wider uppercase transition-all duration-200 flex items-center gap-2 shadow-sm ${
                showLiveOnly
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/10"
                  : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20"
              }`}
              title="Show active live rounds only"
            >
              <Sparkles className={`h-3.5 w-3.5 ${showLiveOnly ? "text-emerald-400 fill-emerald-400/20 animate-spin-slow" : "text-gray-400"}`} />
              <span>Live Only</span>
              <span className="h-5 px-1.5 inline-flex items-center justify-center rounded-lg text-[10px] font-black border border-white/5 bg-black/30 text-gray-400 font-mono">
                {liveCounts[tab]}
              </span>
            </button>

            <div className="h-4 w-px bg-white/10 hidden sm:block" />

            {/* Dashboard Control Buttons */}
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 inline-flex items-center justify-center transition-all"
                title="Help Guide"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <button
                className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 inline-flex items-center justify-center transition-all"
                title="Global Leaderboards"
              >
                <Trophy className="h-4 w-4" />
              </button>
              <button
                className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 inline-flex items-center justify-center transition-all"
                title="Account Round History"
              >
                <History className="h-4 w-4" />
              </button>
            </div>

            {/* Horizontal Deck Sliders */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => scrollByCards("left")}
                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 inline-flex items-center justify-center transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollByCards("right")}
                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20 inline-flex items-center justify-center transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty States / Loading fallbacks */}
        {isLoading && (
          <div className="py-20 text-center rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center gap-3">
            <Activity className="h-6 w-6 text-purple-400 animate-pulse" />
            <p className="text-sm font-medium text-gray-400 animate-pulse">Querying Somnia block structure indices...</p>
          </div>
        )}
        {error && (
          <div className="py-12 text-center rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] p-6">
            <p className="text-sm font-bold text-rose-400">Failed to pull market records from factory.</p>
            <p className="text-xs text-gray-500 mt-1 font-mono">Verify RPC client connectivity status or network forks.</p>
          </div>
        )}
        {!isLoading && !error && markets.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-white/5 bg-white/[0.01] p-8">
            <p className="text-sm font-bold text-gray-400">No matching market targets instantiated.</p>
            <p className="text-xs text-gray-500 mt-1">Initialize market targets via deployment client or wait for pipeline engine tick.</p>
          </div>
        )}

        {/* Carousel Window Track */}
        <div className="relative isolate">
          <div
            ref={scrollRef}
            className="flex w-full max-w-full gap-4 overflow-x-scroll pb-6 snap-x snap-mandatory scroll-smooth scroll-pl-[max(1rem,calc(50%-11.875rem))] scroll-pr-[max(1rem,calc(50%-11.875rem))] no-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {marketsNewestFirst.map((m) => (
              <MarketCardFromFactory
                key={m}
                market={m}
                tab={tab}
                showLiveOnly={showLiveOnly}
                nowMs={serviceNow}
                onMeta={handleMarketMeta}
                sharingAddress={sharingAddress}
                onShare={handleShareSnapshot}
              />
            ))}
          </div>

          {/* Floated Edge Carousel Navigation Arrows */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollByCards("left"); }}
            className="absolute left-2 top-[44%] -translate-y-1/2 z-20 h-9 w-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-gray-400 hover:text-white hover:border-purple-500/40 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollByCards("right"); }}
            className="absolute right-2 top-[44%] -translate-y-1/2 z-20 h-9 w-9 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-gray-400 hover:text-white hover:border-purple-500/40 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Market Creation Modal Window Frame */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0e18] to-[#06060c] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Deploy Prediction Arena</h2>
                <div className="text-[11px] text-gray-500 mt-0.5">Instantiate factory custom parameters</div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white bg-white/5 h-7 w-7 rounded-lg border border-white/5 flex items-center justify-center transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Market Title Name</span>
                <input
                  value={form.marketName}
                  onChange={(e) => setForm((f) => ({ ...f, marketName: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-white/5 bg-black/40 px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                  placeholder="e.g. BTC 5m Turbo"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Market Ticker Symbol</span>
                <input
                  value={form.marketSymbol}
                  onChange={(e) => setForm((f) => ({ ...f, marketSymbol: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-white/5 bg-black/40 px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                  placeholder="e.g. BTC-5M"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Target Coin ID</span>
                <input
                  value={form.coinId}
                  onChange={(e) => setForm((f) => ({ ...f, coinId: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-white/5 bg-black/40 px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/10 transition-all placeholder:text-gray-600 shadow-inner"
                  placeholder="e.g. bitcoin"
                />
              </label>
            </div>

            {createError && (
              <p className="text-xs font-semibold text-rose-400 mt-4 bg-rose-500/5 border border-rose-500/10 px-3 py-2 rounded-xl">
                {createError}
              </p>
            )}

            <button
              onClick={handleCreate}
              disabled={isCreating || isConfirming || !canCreate}
              className="mt-6 w-full rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-sm font-black tracking-wide py-3.5 shadow-lg shadow-purple-600/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
            >
              {isCreating || isConfirming ? "Confirming Execution Pipeline..." : "Broadcast Launch Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MarketCardFromFactory({
  market,
  tab,
  showLiveOnly,
  nowMs,
  onMeta,
  sharingAddress,
  onShare,
}: {
  market: Address;
  tab: MarketTab;
  showLiveOnly: boolean;
  nowMs: number;
  onMeta?: (
    address: Address,
    meta: { tab: MarketTab | null; epoch: bigint; lockPrice: bigint; closePrice: bigint; closeTimestamp: bigint }
  ) => void;
  sharingAddress: string | null;
  onShare: (address: Address, name: string, symbol: string | null) => void;
}) {
  const { data } = usePredictionMarketFactoryGetMarketInfo(market, true);
  const { data: roundData } = useMarketCurrentRound(market, true);
  const info = data as
    | {
        marketAddress: Address;
        marketName: string;
        marketSymbol: string;
        coinId: string;
        creator: Address;
        createdAt: bigint;
        active: boolean;
      }
    | undefined;

  const round = roundData as
    | {
        epoch: bigint;
        startTimestamp: bigint;
        closeTimestamp: bigint;
        lockPrice: bigint;
        closePrice: bigint;
        totalPool: bigint;
        upPool: bigint;
        downPool: bigint;
        rewardAmount: bigint;
        treasuryAmount: bigint;
        upWon: boolean;
        status: number;
      }
    | undefined;

  const derivedTab = useMemo(() => {
    const coinId = typeof info?.coinId === "string" ? info.coinId : "";
    if (!coinId) return null;
    if (matchesTab(coinId, "bitcoin")) return "bitcoin";
    if (matchesTab(coinId, "ethereum")) return "ethereum";
    if (matchesTab(coinId, "solana")) return "solana";
    if (matchesTab(coinId, "somnia")) return "somnia";
    return null;
  }, [info?.coinId]);

  const isLive = useMemo(() => {
    if (!round) return false;
    if (round.epoch === 0n) return false;
    if (round.closePrice !== 0n) return false;
    if (round.lockPrice === 0n) return false;
    const closeMs = Number(round.closeTimestamp) * 1000;
    if (!Number.isFinite(closeMs)) return false;
    return nowMs < closeMs;
  }, [nowMs, round]);

  const coinSymbol = useMemo(() => {
    if (!info?.coinId) return null;
    const normalizedId = info.coinId.trim().toLowerCase();
    if (normalizedId === "bitcoin" || normalizedId === "btc") return "BTC";
    if (normalizedId === "ethereum" || normalizedId === "eth") return "ETH";
    if (normalizedId === "solana" || normalizedId === "sol") return "SOL";
    if (normalizedId === "somnia" || normalizedId === "somi") return "SOMI";
    return null;
  }, [info?.coinId]);

  useEffect(() => {
    if (!onMeta) return;
    onMeta(market, {
      tab: derivedTab,
      epoch: round?.epoch ?? 0n,
      lockPrice: round?.lockPrice ?? 0n,
      closePrice: round?.closePrice ?? 0n,
      closeTimestamp: round?.closeTimestamp ?? 0n,
    });
  }, [derivedTab, market, onMeta, round?.closePrice, round?.closeTimestamp, round?.epoch, round?.lockPrice]);

  if (!info) {
    const addr = asAddress(market);
    return (
      <PredictionMarketCard
        address={addr ?? (market as Address)}
        name="Loading Arena Metadata…"
        symbol=""
        coinId=""
        roundStatus={typeof round?.status === "number" ? round.status : undefined}
        roundEpoch={round?.epoch}
        totalPool={round?.totalPool}
        upPool={round?.upPool}
        downPool={round?.downPool}
        lockPrice={round?.lockPrice}
        closePrice={round?.closePrice}
        upWon={round?.upWon}
        startTimestamp={round?.startTimestamp}
        closeTimestamp={round?.closeTimestamp}
        isSharing={sharingAddress === market.toLowerCase()}
      />
    );
  }

  if (!matchesTab(info.coinId, tab)) return null;
  if (showLiveOnly && !isLive) return null;

  return (
    <PredictionMarketCard
      address={info.marketAddress}
      name={info.marketName}
      symbol={info.marketSymbol}
      coinId={info.coinId}
      roundStatus={typeof round?.status === "number" ? round.status : undefined}
      roundEpoch={round?.epoch}
      totalPool={round?.totalPool}
      upPool={round?.upPool}
      downPool={round?.downPool}
      lockPrice={round?.lockPrice}
      closePrice={round?.closePrice}
      upWon={round?.upWon}
      startTimestamp={round?.startTimestamp}
      closeTimestamp={round?.closeTimestamp}
      isSharing={sharingAddress === info.marketAddress.toLowerCase()}
      onShareClick={() => onShare(info.marketAddress, info.marketName, coinSymbol)}
    />
  );
}
