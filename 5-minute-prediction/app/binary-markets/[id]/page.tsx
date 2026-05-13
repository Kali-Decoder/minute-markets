"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Users, DollarSign, Activity, Eye, Heart, Repeat2, MessageCircle, Twitter, ExternalLink } from "lucide-react";
import { useState, useMemo, type ComponentType } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, type Abi } from "viem";
import { useBinaryMarketV2 } from "@/app/hooks/useBinaryMarketsV2";
import { getBinaryV2Addresses, BINARY_V2_CHAIN_ID } from "@/app/config/binary_contracts";
import { MarketFactoryV2ABI, MockUSDCABI, ShareTokenABI } from "@/app/config/binary_abi";

function formatCompactUSD(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function formatTimeLeftSeconds(endTimeSec: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (endTimeSec <= now) return "Ended";
  const diff = endTimeSec - now;
  const hours = Number(diff / BigInt(3600));
  const minutes = Number((diff % BigInt(3600)) / BigInt(60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "VIEWS":
      return Eye;
    case "LIKES":
      return Heart;
    case "RETWEETS":
      return Repeat2;
    case "COMMENTS":
      return MessageCircle;
    default:
      return Activity;
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const generateChartData = (currentYesOdds: number) => {
  const data = [];
  const days = 30;
  
  for (let i = days; i >= 0; i--) {
    const variance = Math.random() * 10 - 5;
    const yesOdds = Math.max(20, Math.min(80, currentYesOdds + variance - (i / 3)));
    
    data.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      yesOdds: parseFloat(yesOdds.toFixed(1)),
      noOdds: parseFloat((100 - yesOdds).toFixed(1)),
    });
  }
  
  return data;
};

const generateRecentTrades = () => [
  { id: 1, user: "0x1234...5678", side: "YES", amount: "$500", shares: "694", time: "2 min ago" },
  { id: 2, user: "0xabcd...ef01", side: "NO", amount: "$1,200", shares: "4,286", time: "5 min ago" },
  { id: 3, user: "0x9876...5432", side: "YES", amount: "$250", shares: "347", time: "12 min ago" },
  { id: 4, user: "0x2468...1357", side: "YES", amount: "$800", shares: "1,111", time: "18 min ago" },
  { id: 5, user: "0xfedc...ba98", side: "NO", amount: "$350", shares: "1,250", time: "25 min ago" },
];

export default function BinaryMarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  
  const marketIdBig = useMemo(() => {
    try {
      return BigInt(marketId);
    } catch {
      return undefined;
    }
  }, [marketId]);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const addresses = getBinaryV2Addresses(chainId);

  const { market: onchainMarket, isLoading: isLoadingMarket, error: marketError } = useBinaryMarketV2(marketIdBig, true);

  const MetricIcon = getMetricIcon(onchainMarket?.metric || "VIEWS");

  const targetValue = Number(onchainMarket?.targetValue ?? BigInt(0));
  const currentValue = Number(onchainMarket?.currentValue ?? BigInt(0));
  const progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
  
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usdcAmount = useMemo(() => {
    try {
      if (!amount) return BigInt(0);
      return parseUnits(amount, 6);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  const { data: allowance } = useReadContract({
    address: addresses?.mockUSDC,
    abi: MockUSDCABI as unknown as Abi,
    functionName: "allowance",
    args: address && addresses?.marketFactory ? [address, addresses.marketFactory] : undefined,
    query: { enabled: !!addresses?.mockUSDC && !!addresses?.marketFactory && !!address },
  });

  const { data: usdcBalance } = useReadContract({
    address: addresses?.mockUSDC,
    abi: MockUSDCABI as unknown as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!addresses?.mockUSDC && !!address },
  });

  const { data: yesShares } = useReadContract({
    address: addresses?.shareToken,
    abi: ShareTokenABI as unknown as Abi,
    functionName: "balanceOf",
    args: address && onchainMarket ? [address, onchainMarket.yesTokenId] : undefined,
    query: { enabled: !!addresses?.shareToken && !!address && !!onchainMarket },
  });

  const { data: noShares } = useReadContract({
    address: addresses?.shareToken,
    abi: ShareTokenABI as unknown as Abi,
    functionName: "balanceOf",
    args: address && onchainMarket ? [address, onchainMarket.noTokenId] : undefined,
    query: { enabled: !!addresses?.shareToken && !!address && !!onchainMarket },
  });

  const { writeContractAsync } = useWriteContract();
  
  const yesOdds = onchainMarket?.yesOdds ?? 50;
  const noOdds = onchainMarket?.noOdds ?? 50;

  const yesSharePrice = yesOdds / 100;
  const noSharePrice = noOdds / 100;

  const chartData = useMemo(() => generateChartData(yesOdds), [yesOdds]);
  const recentTrades = useMemo(() => generateRecentTrades(), []);
  
  const estimatedShares = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return "0";
    const sharePrice = selectedSide === "YES" ? yesSharePrice : noSharePrice;
    if (sharePrice <= 0) return "0";
    const shares = parseFloat(amount) / sharePrice;
    return shares.toFixed(2);
  }, [amount, selectedSide, yesSharePrice, noSharePrice]);
  
  const potentialReturn = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return "0";
    const invested = parseFloat(amount);
    const shares = parseFloat(estimatedShares);
    const potentialPayout = shares * 1.0;
    const profit = potentialPayout - invested;
    return profit.toFixed(2);
  }, [amount, estimatedShares]);
  
  const handleMintTestUSDC = async () => {
    if (!isConnected || !address) {
      alert("Connect your wallet first.");
      return;
    }
    if (!addresses?.mockUSDC) {
      alert("USDC contract not configured for this chain.");
      return;
    }
    if (chainId !== BINARY_V2_CHAIN_ID) {
      alert(`Please switch to Somnia Testnet (Chain ID: ${BINARY_V2_CHAIN_ID}).`);
      return;
    }
    if (!publicClient) return;

    setIsSubmitting(true);
    setTxError(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.mockUSDC,
        abi: MockUSDCABI as unknown as Abi,
        functionName: "mint",
        args: [address, parseUnits("1000", 6)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "Failed to mint test USDC");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuy = async () => {
    if (!onchainMarket || marketIdBig === undefined) {
      alert("Market not loaded yet.");
      return;
    }

    if (!isConnected || !address) {
      alert("Connect your wallet first.");
      return;
    }

    if (chainId !== BINARY_V2_CHAIN_ID) {
      alert(`Please switch to Somnia Testnet (Chain ID: ${BINARY_V2_CHAIN_ID}).`);
      return;
    }

    if (!addresses?.marketFactory || !addresses?.mockUSDC) {
      alert("Binary contracts not configured for this chain.");
      return;
    }

    if (usdcAmount <= BigInt(0)) {
      alert("Please enter a valid amount");
      return;
    }

    if (!publicClient) return;

    setIsSubmitting(true);
    setTxError(null);
    try {
      const currentAllowance = typeof allowance === "bigint" ? allowance : BigInt(0);
      if (currentAllowance < usdcAmount) {
        const approveHash = await writeContractAsync({
          address: addresses.mockUSDC,
          abi: MockUSDCABI as unknown as Abi,
          functionName: "approve",
          args: [addresses.marketFactory, usdcAmount],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const fn = selectedSide === "YES" ? "buyYes" : "buyNo";
      const buyHash = await writeContractAsync({
        address: addresses.marketFactory,
        abi: MarketFactoryV2ABI as unknown as Abi,
        functionName: fn,
        args: [onchainMarket.marketId, usdcAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setAmount("");
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-6">
        <Link
          href="/binary-markets"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Markets</span>
        </Link>

        {isLoadingMarket ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading market…</p>
          </div>
        ) : marketError || !onchainMarket ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Failed to load this market from chain.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tweet Card */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                <span className="text-sm font-semibold text-gray-400">Twitter Prediction Market</span>
                <a 
                  href={onchainMarket.tweet.tweetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-[#1DA1F2] hover:text-[#1a8cd8] text-sm"
                >
                  View on Twitter
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div className="h-12 w-12 rounded-full bg-monad-purple/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {onchainMarket.tweet.avatarUrl ? (
                    <img src={onchainMarket.tweet.avatarUrl} alt={onchainMarket.tweet.authorName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-monad-purple">
                      {onchainMarket.tweet.authorName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{onchainMarket.tweet.authorName}</span>
                    <span className="text-sm text-gray-500">@{onchainMarket.tweet.authorHandle}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {onchainMarket.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      onchainMarket.status === "active"
                        ? "text-green-400 bg-green-600/10"
                        : "text-gray-400 bg-white/5"
                    }`}>
                      {onchainMarket.status === "active" ? "active" : "resolved"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tweet Text */}
              <p className="text-base text-white leading-relaxed mb-6">
                {onchainMarket.tweet.tweetText}
              </p>

              {/* Metric Progress */}
              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MetricIcon className="h-5 w-5 text-monad-purple" />
                    <span className="text-sm font-semibold text-white">
                      Target: {formatNumber(Number(onchainMarket.targetValue))} {onchainMarket.metric}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400">
                    Current: {formatNumber(Number(onchainMarket.currentValue))}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-monad-purple to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {progress.toFixed(1)}% of target reached
                </div>
              </div>
              
              {/* Market Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
                <StatCard
                  icon={DollarSign}
                  label="Volume"
                  value={formatCompactUSD(Number(formatUnits(onchainMarket.totalVolume, 6)))}
                />
                <StatCard icon={Users} label="Trades" value={Number(onchainMarket.tradeCount).toLocaleString()} />
                <StatCard
                  icon={Activity}
                  label="Liquidity"
                  value={formatCompactUSD(Number(formatUnits(onchainMarket.yesReserve + onchainMarket.noReserve, 6)))}
                />
                <StatCard icon={Clock} label="Ends" value={formatTimeLeftSeconds(onchainMarket.endTime)} />
              </div>
            </div>

            {/* Chart */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Odds History</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400">YES</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-400">NO</span>
                  </div>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorYes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #ffffff20',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => {
                      const safeValue = value ?? 0;
                      const label = name === 'yesOdds' ? 'YES' : 'NO';
                      return [`${safeValue}%`, label];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="yesOdds" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#colorYes)"
                    name="yesOdds"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="noOdds" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    fill="url(#colorNo)"
                    name="noOdds"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Trades */}
            <div className="bg-surface border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        trade.side === "YES" 
                          ? "bg-green-600/20 text-green-400" 
                          : "bg-red-600/20 text-red-400"
                      }`}>
                        {trade.side}
                      </span>
                      <span className="text-sm text-gray-400 font-mono">{trade.user}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-white font-semibold">{trade.amount}</span>
                      <span className="text-gray-500">{trade.shares} shares</span>
                      <span className="text-gray-500 text-xs">{trade.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trading Panel - Right Side */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Current Odds */}
              <div className="bg-surface border border-white/5 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Current Odds</h2>
                
                <div className="space-y-3">
                  <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">YES</span>
                      <TrendingUp className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-bold text-green-400 mb-1">{yesOdds}%</div>
                    <div className="text-xs text-gray-400">${yesSharePrice.toFixed(2)} per share</div>
                  </div>
                  
                  <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">NO</span>
                      <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="text-2xl font-bold text-red-400 mb-1">{noOdds}%</div>
                    <div className="text-xs text-gray-400">${noSharePrice.toFixed(2)} per share</div>
                  </div>
                </div>
              </div>

              {/* Buy Interface */}
              <div className="bg-surface border border-white/5 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Place Your Bet</h2>
                
                {/* Side Selection */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => setSelectedSide("YES")}
                    className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                      selectedSide === "YES"
                        ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setSelectedSide("NO")}
                    className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                      selectedSide === "NO"
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    NO
                  </button>
                </div>

                {/* Amount Input */}
                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-2 block">Amount (USDC)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 outline-none focus:border-monad-purple/50 focus:ring-1 focus:ring-monad-purple/50 transition-all"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                    <span>
                      Balance:{" "}
                      {usdcBalance !== undefined ? formatCompactUSD(Number(formatUnits(usdcBalance as bigint, 6))) : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={handleMintTestUSDC}
                      disabled={isSubmitting}
                      className="text-monad-purple hover:text-white transition-colors"
                    >
                      Mint 1,000 test USDC
                    </button>
                  </div>
                </div>

                {/* Estimated Returns */}
                <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Shares</span>
                    <span className="text-white font-semibold">{estimatedShares}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Share Price</span>
                    <span className="text-white font-semibold">
                      ${selectedSide === "YES" ? yesSharePrice.toFixed(2) : noSharePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-gray-400">Potential Profit</span>
                    <span className={`font-bold ${parseFloat(potentialReturn) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      ${potentialReturn}
                    </span>
                  </div>
                </div>

                {/* Positions */}
                <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your YES shares</span>
                    <span className="text-white font-semibold">{yesShares !== undefined ? (yesShares as bigint).toString() : "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Your NO shares</span>
                    <span className="text-white font-semibold">{noShares !== undefined ? (noShares as bigint).toString() : "—"}</span>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={handleBuy}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className={`w-full py-4 rounded-lg font-bold text-white transition-all ${
                    selectedSide === "YES"
                      ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30"
                      : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? "Submitting..." : `Buy ${selectedSide} Shares`}
                </button>

                {/* Success Message */}
                {showSuccess && (
                  <div className="mt-4 p-3 bg-monad-purple/10 border border-monad-purple/30 rounded-lg">
                    <p className="text-monad-purple text-sm font-semibold text-center">
                      ✓ Order Placed Successfully!
                    </p>
                  </div>
                )}

                {txError && (
                  <div className="mt-4 p-3 bg-red-600/10 border border-red-600/30 rounded-lg">
                    <p className="text-red-400 text-sm font-semibold">{txError}</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-monad-purple/10 border border-monad-purple/30 rounded-xl p-4">
                <p className="text-xs text-monad-purple font-semibold mb-2">💡 How it works</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Each share pays $1.00 if your prediction is correct. Share prices reflect the current market probability. 
                  The more confident the market is, the higher the price per share.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-monad-purple" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
