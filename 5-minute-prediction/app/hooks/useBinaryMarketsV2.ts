"use client";

import { useEffect, useMemo, useState } from "react";
import { type Address, type Abi } from "viem";
import { useChainId, usePublicClient, useReadContract } from "wagmi";
import { getBinaryV2Addresses } from "@/app/config/binary_contracts";
import { MarketFactoryV2ABI } from "@/app/config/binary_abi";

export type BinaryMetric = "VIEWS" | "LIKES" | "RETWEETS" | "COMMENTS";
export type BinaryMarketStatus = "active" | "resolved_yes" | "resolved_no";

export type BinaryTweetData = {
  tweetId: string;
  tweetUrl: string;
  tweetText: string;
  authorHandle: string;
  authorName: string;
  avatarUrl: string;
  mediaJson: string;
  hasQuotedTweet: boolean;
  quotedTweetId: string;
  quotedTweetText: string;
  quotedAuthorHandle: string;
  quotedAuthorName: string;
};

export type BinaryMarketV2 = {
  marketId: bigint;
  tweet: BinaryTweetData;
  category: string;
  metric: BinaryMetric;
  targetValue: bigint;
  startTime: bigint;
  endTime: bigint;
  status: BinaryMarketStatus;
  currentValue: bigint;
  yesTokenId: bigint;
  noTokenId: bigint;
  yesReserve: bigint;
  noReserve: bigint;
  totalVolume: bigint;
  tradeCount: bigint;
  creator: Address;
  yesOdds: number; // 0-100
  noOdds: number; // 0-100
};

function metricFromEnum(value: number): BinaryMetric {
  switch (value) {
    case 0:
      return "VIEWS";
    case 1:
      return "LIKES";
    case 2:
      return "RETWEETS";
    case 3:
      return "COMMENTS";
    default:
      return "VIEWS";
  }
}

function statusFromEnum(value: number): BinaryMarketStatus {
  switch (value) {
    case 0:
      return "active";
    case 1:
      return "resolved_yes";
    case 2:
      return "resolved_no";
    default:
      return "active";
  }
}

function oddsFromReserves(yesReserve: bigint, noReserve: bigint): { yesOdds: number; noOdds: number } {
  const total = yesReserve + noReserve;
  if (total === 0n) return { yesOdds: 50, noOdds: 50 };
  const yes = Number((yesReserve * 100n) / total);
  const no = 100 - yes;
  return { yesOdds: Math.max(0, Math.min(100, yes)), noOdds: Math.max(0, Math.min(100, no)) };
}

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseMarketTuple(marketId: bigint, raw: unknown): BinaryMarketV2 | null {
  // Expected shape matches `markets(uint256)` outputs in MarketFactoryV2
  if (!raw || !Array.isArray(raw) || raw.length < 15) return null;

  const tweetVal = raw[0] as unknown;
  const tweetObj =
    tweetVal && typeof tweetVal === "object" && !Array.isArray(tweetVal)
      ? (tweetVal as Record<string, unknown>)
      : null;
  const tweetArr = Array.isArray(tweetVal) ? (tweetVal as unknown[]) : null;

  const yesReserve = toBigInt(raw[10]);
  const noReserve = toBigInt(raw[11]);
  const odds = oddsFromReserves(yesReserve, noReserve);

  return {
    marketId,
    tweet: {
      tweetId: toStringValue(tweetObj?.tweetId ?? tweetArr?.[0]),
      tweetUrl: toStringValue(tweetObj?.tweetUrl ?? tweetArr?.[1]),
      tweetText: toStringValue(tweetObj?.tweetText ?? tweetArr?.[2]),
      authorHandle: toStringValue(tweetObj?.authorHandle ?? tweetArr?.[3]),
      authorName: toStringValue(tweetObj?.authorName ?? tweetArr?.[4]),
      avatarUrl: toStringValue(tweetObj?.avatarUrl ?? tweetArr?.[5]),
      mediaJson: toStringValue(tweetObj?.mediaJson ?? tweetArr?.[6]),
      hasQuotedTweet: Boolean((tweetObj?.hasQuotedTweet ?? tweetArr?.[7]) ?? false),
      quotedTweetId: toStringValue(tweetObj?.quotedTweetId ?? tweetArr?.[8]),
      quotedTweetText: toStringValue(tweetObj?.quotedTweetText ?? tweetArr?.[9]),
      quotedAuthorHandle: toStringValue(tweetObj?.quotedAuthorHandle ?? tweetArr?.[10]),
      quotedAuthorName: toStringValue(tweetObj?.quotedAuthorName ?? tweetArr?.[11]),
    },
    category: toStringValue(raw[1]),
    metric: metricFromEnum(Number(raw[2] ?? 0)),
    targetValue: toBigInt(raw[3]),
    startTime: toBigInt(raw[4]),
    endTime: toBigInt(raw[5]),
    status: statusFromEnum(Number(raw[6] ?? 0)),
    currentValue: toBigInt(raw[7]),
    yesTokenId: toBigInt(raw[8]),
    noTokenId: toBigInt(raw[9]),
    yesReserve,
    noReserve,
    totalVolume: toBigInt(raw[12]),
    tradeCount: toBigInt(raw[13]),
    creator: raw[14] as Address,
    ...odds,
  };
}

