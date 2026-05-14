"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { formatEther } from "viem";
import { formatUnits } from "viem";
import { Clock, ExternalLink } from "lucide-react";
import { somniaTestnet } from "@/app/config/chains";
import { useCoinPrice } from "@/app/hooks/useCoinPrice";

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
}: PredictionMarketCardProps) {
  const coinSymbol = useMemo(() => {
    const normalizedId = (coinId || "").trim().toLowerCase();
    if (normalizedId === "bitcoin" || normalizedId === "btc") return "BTC";
    if (normalizedId === "ethereum" || normalizedId === "eth") return "ETH";
    if (normalizedId === "solana" || normalizedId === "sol") return "SOL";
    if (normalizedId === "somnia" || normalizedId === "somi") return "SOMI";

    // Try to infer from market symbol like "BTC5M" -> "BTC"
    const fromMarketSymbol = (symbol || "").trim().match(/^[A-Za-z]{2,6}/)?.[0];
    if (fromMarketSymbol) return fromMarketSymbol.toUpperCase();

    // Fall back to coinId if it looks like a symbol
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
  const isLive = roundStatus === 0;
  const isEnded = roundStatus === 2;
  const [now, setNow] = useState(() => Date.now());

  const startMs = typeof startTimestamp === "bigint" ? Number(startTimestamp) * 1000 : null;
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

  if (isComingSoon) {
    return (
      <Link
        href={`/markets/${address}`}
        data-market-card
        className="flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border border-white/10 bg-white/5 transition-colors overflow-hidden hover:border-monad-purple/40"
      >
        <div className="px-4 py-4 bg-black/20 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-wide text-white/90">
              <span className="h-8 w-8 rounded-full border border-white/15 bg-white/5 inline-flex items-center justify-center">
                <Clock className="h-4 w-4 text-white/90" />
              </span>
              Later
            </span>
            {typeof roundEpoch === "bigint" ? <span className="text-[12px] text-gray-400 font-mono">#{roundEpoch.toString()}</span> : null}
          </div>
        </div>

        <div className="relative p-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-10 text-center">
            <div className="text-2xl font-bold text-white">Entry starts</div>
            <div className="mt-3 text-4xl font-extrabold tracking-tight text-white tabular-nums">{entryStartsIn ?? "—"}</div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500 font-mono truncate">{address}</div>
        </div>
      </Link>
    );
  }

  if (isEnded) {
    const winnerColor =
      winnerSide === "UP"
        ? "border-emerald-400/60 bg-emerald-400/10"
        : winnerSide === "DOWN"
          ? "border-pink-400/60 bg-pink-400/10"
          : "border-white/15 bg-white/5";
    const loserText = loserSide === "UP" ? "text-emerald-200/70" : loserSide === "DOWN" ? "text-pink-200/70" : "text-gray-400";
    const deltaIsUp = typeof deltaUsd === "number" ? deltaUsd > 0 : null;

    return (
      <Link
        href={`/markets/${address}`}
        data-market-card
        className="flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border border-white/10 bg-white/5 transition-colors overflow-hidden opacity-75 hover:opacity-100 hover:border-monad-purple/40"
      >
        <div className="px-4 pt-4 pb-3 bg-black/20 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-wide text-gray-400">
              <span className="h-4 w-4 rounded-full border border-white/15 bg-white/5 inline-flex items-center justify-center text-[10px] leading-none">
                ⦸
              </span>
              Expired
            </span>
            <div className="flex items-center gap-2">
              {typeof roundEpoch === "bigint" ? <span className="text-[12px] text-gray-400 font-mono">#{roundEpoch.toString()}</span> : null}
              <a
                href={explorerUrl}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-monad-purple/40"
                aria-label="Open in explorer"
                title="Open in explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <div className="px-4 pt-4 pb-3 text-center">
              <div className={["text-lg font-extrabold tracking-wide", loserText].join(" ")}>{loserSide ?? "—"}</div>
              <div className="text-sm text-gray-400 font-semibold">{loserPayout != null ? `${loserPayout.toFixed(2)}x Payout` : "—"}</div>
            </div>

            <div className="px-4 pb-4">
              <div className={["rounded-2xl border p-4", winnerColor].join(" ")}>
                <div className="text-[12px] font-semibold text-gray-400 tracking-wide">CLOSED PRICE</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className={["text-3xl font-extrabold tabular-nums text-emerald-200"].join(" ")}>
                    {closeUsd != null ? `$${closeUsd.toFixed(4)}` : "—"}
                  </div>
                  <div
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-bold tabular-nums border",
                      deltaUsd == null
                        ? "border-white/10 bg-white/5 text-gray-300"
                        : deltaIsUp
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                          : "border-pink-400/40 bg-pink-400/15 text-pink-100",
                    ].join(" ")}
                  >
                    {deltaUsd == null ? "—" : `${deltaIsUp ? "↑" : "↓"} $${Math.abs(deltaUsd).toFixed(4)}`}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="text-gray-300">
                    <div className="text-gray-400">Locked Price:</div>
                    <div className="mt-1 font-semibold tabular-nums text-emerald-100">{lockUsd != null ? `$${lockUsd.toFixed(4)}` : "—"}</div>
                  </div>
                  <div className="text-gray-300 text-right">
                    <div className="text-gray-400">Prize Pool:</div>
                    <div className="mt-1 font-semibold tabular-nums">{totalPoolDisplay != null ? `${totalPoolDisplay.toFixed(4)} ETH` : "—"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div
                  className={[
                    "w-full px-4 py-3 text-center font-extrabold tracking-wide rounded-2xl border",
                    winnerSide === "UP"
                      ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-100"
                      : winnerSide === "DOWN"
                        ? "border-pink-400/50 bg-pink-400/20 text-pink-100"
                        : "border-white/10 bg-white/5 text-gray-200",
                  ].join(" ")}
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%)" }}
                >
                  <div className="text-sm">{winnerPayout != null ? `${winnerPayout.toFixed(2)}x Payout` : "—"}</div>
                  <div className="text-2xl leading-tight">{winnerSide ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-500 font-mono truncate">{address}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/markets/${address}`}
      data-market-card
      className={[
        "flex-none w-[360px] sm:w-[380px] snap-center rounded-2xl border bg-white/5 transition-colors overflow-hidden",
        isLive ? "border-monad-purple/40 hover:border-monad-purple/70" : "border-white/10 hover:border-monad-purple/40 opacity-80",
      ].join(" ")}
    >
      <div className="px-4 pt-4 pb-3 bg-black/20 border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={[
                "inline-flex items-center gap-2 text-[12px] font-semibold tracking-wide",
                isLive ? "text-monad-purple" : "text-gray-400",
              ].join(" ")}
            >
              <span className={["h-2 w-2 rounded-full", isLive ? "bg-monad-purple animate-pulse" : "bg-gray-500"].join(" ")} />
              {isLive ? "LIVE" : statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {typeof roundEpoch === "bigint" ? (
              <span className="text-[12px] text-gray-400 font-mono">#{roundEpoch.toString()}</span>
            ) : null}
            <a
              href={explorerUrl}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-monad-purple/40"
              aria-label="Open in explorer"
              title="Open in explorer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-gray-400 truncate">{coinSymbol ? `${coinSymbol}USD` : coinId}</div>
            <div className="text-white text-lg font-semibold truncate">{name}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-gray-400">Last price</div>
            <div className="text-emerald-200 font-semibold tabular-nums">
              {priceLoading ? "Price…" : currentPriceUsd != null ? `$${currentPriceUsd.toFixed(4)}` : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="text-[11px] text-gray-400">Prize Pool</div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div className="text-white font-semibold">{totalPoolDisplay != null ? `${totalPoolDisplay.toFixed(4)} ETH` : "—"}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300">{symbol}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-gray-400">Locked Price</div>
              <div className="mt-1 font-semibold tabular-nums text-emerald-100">{lockUsd != null ? `$${lockUsd.toFixed(4)}` : "—"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-right">
              <div className="text-gray-400">Close Price</div>
              <div className="mt-1 font-semibold tabular-nums text-emerald-100">{closeUsd != null ? `$${closeUsd.toFixed(4)}` : "—"}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
              <div className="text-[11px] text-emerald-200 font-semibold">UP</div>
              <div className="mt-1 text-sm text-white/90">{upDisplay != null ? `${upDisplay.toFixed(4)} ETH` : "—"}</div>
            </div>
            <div className="rounded-xl border border-pink-400/30 bg-pink-400/10 p-3">
              <div className="text-[11px] text-pink-200 font-semibold">DOWN</div>
              <div className="mt-1 text-sm text-white/90">{downDisplay != null ? `${downDisplay.toFixed(4)} ETH` : "—"}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-gray-500 font-mono truncate">{address}</div>
      </div>
    </Link>
  );
}
