"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, Layers, Wallet, RefreshCw, Calendar, ShieldCheck, HelpCircle, Flame, Coins, Copy, Check } from "lucide-react";
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
import { tokenSymbolFromCoinId } from "@/app/config/tokenLogos";
import { MarketOddsHistoryChart, type OddsPoint } from "@/app/components/MarketOddsHistoryChart";
import { TokenAvatar } from "@/app/components/TokenAvatar";

function asAddress(value: string | string[] | undefined): Address | undefined {
  if (typeof value !== "string") return undefined;
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : undefined;
}

function formatPct(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n) return "0%";
  const pct = Number((numerator * 10_000n) / denominator) / 100;
  return `${pct.toFixed(1)}%`;
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
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtPrice(price?: bigint): string {
  if (typeof price !== "bigint" || price === 0n) return "—";
  if (!Number.isFinite(PRICE_DECIMALS)) return price.toString();
  try {
    const parsed = Number(formatUnits(price, PRICE_DECIMALS));
    return `$${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
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
  const [copiedPool, setCopiedPool] = useState(false);

  const coinId = typeof meta.coinId.data === "string" ? meta.coinId.data : null;
  const derivedSymbol = useMemo(() => {
    const fromCoinId = tokenSymbolFromCoinId(coinId);
    if (fromCoinId) return fromCoinId;
    const fromMarketSymbol = typeof meta.marketSymbol.data === "string" ? meta.marketSymbol.data : null;
    const m = (fromMarketSymbol || "").trim().match(/^[A-Za-z]{2,6}/)?.[0];
    return m ? m.toUpperCase() : null;
  }, [coinId, meta.marketSymbol.data]);

  const betState = useMemo(() => {
    if (!currentRound) return { canBet: false, reason: "Round synchronization pending..." };
    if (currentRound.epoch === 0n) return { canBet: false, reason: "First epoch uninstantiated. Launch genesis round." };
    if (currentRound.closePrice !== 0n) return { canBet: false, reason: "Active prediction period settled." };
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (currentRound.closeTimestamp !== 0n && now >= currentRound.closeTimestamp) {
      return { canBet: false, reason: "Time parameters elapsed. Waiting for oracle settlement." };
    }
    return { canBet: true, reason: null as string | null };
  }, [currentRound]);

  // Clean numerical representations for accurate rendering splits
  const { oddsUpPct, oddsDownPct, upPctNum, downPctNum } = useMemo(() => {
    if (!currentRound) return { oddsUpPct: "50%", oddsDownPct: "50%", upPctNum: 50, downPctNum: 50 };
    const total = currentRound.upPool + currentRound.downPool;
    if (total === 0n) return { oddsUpPct: "50%", oddsDownPct: "50%", upPctNum: 50, downPctNum: 50 };
    
    const upNum = Number((currentRound.upPool * 10000n) / total) / 100;
    const downNum = Number((currentRound.downPool * 10000n) / total) / 100;
    return {
      oddsUpPct: `${upNum.toFixed(1)}%`,
      oddsDownPct: `${downNum.toFixed(1)}%`,
      upPctNum: upNum,
      downPctNum: downNum
    };
  }, [currentRound]);

  const [oddsSeries, setOddsSeries] = useState<OddsPoint[]>([]);

  useEffect(() => {
    if (!currentRound) {
      setOddsSeries([]);
      return;
    }

    const total = currentRound.upPool + currentRound.downPool;
    const yes = total === 0n ? 50 : Number((currentRound.upPool * 10000n) / total) / 100;
    const no = total === 0n ? 50 : Number((currentRound.downPool * 10000n) / total) / 100;
    const startMs =
      currentRound.startTimestamp > 0n
        ? Number(currentRound.startTimestamp) * 1000
        : Date.now() - 60_000;

    setOddsSeries([
      { t: startMs, yes: 50, no: 50 },
      { t: Date.now(), yes, no },
    ]);
  }, [currentRound?.epoch, currentRound?.upPool, currentRound?.downPool, currentRound?.startTimestamp]);

  useEffect(() => {
    if (!currentRound) return;

    const appendPoint = () => {
      const point: OddsPoint = {
        t: Date.now(),
        yes: upPctNum,
        no: downPctNum,
      };

      setOddsSeries((prev) => {
        if (prev.length === 0) return [point];

        const last = prev[prev.length - 1];
        if (point.t - last.t < 2500) {
          return [...prev.slice(0, -1), point];
        }

        return [...prev, point].slice(-120);
      });
    };

    appendPoint();
    const id = setInterval(appendPoint, 5000);
    return () => clearInterval(id);
  }, [upPctNum, downPctNum, currentRound?.epoch]);

  useEffect(() => {
    if (!market) return;
    const id = setInterval(() => {
      void refetchRound();
    }, 5000);
    return () => clearInterval(id);
  }, [market, refetchRound]);

  const claimable = useMemo(() => {
    if (!currentRound || !userBet) return 0n;
    if (userBet.claimed) return 0n;
    if (currentRound.status === 3) return userBet.amount ?? 0n;
    if (currentRound.status !== 2) return 0n;

    const userWon =
      (currentRound.upWon && userBet.position === 0) || (!currentRound.upWon && userBet.position === 1);
    if (!userWon) return 0n;

    const winnerPool = currentRound.upWon ? currentRound.upPool : currentRound.downPool;
    if (!winnerPool || winnerPool === 0n) return 0n;

    return (userBet.amount * currentRound.rewardAmount) / winnerPool;
  }, [currentRound, userBet]);

  const positionResult = useMemo(() => {
    if (!userBet || userBet.amount === 0n) return "No active position";
    if (!currentRound) return "—";

    if (currentRound.status === 0) return "Live Active Stage";
    if (currentRound.status === 1) return "Locked Stage";
    if (currentRound.status === 3) return "Cancelled (Refund Active)";
    if (currentRound.status !== 2) return `Awaiting State Resolution`;

    const userWon =
      (currentRound.upWon && userBet.position === 0) || (!currentRound.upWon && userBet.position === 1);
    return userWon ? "🏆 Winner" : "Lose";
  }, [currentRound, userBet]);

  const doRefetchAll = async () => {
    await Promise.all([refetchRound(), refetchBalance(), refetchUserBet()]);
  };

  const copyPoolAddress = async () => {
    if (!market) return;
    try {
      await navigator.clipboard.writeText(market);
      setCopiedPool(true);
      setTimeout(() => setCopiedPool(false), 2000);
    } catch {
      setActionError("Could not copy pool address.");
    }
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
      if (!currentRound) throw new Error("Round details syncing. Retry momentarily.");
      if (currentRound.epoch === 0n) throw new Error("Launch parameters unverified by administrator node.");
      if (!currentEpoch) throw new Error("Target epoch state pointer missing.");
      if (currentRound.status !== 0) throw new Error(`Round pool deposits are closed.`);
      
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (currentRound.closeTimestamp !== 0n && now >= currentRound.closeTimestamp) throw new Error("Lock execution threshold exceeded.");
      
      const value = parseEther(amountEth || "0");
      if (value <= 0n) throw new Error("Input minimum valid threshold allocation.");
      
      if (direction === "UP") await betUp.betUp({ epoch: currentEpoch, value });
      else await betDown.betDown({ epoch: currentEpoch, value });
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Broadcast validation error.");
    }
  };

  const doClaimCurrent = async () => {
    setActionError(null);
    try {
      if (!currentEpoch) throw new Error("Epoch index pointer missing.");
      await claim.claim([currentEpoch]);
      await doRefetchAll();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Settlement pipeline execution error.");
    }
  };

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 text-center">
        <Link href="/markets" className="inline-flex items-center gap-2 text-xs font-bold tracking-wider text-gray-400 uppercase bg-white/5 border border-white/10 px-4 py-2 rounded-xl mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Arenas
        </Link>
        <div className="p-8 border border-rose-500/10 bg-rose-500/[0.02] rounded-2xl max-w-md mx-auto text-rose-400 font-bold">
          Malformed or invalid smart contract target path.
        </div>
      </div>
    );
  }

  const liveBadgeTheme = currentRound?.status === 0 
    ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
    : currentRound?.status === 1
    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
    : "border-white/10 bg-white/5 text-gray-400";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20 selection:bg-purple-500/30">
      
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link href="/markets" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shadow-sm transition-all w-fit">
          <ArrowLeft className="h-3.5 w-3.5" />
          Prediction Markets
        </Link>
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <div className="text-[10px] font-mono font-semibold bg-black/40 text-gray-500 px-3 py-1 rounded-xl border border-white/5 min-w-0 truncate select-all">
            Pool: <span className="text-gray-400">{market}</span>
          </div>
          <button
            type="button"
            onClick={() => void copyPoolAddress()}
            title="Copy pool address"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 transition-all hover:bg-white/10 hover:text-white"
          >
            {copiedPool ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Asset Summary Jumbotron Panel */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0f0f1d] to-[#06060c] p-6 mb-6 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/[0.01] to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-xl border border-white/10 bg-black/40 flex items-center justify-center flex-none p-1 shadow-inner relative overflow-hidden">
              <TokenAvatar symbol={derivedSymbol} coinId={coinId} size={40} className="ring-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight truncate">
                  {typeof meta.marketName.data === "string" ? meta.marketName.data : "Prediction Arena"}
                </h1>
                {typeof meta.marketSymbol.data === "string" && meta.marketSymbol.data && (
                  <span className="text-xs font-mono font-extrabold bg-white/5 px-2 py-0.5 rounded border border-white/5 text-gray-400 uppercase tracking-tight">
                    {meta.marketSymbol.data}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1.5 uppercase tracking-wide">
                Oracle Stream Identifier: <span className="text-gray-400 font-mono font-bold normal-case">{coinId ?? "—"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-black/30 border border-white/5 rounded-xl p-3 sm:px-4 shadow-inner h-fit sm:self-center">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <div>
                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Liquidity Pool Available</div>
                <div className="text-base font-black text-white tabular-nums tracking-tight">
                  {typeof balanceRaw === "bigint" ? `${Number(formatEther(balanceRaw)).toLocaleString(undefined, { maximumFractionDigits: 4 })} STT` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Execution Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns (Span 2): Live Metrics & Real-time Distribution Wave Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.04] mb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-purple-400" />
                <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Live Stream Frame Monitor</h2>
              </div>
              {currentRound && (
                <span className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded border uppercase flex items-center gap-1 shadow-sm ${liveBadgeTheme}`}>
                  <span className={`h-1 w-1 rounded-full ${currentRound.status === 0 ? 'bg-purple-400 animate-pulse' : 'bg-gray-500'}`} />
                  {ROUND_STATUS_LABEL[currentRound.status] ?? "SYNCING"}
                </span>
              )}
            </div>

            {isRoundLoading && (
              <div className="py-20 text-center font-medium text-xs text-gray-500 animate-pulse">
                Querying block logs for contract indices...
              </div>
            )}
            
            {!isRoundLoading && !currentRound && (
              <div className="py-16 text-center text-xs font-semibold text-gray-500 italic">
                No active epoch parameters returned from smart contract state.
              </div>
            )}

            {currentRound && (
              <div className="space-y-6">
                {/* Stats Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatItem label="Active Epoch" value={`#${currentRound.epoch.toString()}`} isHighlight />
                  <StatItem label="Total Deposited" value={`${Number(formatEther(currentRound.totalPool)).toLocaleString(undefined, { maximumFractionDigits: 2 })} STT`} />
                  <StatItem label="Directional Odds Weight" value={`UP ${oddsUpPct} • DOWN ${oddsDownPct}`} />
                  
                  <StatItem 
                    label="UP Pool Allocation" 
                    value={`${Number(formatEther(currentRound.upPool)).toLocaleString(undefined, { maximumFractionDigits: 2 })} STT`} 
                    icon={<TrendingUp className="h-3 w-3 text-emerald-400 inline ml-1" />}
                  />
                  <StatItem 
                    label="DOWN Pool Allocation" 
                    value={`${Number(formatEther(currentRound.downPool)).toLocaleString(undefined, { maximumFractionDigits: 2 })} STT`} 
                    icon={<TrendingDown className="h-3 w-3 text-rose-400 inline ml-1" />}
                  />
                  <StatItem 
                    label="Round Settlement Outcome" 
                    value={currentRound.status === 2 ? (currentRound.upWon ? "🟩 UP WON" : "🟥 DOWN WON") : "Awaiting Settlement"} 
                  />
                </div>

                {/* UP vs DOWN line graph (replaces static percentage bar) */}
                <div className="space-y-3 rounded-xl border border-white/[0.03] bg-black/20 p-3.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-purple-400" />
                      UP vs DOWN pool share
                    </span>
                    <span className="font-mono text-[9px] text-gray-400">Live line trend</span>
                  </div>
                  <div className="w-full overflow-hidden rounded-lg border border-white/[0.02] bg-black/30 p-3">
                    <MarketOddsHistoryChart
                      series={oddsSeries}
                      yesLabel="UP"
                      noLabel="DOWN"
                      variant="embedded"
                    />
                  </div>
                </div>

                {/* Clock parameter row card */}
                <div className="rounded-xl border border-white/[0.03] bg-black/20 p-3.5 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Round Start</div>
                    <div className="text-xs font-bold text-gray-300 font-mono mt-0.5">{fmtTs(currentRound.startTimestamp)}</div>
                  </div>
                  <div className="border-x border-white/[0.04]">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Lock Target</div>
                    <div className="text-xs font-bold text-gray-300 font-mono mt-0.5">{fmtTs(currentRound.startTimestamp)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Expiration Close</div>
                    <div className="text-xs font-bold text-gray-300 font-mono mt-0.5">{fmtTs(currentRound.closeTimestamp)}</div>
                  </div>
                </div>

                {/* Oracle Pricing Parameters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Lock Target Oracle Value</div>
                    <div className="text-lg font-black tracking-tight font-mono text-gray-200 mt-0.5">{fmtPrice(currentRound.lockPrice)}</div>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 shadow-sm">
                    <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Settle Output Oracle Value</div>
                    <div className="text-lg font-black tracking-tight font-mono text-gray-200 mt-0.5">{fmtPrice(currentRound.closePrice)}</div>
                  </div>
                </div>

                {/* Admin Management Interface (Conditional) */}
                {isOwner && (
                  <div className="border border-purple-500/10 bg-purple-500/[0.01] rounded-xl p-4 space-y-3.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">Administrative Orchestrator Nodes Only</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                      {currentRound.epoch === 0n && (
                        <button
                          onClick={doStartRound}
                          disabled={startRoundTx.isPending || startRoundTx.isConfirming}
                          className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 tracking-wide shadow-md transition-all disabled:opacity-40"
                        >
                          {startRoundTx.isPending || startRoundTx.isConfirming ? "Broadcasting Initialization..." : "Execute Genesis Round"}
                        </button>
                      )}

                      <button
                        onClick={doRequestClose}
                        disabled={
                          closeTx.isPending ||
                          closeTx.isConfirming ||
                          currentRound.lockPrice === 0n ||
                          currentRound.closePrice !== 0n ||
                          BigInt(Math.floor(Date.now() / 1000)) < currentRound.closeTimestamp
                        }
                        className="flex-1 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs py-2.5 tracking-wide transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        {closeTx.isPending || closeTx.isConfirming ? "Pulling Oracle Verification..." : "Broadcast Close Price Sync Request"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns (Span 1): Input Deck, Bidding Actions & Personal Positions */}
        <div className="space-y-6">
          
          {/* 1. PLACE BET MODULE */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.04] mb-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-purple-400" />
                <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Place Arena Position</h2>
              </div>
              <button
                onClick={doRefetchAll}
                className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-sm"
                title="Force update rates"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Allocation Capital (STT)</span>
                  {!betState.canBet && betState.reason && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
                      Bidding Paused
                    </span>
                  )}
                </div>
                
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={amountEth}
                    onChange={(e) => setAmountEth(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white font-bold font-mono outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/10 transition-all placeholder:text-gray-700 shadow-inner"
                    placeholder="0.01"
                    min="0"
                    step="0.01"
                    disabled={!betState.canBet}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-gray-500">STT</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={() => doBet("UP")}
                  disabled={!isConnected || !betState.canBet || betUp.isPending || betUp.isConfirming}
                  className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/20 to-emerald-500/[0.02] hover:from-emerald-500/25 py-3 text-emerald-400 text-xs font-black tracking-widest uppercase shadow-md transition-all active:scale-[0.99] disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <TrendingUp className="h-4 w-4" />
                  {betUp.isPending || betUp.isConfirming ? "Processing call..." : "Predict Market UP"}
                </button>
                <button
                  onClick={() => doBet("DOWN")}
                  disabled={!isConnected || !betState.canBet || betDown.isPending || betDown.isConfirming}
                  className="w-full rounded-xl border border-rose-500/30 bg-gradient-to-b from-rose-500/20 to-rose-500/[0.02] hover:from-rose-500/25 py-3 text-rose-400 text-xs font-black tracking-widest uppercase shadow-md transition-all active:scale-[0.99] disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <TrendingDown className="h-4 w-4" />
                  {betDown.isPending || betDown.isConfirming ? "Processing put..." : "Predict Market DOWN"}
                </button>
              </div>

              {!betState.canBet && betState.reason && (
                <div className="text-[10px] bg-amber-500/5 border border-amber-500/10 text-amber-400 p-2.5 rounded-lg leading-relaxed font-medium">
                  {betState.reason}
                </div>
              )}

              {actionError && (
                <div className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 px-3 py-2.5 rounded-xl">
                  Error: {actionError}
                </div>
              )}
            </div>
          </div>

          {/* 2. ACCOUNT PORTFOLIO MODULE */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-b from-[#0c0c16] to-[#040409] p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.04] mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-purple-400" />
                <h2 className="text-white font-black tracking-tight text-sm uppercase tracking-wide">Account Portfolio Position</h2>
              </div>
            </div>

            {!isConnected ? (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-xl p-4 bg-black/10">
                <HelpCircle className="h-5 w-5 text-gray-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-400">Web3 Signature Nodes Disconnected</p>
                <p className="text-[10px] text-gray-500 mt-1">Connect your wallet account profile to index position records.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <PositionStatItem label="Active Epoch Pointer" value={currentEpoch ? `#${currentEpoch.toString()}` : "—"} />
                  <PositionStatItem 
                    label="Direction Pool Side" 
                    value={userBet && userBet.amount > 0n ? (userBet.position === 0 ? "🟩 UP" : "🟥 DOWN") : "—"} 
                  />
                </div>

                <PositionStatItem 
                  label="Allocated Capital Principal" 
                  value={userBet && userBet.amount > 0n ? `${Number(formatEther(userBet.amount)).toLocaleString()} STT` : "—"} 
                />
                <PositionStatItem label="Position Execution Result" value={positionResult} />
                
                <div className="grid grid-cols-2 gap-2.5">
                  <PositionStatItem label="Settlement Claimed" value={userBet && userBet.amount > 0n ? (userBet.claimed ? "Completed" : "Unclaimed") : "—"} />
                  <PositionStatItem 
                    label="Claimable Redemptions" 
                    value={`${Number(formatEther(claimable)).toLocaleString()} STT`} 
                    isVibrant={claimable > 0n} 
                  />
                </div>

                <button
                  onClick={doClaimCurrent}
                  disabled={!userBet || userBet.claimed || claimable === 0n || claim.isPending || claim.isConfirming}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-black tracking-widest uppercase py-3.5 shadow-lg shadow-purple-600/10 disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100 transition-all mt-2"
                >
                  {claim.isPending || claim.isConfirming ? "Broadcasting Settlement Proof..." : "Execute Settle Claim Redemption"}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ==================== SUB-COMPONENTS FOR LAYOUT UNIFORMITY ==================== */

function StatItem({ label, value, isHighlight = false, icon = null }: { label: string; value: string; isHighlight?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.03] bg-white/[0.01] p-3 shadow-inner">
      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
      <p className={`text-sm tracking-tight font-black mt-1 truncate ${isHighlight ? 'text-purple-400 font-mono' : 'text-gray-200'}`}>
        {value}
        {icon}
      </p>
    </div>
  );
}

function PositionStatItem({ label, value, isVibrant = false }: { label: string; value: string; isVibrant?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/40 p-3 shadow-inner">
      <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
      <p className={`text-xs font-extrabold mt-0.5 truncate ${isVibrant ? 'text-emerald-400 font-mono text-sm' : 'text-gray-300'}`}>
        {value}
      </p>
    </div>
  );
}