export function useBinaryMarketCountV2(enabled = true) {
  const chainId = useChainId();
  const addresses = getBinaryV2Addresses(chainId);

  return useReadContract({
    address: addresses?.marketFactory,
    abi: MarketFactoryV2ABI as unknown as Abi,
    functionName: "marketCount",
    query: { enabled: enabled && !!addresses?.marketFactory },
  });
}

export function useBinaryMarketV2(marketId?: bigint, enabled = true) {
  const chainId = useChainId();
  const addresses = getBinaryV2Addresses(chainId);

  const read = useReadContract({
    address: addresses?.marketFactory,
    abi: MarketFactoryV2ABI as unknown as Abi,
    functionName: "markets",
    args: marketId !== undefined ? [marketId] : undefined,
    query: { enabled: enabled && !!addresses?.marketFactory && marketId !== undefined },
  });

  const market = useMemo(() => {
    if (marketId === undefined || !read.data) return null;
    return parseMarketTuple(marketId, read.data);
  }, [marketId, read.data]);

  return { ...read, market };
}

export function useBinaryMarketsV2(enabled = true) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const addresses = getBinaryV2Addresses(chainId);

  const marketCount = useBinaryMarketCountV2(enabled);

  const [markets, setMarkets] = useState<BinaryMarketV2[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const factory = addresses?.marketFactory;
    const countRaw = marketCount.data;

    if (!enabled || !factory || !publicClient || countRaw === undefined) return;

    const count = Number(countRaw);
    if (!Number.isFinite(count) || count < 0) return;

    // Avoid accidental UI lockups if `marketCount` is huge.
    const capped = Math.min(count, 200);

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const ids = Array.from({ length: capped }, (_, i) => BigInt(i));

        const results = await Promise.all(
          ids.map(async (id) => {
            const raw = await publicClient.readContract({
              address: factory,
              abi: MarketFactoryV2ABI as unknown as Abi,
              functionName: "markets",
              args: [id],
            });
            return parseMarketTuple(id, raw);
          })
        );

        if (cancelled) return;
        setMarkets(results.filter((m): m is BinaryMarketV2 => !!m));
      } catch (e) {
        if (cancelled) return;
        setMarkets([]);
        setError(e instanceof Error ? e : new Error("Failed to fetch binary markets"));
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addresses?.marketFactory, enabled, marketCount.data, publicClient]);

  return {
    markets,
    marketCount: marketCount.data,
    isLoading: marketCount.isLoading || isLoading,
    error: marketCount.error || error,
    refetch: marketCount.refetch,
  };
}

