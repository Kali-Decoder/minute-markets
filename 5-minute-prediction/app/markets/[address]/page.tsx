"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatEther, formatUnits, parseEther, type Address } from "viem";
import { useAccount } from "wagmi";
import {
  useMarketBetDown,
  useMarketBetUp,
  useMarketClaim,
  useMarketContractBalance,
  useMarketCurrentRound,
  useMarketMeta,
  useMarketOwner,
  useMarketRequestClosePrice,
  useMarketStartRound,
  useMarketUserBet,
} from "@/app/hooks/usePredictionMarketContract";
import { getTokenLogoUrl, tokenSymbolFromCoinId } from "@/app/config/tokenLogos";
import { MarketOddsHistoryChart, type OddsPoint } from "@/app/components/MarketOddsHistoryChart";

function asAddress(value: string | string[] | undefined): Address | undefined {
  if (typeof value !== "string") return undefined;
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : undefined;
}

function formatPct(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n) return "0%";
  const pct = Number((numerator * 10_000n) / denominator) / 100;
  return `${pct.toFixed(2)}%`;
}

const ROUND_STATUS_LABEL: Record<number, string> = {
  0: "LIVE",
  1: "LOCKED",
  2: "ENDED",
  3: "CANCELLED",
};

const PRICE_DECIMALS = Number(process.env.NEXT_PUBLIC_PRICE_DECIMALS ?? "8");

function fmtTs(ts?: bigint): string {
  if (typeof ts !== "bigint" || ts === 0n) return "—";
  const date = new Date(Number(ts) * 1000);
  if (Number.isNaN(date.getTime())) return ts.toString();
  return date.toLocaleString();
}

function fmtPrice(price?: bigint): string {
  if (typeof price !== "bigint") return "—";
  if (!Number.isFinite(PRICE_DECIMALS)) return price.toString();
  try {
    return `${formatUnits(price, PRICE_DECIMALS)} (raw ${price.toString()})`;
  } catch {
    return price.toString();
  }
}

