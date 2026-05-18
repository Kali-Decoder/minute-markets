"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { formatEther } from "viem";
import { formatUnits } from "viem";
import { Clock, ExternalLink, Share2, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { somniaTestnet } from "@/app/config/chains";
import { useCoinPrice } from "@/app/hooks/useCoinPrice";
import { TokenAvatar } from "@/app/components/TokenAvatar";

const ROUND_STATUS_LABEL: Record<number, string> = {
  0: "LIVE",
  1: "LOCKED",
  2: "ENDED",
  3: "CANCELLED",
};

export type PredictionMarketCardProps = {
  address: Address;
  name: string;
  symbol: string;
  coinId: string;
  roundStatus?: number;
  roundEpoch?: bigint;
  totalPool?: bigint;
  upPool?: bigint;
  downPool?: bigint;
  lockPrice?: bigint;
  closePrice?: bigint;
  upWon?: boolean;
  startTimestamp?: bigint;
  closeTimestamp?: bigint;
  isSharing?: boolean;
  onShareClick?: () => void;
};

export function PredictionMarketCard({
  address,
  name,
  symbol,
  coinId,
  roundStatus,
  roundEpoch,
  totalPool,
  upPool,
  downPool,
  lockPrice,
  closePrice,
  upWon,
  startTimestamp,
  closeTimestamp,
  isSharing = false,
  onShareClick,
}: PredictionMarketCardProps) {
  const coinSymbol = useMemo(() => {
    const normalizedId = (coinId || "").trim().toLowerCase();
    if (normalizedId === "bitcoin" || normalizedId === "btc") return "BTC";
    if (normalizedId === "ethereum" || normalizedId === "eth") return "ETH";
    if (normalizedId === "solana" || normalizedId === "sol") return "SOL";
    if (normalizedId === "somnia" || normalizedId === "somi") return "SOMI";

    const fromMarketSymbol = (symbol || "").trim().match(/^[A-Za-z]{2,6}/)?.[0];
    if (fromMarketSymbol) return fromMarketSymbol.toUpperCase();

    const fromCoinId = (coinId || "").trim().match(/^[A-Za-z]{2,6}$/)?.[0];
    return fromCoinId ? fromCoinId.toUpperCase() : null;
  }, [coinId, symbol]);

  const { data: coinPriceData, isLoading: priceLoading } = useCoinPrice({
    symbol: coinSymbol || "ETH",
    enabled: !!coinSymbol,
    refetchInterval: 10000,
  });

  const currentPriceUsd = useMemo(() => {
    const coinData = coinPriceData?.data?.[0];
    const usd = coinData?.prices?.find((p) => p.currency?.toUpperCase() === "USD")?.value;
    const any = coinData?.prices?.[0]?.value;
    const value = usd || any || null;
    if (!value) return null;
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return null;
    return asNumber;
  }, [coinPriceData]);

  const explorerBase = (somniaTestnet.blockExplorers?.default.url || "").replace(/\/$/, "");
  const explorerUrl = explorerBase ? `${explorerBase}/address/${address}` : "";
  const statusLabel = typeof roundStatus === "number" ? ROUND_STATUS_LABEL[roundStatus] ?? `STATUS ${roundStatus}` : "—";
  const [now, setNow] = useState(() => Date.now());

  const startMs = typeof startTimestamp === "bigint" ? Number(startTimestamp) * 1000 : null;
  const closeMs = typeof closeTimestamp === "bigint" ? Number(closeTimestamp) * 1000 : null;
  
  const isCancelled = roundStatus === 3;
  const isEnded = roundStatus === 2 || (typeof closePrice === "bigint" && closePrice !== 0n);

  const isLocked = useMemo(() => {
    if (isEnded || isCancelled) return false;
    if (roundStatus === 1) return true;
    if (typeof closeMs !== "number" || !Number.isFinite(closeMs)) return false;
    return now >= closeMs;
  }, [closeMs, isEnded, isCancelled, roundStatus, now]);

  const isLive = useMemo(() => {
    if (isEnded || isCancelled || isLocked) return false;
    if (roundStatus === 0) return true;
    if (typeof roundEpoch !== "bigint" || roundEpoch === 0n) return false;
    return true;
  }, [isEnded, isCancelled, isLocked, roundStatus, roundEpoch]);

  const displayStatus = isCancelled ? "CANCELLED" : isEnded ? "ENDED" : isLocked ? "LOCKED" : isLive ? "LIVE" : statusLabel;
  const isComingSoon = isLive && typeof startMs === "number" && Number.isFinite(startMs) && startMs > now;

  useEffect(() => {
    if (!isComingSoon) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isComingSoon]);

  const entryStartsIn = useMemo(() => {
    if (!isComingSoon || typeof startMs !== "number") return null;
    const diff = Math.max(0, startMs - now);
    const totalSec = Math.floor(diff / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `~${m}:${s}`;
  }, [isComingSoon, now, startMs]);

  const PRICE_DECIMALS = Number(process.env.NEXT_PUBLIC_PRICE_DECIMALS ?? "8");
  const fmtOraclePrice = (price?: bigint): number | null => {
    if (typeof price !== "bigint") return null;
    if (!Number.isFinite(PRICE_DECIMALS)) return null;
    try {
      const s = formatUnits(price, PRICE_DECIMALS);
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  };

  const totalPoolDisplay = typeof totalPool === "bigint" ? Number(formatEther(totalPool)) : null;
  const upDisplay = typeof upPool === "bigint" ? Number(formatEther(upPool)) : null;
  const downDisplay = typeof downPool === "bigint" ? Number(formatEther(downPool)) : null;

  const lockUsd = fmtOraclePrice(lockPrice);
  const closeUsd = fmtOraclePrice(closePrice);
  const deltaUsd = useMemo(() => {
    if (lockUsd == null || closeUsd == null) return null;
    return closeUsd - lockUsd;
  }, [lockUsd, closeUsd]);

  const upPayout = useMemo(() => {
    if (typeof totalPool !== "bigint" || typeof upPool !== "bigint" || upPool === 0n) return null;
    const t = Number(formatEther(totalPool));
    const s = Number(formatEther(upPool));
    if (!Number.isFinite(t) || !Number.isFinite(s) || s <= 0) return null;
    return t / s;
  }, [totalPool, upPool]);

  const downPayout = useMemo(() => {
    if (typeof totalPool !== "bigint" || typeof downPool !== "bigint" || downPool === 0n) return null;
    const t = Number(formatEther(totalPool));
    const s = Number(formatEther(downPool));
    if (!Number.isFinite(t) || !Number.isFinite(s) || s <= 0) return null;
    return t / s;
  }, [totalPool, downPool]);

  const winnerSide = upWon === true ? "UP" : upWon === false ? "DOWN" : null;
  const winnerPayout = winnerSide === "UP" ? upPayout : winnerSide === "DOWN" ? downPayout : null;
  const loserSide = winnerSide === "UP" ? "DOWN" : winnerSide === "DOWN" ? "UP" : null;
  const loserPayout = loserSide === "UP" ? upPayout : loserSide === "DOWN" ? downPayout : null;

  const renderShareButton = () => {
    if (!onShareClick) return null;
    return (
      <button
        type="button"
        disabled={isSharing}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onShareClick();
        }}
        className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-monad-purple/40 transition-all duration-150 disabled:opacity-40"
        aria-label="Share layout snapshot"
        title="Share to Twitter"
      >
        <Share2 className={`h-4 w-4 ${isSharing ? "animate-pulse text-monad-purple" : ""}`} />
      </button>
    );
  };

  /* ==================== 1. COMING SOON STATE ==================== */
  if (isComingSoon) {
    return (
      <Link
        href={`/markets/${address}`}
        data-market-card
        data-market-address={address.toLowerCase()}
        className="flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f0f1c] to-[#07070d] backdrop-blur-md transition-all duration-300 ease-out overflow-hidden hover:border-white/20 hover:-translate-y-1 shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.05)] group"
      >
        <div className="px-4 py-4 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
              <span className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 inline-flex items-center justify-center shadow-inner">
                <Clock className="h-3.5 w-3.5 text-gray-400 group-hover:rotate-12 transition-transform duration-300" />
              </span>
              Coming Soon
            </span>
            <div className="flex items-center gap-2">
              {typeof roundEpoch === "bigint" ? (
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md font-mono tracking-tight border border-white/[0.03]">
                  #{roundEpoch.toString()}
                </span>
              ) : null}
              {renderShareButton()}
            </div>
          </div>
        </div>

        <div className="relative p-5">
          <div className="flex items-center justify-center gap-2 mb-4 bg-white/[0.02] border border-white/5 py-1.5 px-3 rounded-full w-fit mx-auto shadow-sm">
            <TokenAvatar symbol={coinSymbol} coinId={coinId} size={18} />
            <div className="text-xs text-gray-300 font-bold tracking-wide">{coinSymbol ?? coinId}</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-gradient-to-b from-black/40 to-black/20 p-8 text-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient from-white/[0.02] to-transparent pointer-events-none" />
            <div className="text-xs uppercase tracking-widest font-semibold text-gray-400/80">Entry starts in</div>
            <div className="mt-2 text-4xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tabular-nums drop-shadow-sm">
              {entryStartsIn ?? "—"}
            </div>
          </div>

          <div className="mt-4 text-[10px] text-gray-600 font-mono truncate text-center select-none tracking-tight">{address}</div>
        </div>
      </Link>
    );
  }

  /* ==================== 2. EXPIRED / ENDED STATE ==================== */
  if (isEnded) {
    const isUpWinner = winnerSide === "UP";
    const winnerGlowColor = isUpWinner 
      ? "hover:shadow-[0_20px_50px_-12px_rgba(16,185,129,0.15)] hover:border-emerald-500/30" 
      : "hover:shadow-[0_20px_50px_-12px_rgba(244,63,94,0.15)] hover:border-rose-500/30";

    const winnerBadgeClass = isUpWinner
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-rose-500/30 bg-rose-500/10 text-rose-400";

    const loserText = loserSide === "UP" ? "text-emerald-500/60" : loserSide === "DOWN" ? "text-rose-500/60" : "text-gray-500";
    const deltaIsUp = typeof deltaUsd === "number" ? deltaUsd > 0 : null;

    return (
      <Link
        href={`/markets/${address}`}
        data-market-card
        data-market-address={address.toLowerCase()}
        className={`flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border border-white/5 bg-gradient-to-b from-[#090910] to-[#040408] transition-all duration-300 ease-out overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${winnerGlowColor} group`}
      >
        <div className="px-4 pt-3.5 pb-2.5 bg-white/[0.01] border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase">
              <span className="h-2 w-2 rounded-full bg-gray-600" />
              Settled
            </span>
            <div className="flex items-center gap-2">
              {typeof roundEpoch === "bigint" ? (
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md font-mono border border-white/[0.03]">
                  #{roundEpoch.toString()}
                </span>
              ) : null}
              {renderShareButton()}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (explorerUrl) window.open(explorerUrl, "_blank", "noreferrer"); }}
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150"
                aria-label="Open in explorer"
                title="Open in explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3 bg-white/[0.01] py-1 px-2.5 rounded-lg border border-white/[0.03] w-fit">
            <TokenAvatar symbol={coinSymbol} coinId={coinId} size={18} />
            <div className="text-xs text-gray-400 font-bold tracking-wider">{coinSymbol ? `${coinSymbol}/USD` : coinId}</div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/40 overflow-hidden shadow-inner">
            {/* Loser Side Overview */}
            <div className="px-4 pt-3.5 pb-2 flex justify-between items-center bg-white/[0.01] border-b border-white/[0.03]">
              <div className="flex items-center gap-1.5">
                {loserSide === "UP" ? <TrendingUp className="h-3 w-3 text-emerald-600/70" /> : <TrendingDown className="h-3 w-3 text-rose-600/70" />}
                <div className={`text-xs font-bold tracking-wide uppercase ${loserText}`}>{loserSide ?? "—"} Pool</div>
              </div>
              <div className="text-xs text-gray-500 font-mono font-medium">{loserPayout != null ? `${loserPayout.toFixed(2)}x` : "—"}</div>
            </div>

            {/* Winning Result Core */}
            <div className="p-3.5">
              <div className={`rounded-xl border p-4 transition-all bg-gradient-to-b from-white/[0.02] to-transparent ${winnerBadgeClass}`}>
                <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Closed Price</div>
                <div className="mt-1 flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white drop-shadow-sm">
                    {closeUsd != null ? `$${closeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
                  </div>
                  <div
                    className={`rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums border flex items-center gap-1 shadow-sm ${
                      deltaUsd == null
                        ? "border-white/10 bg-white/5 text-gray-400"
                        : deltaIsUp
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {deltaUsd == null ? "—" : `${deltaIsUp ? "↑" : "↓"} $${Math.abs(deltaUsd).toFixed(4)}`}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.04] grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-500 font-medium">Locked Value:</div>
                    <div className="mt-0.5 font-bold tabular-nums text-gray-300">
                      {lockUsd != null ? `$${lockUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 font-medium">Prize Pool:</div>
                    <div className="mt-0.5 font-bold tabular-nums text-gray-200">
                      {totalPoolDisplay != null ? `${totalPoolDisplay.toFixed(3)} STT` : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Winner Banner */}
              <div className="mt-3 relative">
                <div
                  className={`w-full px-4 py-2.5 text-center font-black tracking-widest rounded-xl border relative shadow-md transition-all ${
                    isUpWinner
                      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/20 to-emerald-500/[0.02] text-emerald-400"
                      : winnerSide === "DOWN"
                        ? "border-rose-500/40 bg-gradient-to-b from-rose-500/20 to-rose-500/[0.02] text-rose-400"
                        : "border-white/10 bg-white/5 text-gray-400"
                  }`}
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)" }}
                >
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">
                    {winnerPayout != null ? `${winnerPayout.toFixed(2)}x Payout` : "—"}
                  </div>
                  <div className="text-xl font-black flex items-center justify-center gap-1">
                    {isUpWinner ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {winnerSide ?? "—"} WIN
                  </div>
                </div>
                <div className="h-3" /> {/* Padding for the arrow cutout */}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-gray-600 font-mono truncate text-center select-none tracking-tight">{address}</div>
        </div>
      </Link>
    );
  }

  /* ==================== 3. LIVE & LOCKED CARD STATE ==================== */
  const statusTheme = isLive 
    ? { 
        text: "text-purple-400", 
        bg: "bg-purple-500/15", 
        border: "border-purple-500/30", 
        dot: "bg-purple-400 animate-pulse",
        cardBorder: "border-purple-500/20 hover:border-purple-500/40 shadow-[0_4px_30px_rgba(139,92,246,0.05)] hover:shadow-[0_20px_50px_-12px_rgba(139,92,246,0.18)]" 
      }
    : isLocked 
    ? { 
        text: "text-amber-400", 
        bg: "bg-amber-500/15", 
        border: "border-amber-500/30", 
        dot: "bg-amber-400",
        cardBorder: "border-amber-500/20 hover:border-amber-500/40 shadow-[0_4px_30px_rgba(245,158,11,0.03)] hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.12)]" 
      }
    : { 
        text: "text-gray-400", 
        bg: "bg-white/5", 
        border: "border-white/10", 
        dot: "bg-gray-400",
        cardBorder: "border-white/10 hover:border-purple-500/30" 
      };

  return (
    <Link
      href={`/markets/${address}`}
      data-market-card
      data-market-address={address.toLowerCase()}
      className={`flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border bg-gradient-to-b from-[#0c0c16] to-[#05050a] transition-all duration-300 ease-out overflow-hidden backdrop-blur-md ${statusTheme.cardBorder}`}
    >
      {/* Top Section */}
      <div className="px-4 pt-3.5 pb-3 bg-white/[0.01] border-b border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-black tracking-widest px-2.5 py-0.5 rounded-md border uppercase ${statusTheme.text} ${statusTheme.bg} ${statusTheme.border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusTheme.dot}`} />
              {displayStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {typeof roundEpoch === "bigint" ? (
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md font-mono border border-white/[0.03]">
                #{roundEpoch.toString()}
              </span>
            ) : null}
            {renderShareButton()}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (explorerUrl) window.open(explorerUrl, "_blank", "noreferrer"); }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-150"
              aria-label="Open in explorer"
              title="Open in explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Token Info Asset Bar */}
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
              <TokenAvatar symbol={coinSymbol} coinId={coinId} size={16} className="flex-none" />
              <div className="text-[11px] text-gray-400 font-bold tracking-wider uppercase truncate">{coinSymbol ? `${coinSymbol}/USD` : coinId}</div>
            </div>
            <div className="text-white text-base font-extrabold tracking-tight truncate">{name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Live Price</div>
            <div className="text-emerald-400 font-black tabular-nums text-base sm:text-lg whitespace-nowrap tracking-tight drop-shadow-[0_2px_10px_rgba(52,211,153,0.1)]">
              {priceLoading ? (
                <span className="text-xs text-gray-500 font-medium animate-pulse">Syncing...</span>
              ) : currentPriceUsd != null ? (
                `$${currentPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Content Frame */}
      <div className="p-4">
        <div className="rounded-xl border border-white/5 bg-gradient-to-b from-black/40 to-black/10 p-4 shadow-inner">
          
          {/* Main Prize Pool Row */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.04]">
            <div>
              <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase flex items-center gap-1">
                <Layers className="h-3 w-3 text-purple-400/80" /> Total Pool
              </div>
              <div className="mt-0.5 text-white font-black text-lg tracking-tight tabular-nums">
                {totalPoolDisplay != null ? `${totalPoolDisplay.toLocaleString(undefined, { maximumFractionDigits: 4 })} STT` : "—"}
              </div>
            </div>
            <span className="text-[10px] font-extrabold tracking-widest px-2 py-1 rounded-md border border-white/10 bg-white/5 text-gray-300 shadow-sm uppercase font-mono">
              {symbol}
            </span>
          </div>

          {/* Locked vs Closed Target Row */}
          <div className="mt-3.5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 shadow-sm">
              <div className="text-gray-500 font-medium uppercase text-[10px] tracking-wider">Locked Price</div>
              <div className="mt-1 font-bold tabular-nums text-gray-200 truncate">
                {lockUsd != null ? `$${lockUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 shadow-sm">
              <div className="text-gray-500 font-medium uppercase text-[10px] tracking-wider">Target Close</div>
              <div className="mt-1 font-bold tabular-nums text-gray-200 truncate">
                {closeUsd != null ? `$${closeUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : "—"}
              </div>
            </div>
          </div>

          {/* Bid Pools Distribution (UP/DOWN Blocks) */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/10 bg-gradient-to-b from-emerald-500/[0.08] to-transparent p-3 shadow-sm relative group/up hover:border-emerald-500/20 transition-colors">
              <div className="text-[10px] text-emerald-400 font-black tracking-widest uppercase flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> UP
              </div>
              <div className="mt-1 text-sm font-bold text-white tabular-nums tracking-tight">
                {upDisplay != null ? `${upDisplay.toFixed(3)} ETH` : "—"}
              </div>
            </div>
            
            <div className="rounded-xl border border-rose-500/10 bg-gradient-to-b from-rose-500/[0.08] to-transparent p-3 shadow-sm relative group/down hover:border-rose-500/20 transition-colors">
              <div className="text-[10px] text-rose-400 font-black tracking-widest uppercase flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> DOWN
              </div>
              <div className="mt-1 text-sm font-bold text-white tabular-nums tracking-tight">
                {downDisplay != null ? `${downDisplay.toFixed(3)} ETH` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Address Footer identifier */}
        <div className="mt-3 text-[10px] text-gray-600 font-mono truncate text-center select-none tracking-tight">{address}</div>
      </div>
    </Link>
  );
}