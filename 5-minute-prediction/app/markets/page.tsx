"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, HelpCircle, History, Trophy, X, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { getTokenLogoUrl } from "@/app/config/tokenLogos";

function asAddress(value: string): Address | null {
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

type MarketTab = "bitcoin" | "ethereum" | "solana" | "somnia";

function matchesTab(coinId: string, tab: MarketTab): boolean {
  const normalized = (coinId || "").trim().toLowerCase();
  if (!normalized) return false;
  // tolerate "btc"/"eth"/"sol" symbols or full ids
  if (tab === "bitcoin") return normalized === "bitcoin" || normalized === "btc";
  if (tab === "ethereum") return normalized === "ethereum" || normalized === "eth";
  if (tab === "solana") return normalized === "solana" || normalized === "sol";
  if (tab === "somnia") return normalized === "somnia" || normalized === "somi";
  return true;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function LaunchStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] text-gray-400 font-semibold">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}

export default function MarketsPage() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const factoryAddress = useMemo(() => getPredictionMarketFactoryAddress(chainId), [chainId]);
  const { data: allMarkets, isLoading, error, refetch } = usePredictionMarketFactoryGetAllMarkets(true);
  const { createMarket, isPending: isCreating, isConfirming } = usePredictionMarketFactoryCreateMarket();

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollByCards = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-market-card]");
    const step = (firstCard?.offsetWidth ?? 360) + 16; // card width + gap-4
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
    const tick = setInterval(() => setServiceNow(Date.now()), 1_000);
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
    refetchInterval: 3_000,
    staleTime: 0,
  });

  const nextLaunchIn = serviceState?.nextCreateAt ? formatCountdown(serviceState.nextCreateAt - serviceNow) : null;
  const closeIn = serviceState?.nextCloseAt ? formatCountdown(serviceState.nextCloseAt - serviceNow) : null;

  const canCreate = chainId === somniaTestnet.id && !!factoryAddress;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        {/* <button
          onClick={() => setIsCreateOpen(true)}
          disabled={!canCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-monad-purple text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Create Market
        </button> */}
      </div>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Prediction Markets</h1>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <span
              className={[
                "text-[10px] px-2 py-0.5 rounded-full border",
                serviceState?.running
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-white/10 bg-white/5 text-gray-300",
              ].join(" ")}
            >
              {serviceState?.running ? "Launch Live" : "Launch Paused"}
            </span>
            <span className="text-xs text-gray-300">
              Next: <span className="text-white font-semibold tabular-nums">{nextLaunchIn ?? "—"}</span>
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-8">
        Factory: {factoryAddress ?? "Not configured for this chain"} {chainId !== somniaTestnet.id ? `(switch to ${somniaTestnet.name})` : ""}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-monad-purple" />
            <div className="text-white font-semibold">Next Market Launch</div>
          </div>
          <span
            className={[
              "text-[10px] px-2 py-0.5 rounded-full border",
              serviceState?.running ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-white/10 bg-white/5 text-gray-300",
            ].join(" ")}
          >
            {serviceState?.running ? "Live" : "Paused"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[12px] text-gray-400">Launching in</div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1 tabular-nums">
              {serviceState?.running ? nextLaunchIn ?? "—" : "00:00"}
            </div>
          </div>
          {serviceState?.lastCreatedMarket ? (
            <div className="text-xs text-gray-400">
              Last: <span className="text-white">{serviceState.lastCreatedMarket.coinId}</span>{" "}
              <span className="text-gray-500">•</span>{" "}
              <span className="text-gray-300 font-mono">{serviceState.lastCreatedMarket.address}</span>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No market created yet by the service.</div>
          )}
        </div>

        {serviceState?.lastError ? <div className="mt-2 text-xs text-red-300">Error: {serviceState.lastError}</div> : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LaunchStep label="Create" value={serviceState?.running ? nextLaunchIn ?? "—" : "00:00"} />
          <LaunchStep label="Lock" value={serviceState?.running ? "Auto" : "—"} />
          <LaunchStep label="Close" value={serviceState?.running ? closeIn ?? "—" : "00:00"} />
        </div>
      </div>

      <div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 flex items-center gap-3">
                <div className="text-emerald-200 font-semibold tabular-nums text-lg">
                  {headerPriceLoading ? "—" : headerPriceUsd != null ? `$${headerPriceUsd.toFixed(4)}` : "—"}
                </div>
                <div className="flex items-center gap-2">
                  {getTokenLogoUrl({ symbol: headerSymbol, coinId: null }) ? (
                    <Image
                      src={getTokenLogoUrl({ symbol: headerSymbol, coinId: null })!}
                      alt={`${headerSymbol} logo`}
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                  ) : null}
                  <div className="text-xs text-gray-300 font-semibold tracking-wide">{headerSymbol}USD</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 flex items-center gap-2">
                {([
                  { key: "bitcoin", label: "BTC", logo: getTokenLogoUrl({ symbol: "BTC", coinId: null }) },
                  { key: "ethereum", label: "ETH", logo: getTokenLogoUrl({ symbol: "ETH", coinId: null }) },
                  { key: "solana", label: "SOL", logo: getTokenLogoUrl({ symbol: "SOL", coinId: null }) },
                  { key: "somnia", label: "SOMI", logo: getTokenLogoUrl({ symbol: "SOMI", coinId: null }) },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={[
                      "h-10 px-3 rounded-xl border text-sm font-semibold transition-colors inline-flex items-center gap-2",
                      tab === t.key
                        ? "border-monad-purple/50 bg-monad-purple/10 text-white"
                        : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-monad-purple/30",
                    ].join(" ")}
                    aria-label={`Filter ${t.label}`}
                    title={t.label}
                  >
                    {t.logo ? <Image src={t.logo} alt={`${t.label} logo`} width={18} height={18} className="rounded-full" /> : null}
                    <span className="hidden sm:inline">{t.label}</span>
                    <span
                      className={[
                        "ml-1 min-w-[1.5rem] h-5 px-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold border",
                        tab === t.key ? "bg-monad-purple/20 text-white border-monad-purple/30" : "bg-white/5 text-gray-300 border-white/10",
                      ].join(" ")}
                      aria-label={`${tabCounts[t.key]} markets`}
                    >
                      {tabCounts[t.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scrollByCards("left")}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center"
                aria-label="Scroll left"
                title="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollByCards("right")}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center"
                aria-label="Scroll right"
                title="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLiveOnly((v) => !v)}
                className={[
                  "h-10 px-3 rounded-xl border text-sm font-semibold transition-colors inline-flex items-center gap-2",
                  showLiveOnly
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40",
                ].join(" ")}
                aria-label="Toggle live filter"
                title="Show live markets only"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Live</span>
                <span className="min-w-[1.5rem] h-5 px-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold border border-white/10 bg-black/20 text-gray-200 tabular-nums">
                  {liveCounts[tab]}
                </span>
              </button>
              <button
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center"
                aria-label="Help"
                title="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              <button
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center"
                aria-label="Leaderboard"
                title="Leaderboard"
              >
                <Trophy className="h-5 w-5" />
              </button>
              <button
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center"
                aria-label="History"
                title="History"
              >
                <History className="h-5 w-5" />
              </button>
            </div>
          </div>

          {isLoading && <p className="text-gray-400">Loading markets…</p>}
          {error && <p className="text-red-300">Failed to load markets.</p>}
          {!isLoading && !error && markets.length === 0 && <p className="text-gray-400">No markets created yet.</p>}

          <div className="relative isolate">
            <div
              ref={scrollRef}
              className="flex w-full max-w-full gap-4 overflow-x-scroll pb-4 snap-x snap-mandatory scroll-smooth"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {markets.map((m) => (
                <MarketCardFromFactory
                  key={m}
                  market={m}
                  tab={tab}
                  showLiveOnly={showLiveOnly}
                  nowMs={serviceNow}
                  onMeta={(address, meta) =>
                    setMarketMeta((prev) => {
                      const key = address.toLowerCase();
                      const next = { ...prev };
                      next[key] = meta;
                      return next;
                    })
                  }
                />
              ))}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollByCards("left");
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-xl border border-white/10 bg-black/40 backdrop-blur text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center pointer-events-auto"
              aria-label="Scroll markets left"
              title="Scroll left"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollByCards("right");
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-xl border border-white/10 bg-black/40 backdrop-blur text-gray-200 hover:text-white hover:border-monad-purple/40 inline-flex items-center justify-center pointer-events-auto"
              aria-label="Scroll markets right"
              title="Scroll right"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0b14] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">Create Market</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-400">Market Name</span>
                <input
                  value={form.marketName}
                  onChange={(e) => setForm((f) => ({ ...f, marketName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-monad-purple/50"
                  placeholder="e.g. BTC 5m"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Market Symbol</span>
                <input
                  value={form.marketSymbol}
                  onChange={(e) => setForm((f) => ({ ...f, marketSymbol: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-monad-purple/50"
                  placeholder="e.g. BTC5M"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Coin ID</span>
                <input
                  value={form.coinId}
                  onChange={(e) => setForm((f) => ({ ...f, coinId: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-monad-purple/50"
                  placeholder="e.g. bitcoin"
                />
              </label>
            </div>

            {createError && <p className="text-sm text-red-300 mt-3">{createError}</p>}

            <button
              onClick={handleCreate}
              disabled={isCreating || isConfirming || !canCreate}
              className="mt-5 w-full rounded-xl bg-monad-purple px-4 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating || isConfirming ? "Creating…" : "Create"}
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
}: {
  market: Address;
  tab: MarketTab;
  showLiveOnly: boolean;
  nowMs: number;
  onMeta?: (
    address: Address,
    meta: { tab: MarketTab | null; epoch: bigint; lockPrice: bigint; closePrice: bigint; closeTimestamp: bigint }
  ) => void;
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
      name="Loading…"
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
    />
  );
}