export default function MarketDetailPage() {
  const params = useParams<{ address: string }>();
  const market = useMemo(() => asAddress(params?.address), [params]);
  const { address: userAddress, isConnected } = useAccount();

  const meta = useMarketMeta(market, true);
  const { data: ownerRaw } = useMarketOwner(market, true);
  const { data: currentRoundRaw, isLoading: isRoundLoading, refetch: refetchRound } = useMarketCurrentRound(market, true);
  const { data: balanceRaw, refetch: refetchBalance } = useMarketContractBalance(market, true);

  const currentRound = currentRoundRaw as
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

  const currentEpoch = currentRound?.epoch;

  const { data: userBetRaw, refetch: refetchUserBet } = useMarketUserBet(market, currentEpoch, userAddress, true);
  const userBet = userBetRaw as { position: number; amount: bigint; claimed: boolean } | undefined;

  const betUp = useMarketBetUp(market);
  const betDown = useMarketBetDown(market);
  const claim = useMarketClaim(market);
  const startRoundTx = useMarketStartRound(market);
  const closeTx = useMarketRequestClosePrice(market);

  const [amountEth, setAmountEth] = useState<string>("0.01");
  const [actionError, setActionError] = useState<string | null>(null);

  const coinId = typeof meta.coinId.data === "string" ? meta.coinId.data : null;
  const derivedSymbol = useMemo(() => {
    const fromCoinId = tokenSymbolFromCoinId(coinId);
    if (fromCoinId) return fromCoinId;
    const fromMarketSymbol = typeof meta.marketSymbol.data === "string" ? meta.marketSymbol.data : null;
    const m = (fromMarketSymbol || "").trim().match(/^[A-Za-z]{2,6}/)?.[0];
    return m ? m.toUpperCase() : null;
  }, [coinId, meta.marketSymbol.data]);
  const tokenLogoUrl = useMemo(() => getTokenLogoUrl({ symbol: derivedSymbol, coinId }), [derivedSymbol, coinId]);

  const betState = useMemo(() => {
    if (!currentRound) return { canBet: false, reason: "Round not loaded yet." };
    if (currentRound.epoch === 0n) return { canBet: false, reason: "Round not started yet (owner must call startRound)." };
    if (currentRound.closePrice !== 0n) return { canBet: false, reason: "Round ended." };
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (currentRound.closeTimestamp !== 0n && now >= currentRound.closeTimestamp) {
      return { canBet: false, reason: "Round locked." };
    }
    return { canBet: true, reason: null as string | null };
  }, [currentRound]);

  const odds = useMemo(() => {
    if (!currentRound) return { up: "0%", down: "0%" };
    const total = currentRound.upPool + currentRound.downPool;
    return {
      up: formatPct(currentRound.upPool, total),
      down: formatPct(currentRound.downPool, total),
    };
  }, [currentRound]);

  const [oddsSeries, setOddsSeries] = useState<OddsPoint[]>([]);

  useEffect(() => {
    if (!currentRound) return;
    const up = Number(formatEther(currentRound.upPool));
    const down = Number(formatEther(currentRound.downPool));
    const total = up + down;
    const yes = total > 0 ? (up / total) * 100 : 0;
    const no = total > 0 ? (down / total) * 100 : 0;
    const point: OddsPoint = { t: Date.now(), yes, no };
    setOddsSeries((prev) => {
      const next = [...prev, point];
      // keep last ~24 hours at 5s sampling (~17k points) but cap for safety
      return next.slice(-20_000);
    });
  }, [currentRound]);

  useEffect(() => {
    // poll round data so the chart becomes a real "two-line" time series
    if (!market) return;
    const id = setInterval(() => {
      void refetchRound();
    }, 5_000);
    return () => clearInterval(id);
  }, [market, refetchRound]);

  const claimable = useMemo(() => {
    if (!currentRound || !userBet) return 0n;
    if (userBet.claimed) return 0n;

    // claim() allows ENDED or CANCELLED only
    if (currentRound.status === 3) {
      // CANCELLED: refund bet amount
      return userBet.amount ?? 0n;
    }

    if (currentRound.status !== 2) return 0n; // not ENDED

    const userWon =
      (currentRound.upWon && userBet.position === 0) || (!currentRound.upWon && userBet.position === 1);

    if (!userWon) return 0n;

    const winnerPool = currentRound.upWon ? currentRound.upPool : currentRound.downPool;
    if (!winnerPool || winnerPool === 0n) return 0n;

    return (userBet.amount * currentRound.rewardAmount) / winnerPool;
  }, [currentRound, userBet]);

  const positionResult = useMemo(() => {
    if (!userBet) return "—";
    if (!currentRound) return "—";

    if (currentRound.status === 0) return "Pending (LIVE)";
    if (currentRound.status === 1) return "Pending (LOCKED)";
    if (currentRound.status === 3) return "Cancelled (Refund)";
    if (currentRound.status !== 2) return `Pending (STATUS ${currentRound.status})`;

    const userWon =
      (currentRound.upWon && userBet.position === 0) || (!currentRound.upWon && userBet.position === 1);
    return userWon ? "Win" : "Loss";
  }, [currentRound, userBet]);

  const doRefetchAll = async () => {
    await Promise.all([refetchRound(), refetchBalance(), refetchUserBet()]);
  };

  const isOwner = useMemo(() => {
    if (!userAddress || typeof ownerRaw !== "string") return false;
    return ownerRaw.toLowerCase() === userAddress.toLowerCase();
  }, [ownerRaw, userAddress]);

  const doStartRound = async () => {
    setActionError(null);
    try {
      await startRoundTx.startRound();
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to start round.");
    }
  };

  const doRequestClose = async () => {
    setActionError(null);
    try {
      if (!currentEpoch) throw new Error("Current epoch not available.");
      await closeTx.requestClosePrice(currentEpoch);
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to request close price.");
    }
  };

  const doBet = async (direction: "UP" | "DOWN") => {
    setActionError(null);
    try {
      if (!currentRound) throw new Error("Round not loaded yet.");
      if (currentRound.epoch === 0n) throw new Error("Round not started yet (owner must call startRound).");
      if (currentRound.status !== 0) throw new Error(`Round not live (${ROUND_STATUS_LABEL[currentRound.status] ?? currentRound.status}).`);
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (currentRound.closeTimestamp !== 0n && now >= currentRound.closeTimestamp) throw new Error("Round locked.");
      const value = parseEther(amountEth || "0");
      if (value <= 0n) throw new Error("Bet amount must be greater than 0.");
      if (direction === "UP") await betUp.betUp({ epoch: currentEpoch, value });
      else await betDown.betDown({ epoch: currentEpoch, value });
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Bet failed.");
    }
  };

  const doClaimCurrent = async () => {
    setActionError(null);
    try {
      if (!currentEpoch) throw new Error("Current epoch not available yet.");
      await claim.claim([currentEpoch]);
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Claim failed.");
    }
  };

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <Link href="/markets" className="inline-flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>
        <p className="text-red-300 mt-6">Invalid market address.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/markets" className="inline-flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Markets
        </Link>
        <span className="text-[11px] text-gray-500 truncate">{market}</span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 mb-5">
        <div className="flex items-start gap-3">
          {tokenLogoUrl ? (
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/20 flex items-center justify-center flex-none">
              <Image src={tokenLogoUrl} alt={`${derivedSymbol ?? "Token"} logo`} width={28} height={28} className="rounded-full" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {typeof meta.marketName.data === "string" ? meta.marketName.data : "Market"}
              {typeof meta.marketSymbol.data === "string" && meta.marketSymbol.data ? (
                <span className="ml-2 text-base text-gray-400">({meta.marketSymbol.data})</span>
              ) : null}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Coin ID: {coinId ?? "—"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-3">
          Contract Balance: {typeof balanceRaw === "bigint" ? `${formatEther(balanceRaw)} ETH` : "—"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Current Round</h2>
          {isRoundLoading && <p className="text-gray-400">Loading…</p>}
          {!isRoundLoading && !currentRound && <p className="text-gray-400">No round data.</p>}
          {currentRound && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Epoch" value={currentRound.epoch.toString()} />
                <Stat
                  label="Status"
                  value={`${ROUND_STATUS_LABEL[currentRound.status] ?? "UNKNOWN"} (${String(currentRound.status)})`}
                />
                <Stat label="Total Pool" value={`${formatEther(currentRound.totalPool)} ETH`} />
                <Stat label="Up Pool" value={`${formatEther(currentRound.upPool)} ETH`} />
                <Stat label="Down Pool" value={`${formatEther(currentRound.downPool)} ETH`} />
                <Stat label="Odds" value={`UP ${odds.up} / DOWN ${odds.down}`} />
                <Stat label="Start Time" value={fmtTs(currentRound.startTimestamp)} />
                <Stat label="Lock Time" value={fmtTs(currentRound.startTimestamp)} />
                <Stat label="Close Time" value={fmtTs(currentRound.closeTimestamp)} />
                <Stat label="Lock Price" value={fmtPrice(currentRound.lockPrice)} />
                <Stat label="Close Price" value={fmtPrice(currentRound.closePrice)} />
                <Stat label="Up Won" value={currentRound.status === 2 ? (currentRound.upWon ? "Yes" : "No") : "—"} />
              </div>

              {!betState.canBet && betState.reason ? (
                <p className="mt-4 text-sm text-yellow-200/90">{betState.reason}</p>
              ) : null}

              {currentRound.epoch === 0n && isOwner ? (
                <div className="mt-4">
                  <button
                    onClick={doStartRound}
                    disabled={startRoundTx.isPending || startRoundTx.isConfirming}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white font-semibold hover:border-monad-purple/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {startRoundTx.isPending || startRoundTx.isConfirming ? "Starting round…" : "Start Round (Admin)"}
                  </button>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Only the market owner can start the first round.
                  </p>
                </div>
              ) : null}

              {isOwner && currentRound.epoch !== 0n ? (
                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={doRequestClose}
                    disabled={
                      closeTx.isPending ||
                      closeTx.isConfirming ||
                      currentRound.lockPrice === 0n ||
                      currentRound.closePrice !== 0n ||
                      BigInt(Math.floor(Date.now() / 1000)) < currentRound.closeTimestamp
                    }
                    className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {closeTx.isPending || closeTx.isConfirming ? "Requesting close…" : "Request Close Price (Admin)"}
                  </button>
                  <p className="text-[11px] text-gray-500">
                    Lock price is fetched automatically when <span className="text-gray-300">startRound()</span> is called. Close enabled after lock is received and close time.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                  <span>Odds History</span>
                  <span className="text-gray-500">
                    Pool: {formatEther(currentRound.upPool)} / {formatEther(currentRound.downPool)} ETH
                  </span>
                </div>
                <MarketOddsHistoryChart series={oddsSeries} yesLabel="UP" noLabel="DOWN" />
              </div>
            </>
          )}

          <div className="mt-6">
            <label className="block">
              <span className="text-xs text-gray-400">Bet amount (ETH)</span>
              <input
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-monad-purple/50"
                placeholder="0.01"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <button
                onClick={() => doBet("UP")}
                disabled={!isConnected || !betState.canBet || betUp.isPending || betUp.isConfirming}
                className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-200 font-semibold disabled:opacity-50"
              >
                {betUp.isPending || betUp.isConfirming ? "Betting…" : "Bet UP"}
              </button>
              <button
                onClick={() => doBet("DOWN")}
                disabled={!isConnected || !betState.canBet || betDown.isPending || betDown.isConfirming}
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 font-semibold disabled:opacity-50"
              >
                {betDown.isPending || betDown.isConfirming ? "Betting…" : "Bet DOWN"}
              </button>
            </div>
          </div>

          {actionError && <p className="text-sm text-red-300 mt-3">{actionError}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <h2 className="text-white font-semibold mb-4">Your Position</h2>
          {!isConnected && <p className="text-gray-400 text-sm">Connect wallet to see your bet.</p>}
          {isConnected && (
            <>
              <Stat label="Epoch" value={currentEpoch ? currentEpoch.toString() : "—"} />
              <Stat label="Side" value={userBet ? (userBet.position === 0 ? "UP" : userBet.position === 1 ? "DOWN" : String(userBet.position)) : "—"} />
              <Stat label="Amount" value={userBet ? `${formatEther(userBet.amount)} ETH` : "—"} />
              <Stat label="Result" value={userBet ? positionResult : "—"} />
              <Stat label="Claimed" value={userBet ? (userBet.claimed ? "Yes" : "No") : "—"} />
              <Stat label="Claimable" value={userBet ? `${formatEther(claimable)} ETH` : "—"} />
              <button
                onClick={doClaimCurrent}
                disabled={!userBet || userBet.claimed || claimable === 0n || claim.isPending || claim.isConfirming}
                className="mt-4 w-full rounded-xl bg-monad-purple px-4 py-3 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claim.isPending || claim.isConfirming ? "Claiming…" : "Claim (Current Epoch)"}
              </button>
              <button
                onClick={doRefetchAll}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white font-semibold hover:border-monad-purple/40"
              >
                Refresh
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] text-gray-400">{label}</p>
      <p className="text-sm text-white font-medium mt-1 truncate">{value}</p>
    </div>
  );
}
