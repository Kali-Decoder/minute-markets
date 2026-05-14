"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address, Hash } from "viem";
import { somniaTestnet } from "@/app/config/chains";
import { PredictionMarketFactoryABI } from "@/app/config/predictionMarketFactoryAbi";
import { getPredictionMarketFactoryAddress } from "@/app/config/predictionAddresses";

export type MarketInfo = {
  marketAddress: Address;
  marketName: string;
  marketSymbol: string;
  coinId: string;
  creator: Address;
  createdAt: bigint;
  active: boolean;
};

export function usePredictionMarketFactoryAddress() {
  const chainId = useChainId();
  return useMemo(() => getPredictionMarketFactoryAddress(chainId), [chainId]);
}

export function usePredictionMarketFactoryGetAllMarkets(enabled = true) {
  const address = usePredictionMarketFactoryAddress();
  return useReadContract({
    address,
    abi: PredictionMarketFactoryABI,
    functionName: "getAllMarkets",
    query: { enabled: enabled && !!address },
  });
}

export function usePredictionMarketFactoryGetMarketInfo(market?: Address, enabled = true) {
  const address = usePredictionMarketFactoryAddress();
  return useReadContract({
    address,
    abi: PredictionMarketFactoryABI,
    functionName: "getMarketInfo",
    args: market ? [market] : undefined,
    query: { enabled: enabled && !!address && !!market },
  });
}

export function usePredictionMarketFactoryCreateMarket() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const factoryAddress = usePredictionMarketFactoryAddress();
  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const createMarket = async (params: { marketName: string; marketSymbol: string; coinId: string }): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainId !== somniaTestnet.id) {
      throw new Error(`Please switch to ${somniaTestnet.name} (Chain ID: ${somniaTestnet.id}) to continue.`);
    }
    if (!factoryAddress) throw new Error("Factory address not configured for this chain.");

    const { marketName, marketSymbol, coinId } = params;
    if (!marketName.trim()) throw new Error("Market name is required.");
    if (!marketSymbol.trim()) throw new Error("Market symbol is required.");
    if (!coinId.trim()) throw new Error("Coin id is required.");

    return writeContractAsync({
      address: factoryAddress,
      abi: PredictionMarketFactoryABI,
      functionName: "createMarket",
      args: [marketName, marketSymbol, coinId],
    });
  };

  return { createMarket, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}

