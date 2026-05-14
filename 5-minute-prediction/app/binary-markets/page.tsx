"use client";

import Link from "next/link";
import { ArrowLeft, Search, Twitter, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BinaryMarketCard, type BinaryMarketCardProps } from "@/app/components/BinaryMarketCard";
import { useBinaryMarketsV2 } from "@/app/hooks/useBinaryMarketsV2";
import { decodeEventLog, formatUnits, parseUnits, type Abi } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { getBinaryV2Addresses, BINARY_V2_CHAIN_ID } from "@/app/config/binary_contracts";
import { MarketFactoryV2ABI, MockUSDCABI } from "@/app/config/binary_abi";
import { useRouter } from "next/navigation";

type Category = "all" | "crypto" | "memes" | "celebs" | "tech" | "sports";
type Metric = "VIEWS" | "LIKES" | "RETWEETS" | "COMMENTS";

function formatCompactUSD(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export default function BinaryMarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const addresses = getBinaryV2Addresses(chainId);

  const { markets, isLoading, error, refetch } = useBinaryMarketsV2(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tweetId: "",
    tweetUrl: "",
    tweetText: "",
    authorHandle: "",
    authorName: "",
    avatarUrl: "",
    mediaJson: "[]",
    hasQuotedTweet: false,
    quotedTweetId: "",
    quotedTweetText: "",
    quotedAuthorHandle: "",
    quotedAuthorName: "",
    category: "Crypto",
    metric: "VIEWS" as Metric,
    targetValue: "",
    durationSeconds: "", // empty => 0 (default 24h on contract)
  });

  useEffect(() => {
    if (!isCreateOpen) {
      setCreateError(null);
    }
  }, [isCreateOpen]);

  const metricEnum = useMemo(() => {
    switch (form.metric) {
      case "VIEWS":
        return 0;
      case "LIKES":
        return 1;
      case "RETWEETS":
        return 2;
      case "COMMENTS":
        return 3;
      default:
        return 0;
    }
  }, [form.metric]);

  const { data: initialLiquidity } = useReadContract({
    address: addresses?.marketFactory,
    abi: MarketFactoryV2ABI as unknown as Abi,
    functionName: "INITIAL_LIQUIDITY",
    query: { enabled: !!addresses?.marketFactory },
  });

  const requiredLiquidity = typeof initialLiquidity === "bigint" ? initialLiquidity : undefined;

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

  const handleMintTestUSDC = async () => {
    if (!isConnected || !address) {
      setCreateError("Connect your wallet first.");
      return;
    }
    if (!addresses?.mockUSDC) {
      setCreateError("USDC contract not configured for this chain.");
      return;
    }
    if (chainId !== BINARY_V2_CHAIN_ID) {
      setCreateError(`Please switch to Somnia Testnet (Chain ID: ${BINARY_V2_CHAIN_ID}).`);
      return;
    }
    if (!publicClient) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      const hash = await writeContractAsync({
        address: addresses.mockUSDC,
        abi: MockUSDCABI as unknown as Abi,
        functionName: "mint",
        args: [address, parseUnits("1000", 6)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to mint test USDC");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateMarket = async () => {
    if (!isConnected || !address) {
      setCreateError("Connect your wallet first.");
      return;
    }
    if (chainId !== BINARY_V2_CHAIN_ID) {
      setCreateError(`Please switch to Somnia Testnet (Chain ID: ${BINARY_V2_CHAIN_ID}).`);
      return;
    }
    if (!addresses?.marketFactory || !addresses?.mockUSDC) {
      setCreateError("Binary contracts not configured for this chain.");
      return;
    }
    if (!publicClient) return;

    const target = form.targetValue.trim();
    if (!form.tweetId.trim()) return setCreateError("Tweet ID is required.");
    if (!form.tweetUrl.trim()) return setCreateError("Tweet URL is required.");
    if (!form.tweetText.trim()) return setCreateError("Tweet text is required.");
    if (!form.authorHandle.trim()) return setCreateError("Author handle is required.");
    if (!form.authorName.trim()) return setCreateError("Author name is required.");
    if (!form.category.trim()) return setCreateError("Category is required.");
    if (!target) return setCreateError("Target value is required.");

    let targetValue: bigint;
    try {
      targetValue = BigInt(target);
      if (targetValue <= BigInt(0)) return setCreateError("Target value must be > 0.");
    } catch {
      return setCreateError("Target value must be an integer.");
    }

    let duration: bigint = BigInt(0);
    const durationStr = form.durationSeconds.trim();
    if (durationStr) {
      try {
        duration = BigInt(durationStr);
      } catch {
        return setCreateError("Duration must be an integer (seconds).");
      }
    }

    if (requiredLiquidity === undefined) {
      return setCreateError("Could not read required initial liquidity from contract.");
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const currentAllowance = typeof allowance === "bigint" ? allowance : BigInt(0);
      if (currentAllowance < requiredLiquidity) {
        const approveHash = await writeContractAsync({
          address: addresses.mockUSDC,
          abi: MockUSDCABI as unknown as Abi,
          functionName: "approve",
          args: [addresses.marketFactory, requiredLiquidity],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const createHash = await writeContractAsync({
        address: addresses.marketFactory,
        abi: MarketFactoryV2ABI as unknown as Abi,
        functionName: "createMarket",
        args: [
          form.tweetId,
          form.tweetUrl,
          form.tweetText,
          form.authorHandle,
          form.authorName,
          form.avatarUrl,
          form.mediaJson,
          form.hasQuotedTweet,
          form.quotedTweetId,
          form.quotedTweetText,
          form.quotedAuthorHandle,
          form.quotedAuthorName,
          form.category,
          metricEnum,
          targetValue,
          duration,
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
      let newMarketId: string | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: MarketFactoryV2ABI as unknown as Abi,
            eventName: "MarketCreated",
            data: log.data,
            topics: log.topics,
          });
          const args = decoded.args as unknown as { marketId?: bigint };
          if (typeof args.marketId === "bigint") {
            newMarketId = args.marketId.toString();
            break;
          }
        } catch {
          continue;
        }
      }

      await refetch();
      setIsCreateOpen(false);

      if (newMarketId) {
        router.push(`/binary-markets/${newMarketId}`);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create market");
    } finally {
      setIsCreating(false);
    }
  };

  const onchainMarkets: BinaryMarketCardProps[] = useMemo(() => {
    return markets.map((m) => {
      const totalVolumeUsd = Number(formatUnits(m.totalVolume, 6));
      const status =
        m.status === "active" ? "active" : "resolved";

      return {
        id: m.marketId.toString(),
        tweetId: m.tweet.tweetId,
        tweetUrl: m.tweet.tweetUrl,
        tweetText: m.tweet.tweetText,
        authorHandle: m.tweet.authorHandle,
        authorName: m.tweet.authorName,
        avatarUrl: m.tweet.avatarUrl || undefined,
        metric: m.metric,
        targetValue: Number(m.targetValue),
        currentValue: Number(m.currentValue),
        yesOdds: m.yesOdds,
        noOdds: m.noOdds,
        totalVolume: formatCompactUSD(totalVolumeUsd),
        participants: Number(m.tradeCount),
        category: m.category || undefined,
        endTime: new Date(Number(m.endTime) * 1000),
        status,
        resolvedOutcome:
          m.status === "resolved_yes" ? "yes" : m.status === "resolved_no" ? "no" : null,
      };
    });
  }, [markets]);

  // Filter markets by category and search query
  const filteredMarkets = useMemo(() => {
    let filtered = onchainMarkets;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (market) => market.category?.toLowerCase() === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (market) =>
          market.tweetText.toLowerCase().includes(query) ||
          market.authorHandle.toLowerCase().includes(query) ||
          market.authorName.toLowerCase().includes(query) ||
          market.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [onchainMarkets, selectedCategory, searchQuery]);

  const categories: { id: Category; label: string }[] = [
    { id: "all", label: "All" },
    { id: "crypto", label: "Crypto" },
    { id: "memes", label: "Memes" },
    { id: "celebs", label: "Celebs" },
    { id: "tech", label: "Tech" },
    { id: "sports", label: "Sports" },
  ];

  const categoryCounts: Record<Category, number> = useMemo(() => {
    const counts: Record<Category, number> = {
      all: onchainMarkets.length,
      crypto: 0,
      memes: 0,
      celebs: 0,
      tech: 0,
      sports: 0,
    };

    for (const market of onchainMarkets) {
      const category = market.category?.toLowerCase() as Category | undefined;
      if (!category || category === "all") continue;
      if (category in counts) counts[category] += 1;
    }

    return counts;
  }, [onchainMarkets]);

  return (
    <div className="py-8">
      <header className="mb-12 max-w-7xl mx-auto px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-start sm:items-center justify-between gap-4 mb-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3">
            <Twitter className="h-8 w-8 text-[#1DA1F2]" />
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Twitter <span className="text-monad-purple">Prediction Markets</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:border-monad-purple/50 hover:bg-white/10 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Market
          </button>
        </div>
        <p className="text-gray-400 text-lg max-w-2xl">
          Predict Twitter engagement metrics. Bet on whether tweets will hit their targets for views, likes, retweets, or comments.
        </p>
      </header>

      {/* Create Market Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => setIsCreateOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">Create Binary Market</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Requires{" "}
                  {requiredLiquidity !== undefined
                    ? `${formatUnits(requiredLiquidity, 6)} USDC`
                    : "… USDC"}{" "}
                  initial liquidity (transferred to contract).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tweet ID" value={form.tweetId} onChange={(v) => setForm((s) => ({ ...s, tweetId: v }))} placeholder="18234567890" />
                <Field label="Category" value={form.category} onChange={(v) => setForm((s) => ({ ...s, category: v }))} placeholder="Crypto" />
              </div>

              <Field label="Tweet URL" value={form.tweetUrl} onChange={(v) => setForm((s) => ({ ...s, tweetUrl: v }))} placeholder="https://twitter.com/..." />
              <Field label="Tweet Text" value={form.tweetText} onChange={(v) => setForm((s) => ({ ...s, tweetText: v }))} placeholder="Tweet text..." textarea />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Author Handle" value={form.authorHandle} onChange={(v) => setForm((s) => ({ ...s, authorHandle: v }))} placeholder="elonmusk" />
                <Field label="Author Name" value={form.authorName} onChange={(v) => setForm((s) => ({ ...s, authorName: v }))} placeholder="Elon Musk" />
              </div>

              <Field label="Avatar URL (optional)" value={form.avatarUrl} onChange={(v) => setForm((s) => ({ ...s, avatarUrl: v }))} placeholder="https://..." />
              <Field label="Media JSON (optional)" value={form.mediaJson} onChange={(v) => setForm((s) => ({ ...s, mediaJson: v }))} placeholder='[{"type":"image","url":"..."}]' />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SelectField
                  label="Metric"
                  value={form.metric}
                  onChange={(v) => setForm((s) => ({ ...s, metric: v }))}
                  options={[
                    { value: "VIEWS", label: "Views" },
                    { value: "LIKES", label: "Likes" },
                    { value: "RETWEETS", label: "Retweets" },
                    { value: "COMMENTS", label: "Comments" },
                  ]}
                />
                <Field
                  label="Target Value"
                  value={form.targetValue}
                  onChange={(v) => setForm((s) => ({ ...s, targetValue: v }))}
                  placeholder="1000000"
                />
                <Field
                  label="Duration (seconds, optional)"
                  value={form.durationSeconds}
                  onChange={(v) => setForm((s) => ({ ...s, durationSeconds: v }))}
                  placeholder="0 (defaults to 24h)"
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-gray-400">
                  Balance:{" "}
                  <span className="text-white font-mono font-semibold">
                    {typeof usdcBalance === "bigint" ? `${formatUnits(usdcBalance, 6)} USDC` : "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleMintTestUSDC}
                  disabled={isCreating}
                  className="text-xs font-semibold text-monad-purple hover:text-white transition-colors"
                >
                  Mint 1,000 test USDC
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="hasQuote"
                  type="checkbox"
                  checked={form.hasQuotedTweet}
                  onChange={(e) => setForm((s) => ({ ...s, hasQuotedTweet: e.target.checked }))}
                  className="h-4 w-4 rounded border border-white/20 bg-white/10"
                />
                <label htmlFor="hasQuote" className="text-sm text-gray-300">
                  Has quoted tweet
                </label>
              </div>

              {form.hasQuotedTweet && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Quoted Tweet ID" value={form.quotedTweetId} onChange={(v) => setForm((s) => ({ ...s, quotedTweetId: v }))} placeholder="..." />
                    <Field label="Quoted Author Handle" value={form.quotedAuthorHandle} onChange={(v) => setForm((s) => ({ ...s, quotedAuthorHandle: v }))} placeholder="..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Quoted Author Name" value={form.quotedAuthorName} onChange={(v) => setForm((s) => ({ ...s, quotedAuthorName: v }))} placeholder="..." />
                    <Field label="Quoted Tweet Text" value={form.quotedTweetText} onChange={(v) => setForm((s) => ({ ...s, quotedTweetText: v }))} placeholder="..." />
                  </div>
                </div>
              )}

              {createError && (
                <div className="rounded-xl border border-red-600/30 bg-red-600/10 p-3">
                  <p className="text-sm text-red-400 font-semibold">{createError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateMarket}
                className="px-4 py-2 rounded-xl bg-monad-purple text-white font-semibold hover:shadow-[0_0_25px_-10px_rgba(135,109,255,0.7)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isCreating ? "Creating..." : "Create Market"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs with Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  px-4 py-2 text-sm font-medium transition-all relative rounded-lg
                  ${
                    selectedCategory === category.id
                      ? "text-white bg-monad-purple/10 border border-monad-purple/30"
                      : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                  }
                `}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{category.label}</span>
                  <span
                    className={`
                      min-w-[1.5rem] h-5 px-2 inline-flex items-center justify-center rounded-full text-[11px] font-semibold
                      ${
                        selectedCategory === category.id
                          ? "bg-monad-purple/20 text-white border border-monad-purple/30"
                          : "bg-white/5 text-gray-300 border border-white/10"
                      }
                    `}
                    aria-label={`${categoryCounts[category.id]} markets`}
                  >
                    {categoryCounts[category.id]}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 ml-auto w-full sm:w-auto">
            <div className="flex items-center relative group flex-1 sm:flex-initial sm:min-w-[300px]">
              <Search className="absolute left-3 h-4 w-4 text-gray-500 group-focus-within:text-monad-purple transition-colors" />
              <input
                type="text"
                placeholder="Search tweets, authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-monad-purple/50 focus:bg-white/10 focus:ring-1 focus:ring-monad-purple/50"
              />
            </div>

            <div className="text-sm text-gray-500 whitespace-nowrap">
              {filteredMarkets.length}{" "}
              {filteredMarkets.length === 1 ? "market" : "markets"}
            </div>
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 px-4 sm:px-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">Loading on-chain markets…</p>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">Failed to load markets from chain.</p>
          </div>
        ) : filteredMarkets.length > 0 ? (
          filteredMarkets.map((market) => (
            <BinaryMarketCard key={market.id} {...market} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-400 text-lg">
              No{" "}
              {selectedCategory === "all"
                ? ""
                : categories.find((c) => c.id === selectedCategory)?.label.toLowerCase()}{" "}
              markets found.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-gray-400 font-semibold">{label}</div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-monad-purple/50 focus:ring-1 focus:ring-monad-purple/50"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 outline-none focus:border-monad-purple/50 focus:ring-1 focus:ring-monad-purple/50"
        />
      )}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-gray-400 font-semibold">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-monad-purple/50 focus:ring-1 focus:ring-monad-purple/50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
