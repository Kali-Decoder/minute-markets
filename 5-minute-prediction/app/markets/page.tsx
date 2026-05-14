"use client";

import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Coins } from "lucide-react";
import { useMemo, useState } from "react";
import type { Address } from "viem";
import { useChainId, usePublicClient } from "wagmi";
import { PredictionMarketCard } from "@/app/components/PredictionMarketCard";
import { MarketLaunchSidebar } from "@/app/components/MarketLaunchSidebar";
import { usePredictionMarketFactoryCreateMarket, usePredictionMarketFactoryGetAllMarkets, usePredictionMarketFactoryGetMarketInfo } from "@/app/hooks/usePredictionMarketFactory";
import { useMarketCurrentRound } from "@/app/hooks/usePredictionMarketContract";
import { somniaTestnet } from "@/app/config/chains";
import { getPredictionMarketFactoryAddress } from "@/app/config/predictionAddresses";

function asAddress(value: string): Address | null {
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

type MarketTab = "all" | "bitcoin" | "ethereum" | "solana" | "somnia";

function matchesTab(coinId: string, tab: MarketTab): boolean {
  if (tab === "all") return true;
  const normalized = (coinId || "").trim().toLowerCase();
  if (!normalized) return tab === "all";
  // tolerate "btc"/"eth"/"sol" symbols or full ids
  if (tab === "bitcoin") return normalized === "bitcoin" || normalized === "btc";
  if (tab === "ethereum") return normalized === "ethereum" || normalized === "eth";
  if (tab === "solana") return normalized === "solana" || normalized === "sol";
  if (tab === "somnia") return normalized === "somnia" || normalized === "somi";
  return true;
}

function BitcoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#fff"
        d="M18.37 14.2c.38-2.55-1.56-3.92-4.2-4.83l.86-3.45-2.1-.52-.84 3.36c-.55-.14-1.12-.27-1.68-.4l.85-3.4-2.1-.52-.86 3.45c-.46-.1-.92-.21-1.35-.32v-.01L4.1 7.72l-.55 2.24s1.56.36 1.53.38c.85.21 1 .76.98 1.2l-.98 3.94.22.06-.22-.05-1.37 5.51c-.1.26-.37.66-.98.5.02.03-1.53-.38-1.53-.38l-1.02 2.35 2.64.66c.49.13.98.25 1.46.37l-.87 3.5 2.1.52.86-3.46c.58.16 1.14.3 1.69.44l-.86 3.44 2.1.52.87-3.5c3.6.68 6.3.4 7.44-2.85.92-2.62-.05-4.13-1.95-5.12 1.38-.32 2.43-1.23 2.7-3.11Zm-4.82 6.75c-.66 2.62-5.07 1.2-6.5.85l1.17-4.67c1.42.35 6 .94 5.33 3.82Zm.66-6.79c-.6 2.38-4.26 1.17-5.46.87l1.06-4.24c1.2.3 5.06.86 4.4 3.37Z"
      />
    </svg>
  );
}

function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path fill="#fff" opacity="0.9" d="M16 4l6.7 11.1L16 18.9 9.3 15.1 16 4z" />
      <path fill="#fff" opacity="0.7" d="M16 20.1l6.7-4.1L16 28 9.3 16 16 20.1z" />
    </svg>
  );
}

function SolanaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="solg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="#0B0B14" />
      <path
        d="M8.8 12.2c.3-.3.7-.5 1.1-.5h14.6c.9 0 1.3 1 .7 1.6l-2 2c-.3.3-.7.5-1.1.5H7.5c-.9 0-1.3-1-.7-1.6l2-2Z"
        fill="url(#solg)"
      />
      <path
        d="M8.8 18.3c.3-.3.7-.5 1.1-.5h14.6c.9 0 1.3 1 .7 1.6l-2 2c-.3.3-.7.5-1.1.5H7.5c-.9 0-1.3-1-.7-1.6l2-2Z"
        fill="url(#solg)"
        opacity="0.9"
      />
      <path
        d="M23.2 9.1c.3-.3.7-.5 1.1-.5h.2c.9 0 1.3 1 .7 1.6l-2 2c-.3.3-.7.5-1.1.5H7.5c-.9 0-1.3-1-.7-1.6l2-2c.3-.3.7-.5 1.1-.5h13.3Z"
        fill="url(#solg)"
        opacity="0.75"
      />
    </svg>
  );
}

function SomniaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="somg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#876DFF" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="#0B0B14" />
      <path
        d="M10.2 12.1c0-2.6 2.1-4.6 5.2-4.6 2 0 3.8.7 5 1.8.5.5.5 1.2 0 1.7l-.9.9c-.5.5-1.3.5-1.8 0-.6-.6-1.4-1-2.4-1-1.4 0-2.3.7-2.3 1.7 0 2.9 8.3 1.3 8.3 7 0 2.8-2.3 4.7-5.7 4.7-2.3 0-4.3-.8-5.7-2.3-.5-.5-.5-1.2 0-1.7l.9-.9c.5-.5 1.3-.5 1.8 0 .8.9 1.8 1.4 3 1.4 1.6 0 2.6-.7 2.6-1.8 0-3-8.3-1.3-8.3-6.9Z"
        fill="url(#somg)"
      />
    </svg>
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
  const [tab, setTab] = useState<MarketTab>("all");

  const markets = useMemo(() => {
    const list = (allMarkets as Address[] | undefined) ?? [];
    return list.filter(Boolean);
  }, [allMarkets]);

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

      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Prediction Markets</h1>
      <p className="text-sm text-gray-400 mb-8">
        Factory: {factoryAddress ?? "Not configured for this chain"} {chainId !== somniaTestnet.id ? `(switch to ${somniaTestnet.name})` : ""}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {([
              { key: "all", label: "All", icon: <Coins className="h-4 w-4" /> },
              { key: "bitcoin", label: "Bitcoin", icon: <BitcoinIcon className="h-4 w-4" /> },
              { key: "ethereum", label: "Ethereum", icon: <EthereumIcon className="h-4 w-4" /> },
              { key: "solana", label: "Solana", icon: <SolanaIcon className="h-4 w-4" /> },
              { key: "somnia", label: "Somnia", icon: <SomniaIcon className="h-4 w-4" /> },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors inline-flex items-center gap-2",
                  tab === t.key
                    ? "border-monad-purple/50 bg-monad-purple/10 text-white"
                    : "border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-monad-purple/30",
                ].join(" ")}
              >
                {"icon" in t && t.icon ? t.icon : null}
                {t.label}
              </button>
            ))}
          </div>

          {isLoading && <p className="text-gray-400">Loading markets…</p>}
          {error && <p className="text-red-300">Failed to load markets.</p>}
          {!isLoading && !error && markets.length === 0 && <p className="text-gray-400">No markets created yet.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((m) => (
              <MarketCardFromFactory key={m} market={m} tab={tab} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <MarketLaunchSidebar />
          </div>
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

function MarketCardFromFactory({ market, tab }: { market: Address; tab: MarketTab }) {
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
        lockTimestamp: bigint;
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

  if (!info) {
    const addr = asAddress(market);
    return (
      <PredictionMarketCard
        address={addr ?? (market as Address)}
        name="Loading…"
        symbol=""
        coinId=""
        roundStatus={typeof round?.status === "number" ? round.status : undefined}
        upPool={round?.upPool}
        downPool={round?.downPool}
      />
    );
  }

  if (!matchesTab(info.coinId, tab)) return null;

  return (
    <PredictionMarketCard
      address={info.marketAddress}
      name={info.marketName}
      symbol={info.marketSymbol}
      coinId={info.coinId}
      roundStatus={typeof round?.status === "number" ? round.status : undefined}
      upPool={round?.upPool}
      downPool={round?.downPool}
    />
  );
}
