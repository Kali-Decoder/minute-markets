"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Address, Hash } from "viem";
import { somniaTestnet } from "@/app/config/chains";
import { PredictionMarketABI } from "@/app/config/predictionMarketAbi";
import { useTxToast } from "@/app/hooks/useTxToast";

export type Round = {
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
};

export type BetInfo = {
  position: number;
  amount: bigint;
  claimed: boolean;
};

function useEnsureSomniaTestnet() {
  const chainId = useChainId();
  return useMemo(() => {
    if (chainId !== somniaTestnet.id) {
      return `Please switch to ${somniaTestnet.name} (Chain ID: ${somniaTestnet.id}) to continue.`;
    }
    return null;
  }, [chainId]);
}

export function useMarketMeta(market?: Address, enabled = true) {
  const marketName = useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "marketName",
    query: { enabled: enabled && !!market },
  });
  const marketSymbol = useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "marketSymbol",
    query: { enabled: enabled && !!market },
  });
  const coinId = useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "coinId",
    query: { enabled: enabled && !!market },
  });

  return { marketName, marketSymbol, coinId };
}

export function useMarketOwner(market?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "owner",
    query: { enabled: enabled && !!market },
  });
}

export function useMarketCurrentEpoch(market?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "currentEpoch",
    query: { enabled: enabled && !!market },
  });
}

export function useMarketCurrentRound(market?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "getCurrentRound",
    query: { enabled: enabled && !!market },
  });
}

export function useMarketRound(market?: Address, epoch?: bigint, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "getRound",
    args: typeof epoch === "bigint" ? [epoch] : undefined,
    query: { enabled: enabled && !!market && typeof epoch === "bigint" },
  });
}

export function useMarketUserBet(market?: Address, epoch?: bigint, user?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "getUserBet",
    args: market && typeof epoch === "bigint" && user ? [epoch, user] : undefined,
    query: { enabled: enabled && !!market && typeof epoch === "bigint" && !!user },
  });
}

export function useMarketContractBalance(market?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "getContractBalance",
    query: { enabled: enabled && !!market },
  });
}

export function useMarketBetUp(market?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const chainError = useEnsureSomniaTestnet();
  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

  useTxToast({ hash, isConfirmed, error, label: "Bet up" });

  const betUp = async (params: { epoch: bigint; value: bigint }): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainError) throw new Error(chainError);
    if (!market) throw new Error("Market address is required.");
    if (params.value <= 0n) throw new Error("Bet amount must be greater than 0.");
    return writeContractAsync({
      address: market,
      abi: PredictionMarketABI,
      functionName: "betUp",
      args: [params.epoch],
      value: params.value,
    });
  };

  return { betUp, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}

export function useMarketBetDown(market?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const chainError = useEnsureSomniaTestnet();
  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

  useTxToast({ hash, isConfirmed, error, label: "Bet down" });

  const betDown = async (params: { epoch: bigint; value: bigint }): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainError) throw new Error(chainError);
    if (!market) throw new Error("Market address is required.");
    if (params.value <= 0n) throw new Error("Bet amount must be greater than 0.");
    return writeContractAsync({
      address: market,
      abi: PredictionMarketABI,
      functionName: "betDown",
      args: [params.epoch],
      value: params.value,
    });
  };

  return { betDown, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}

export function useMarketClaim(market?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const chainError = useEnsureSomniaTestnet();
  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

  useTxToast({ hash, isConfirmed, error, label: "Claim" });

  const claim = async (epochs: bigint[]): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainError) throw new Error(chainError);
    if (!market) throw new Error("Market address is required.");
    if (!epochs.length) throw new Error("At least one epoch is required.");
    return writeContractAsync({
      address: market,
      abi: PredictionMarketABI,
      functionName: "claim",
      args: [epochs],
    });
  };

  return { claim, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}

export function useMarketStartRound(market?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const chainError = useEnsureSomniaTestnet();
  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  const { data: depositRaw } = useMarketRequestDeposit(market, true);
  const deposit = typeof depositRaw === "bigint" ? depositRaw : undefined;

  useTxToast({ hash, isConfirmed, error, label: "Start round" });

  const startRound = async (): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainError) throw new Error(chainError);
    if (!market) throw new Error("Market address is required.");
    if (!deposit) throw new Error("Required deposit not loaded yet.");
    return writeContractAsync({
      address: market,
      abi: PredictionMarketABI,
      functionName: "startRound"
    });
  };

  return { startRound, deposit, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}

export function useMarketRequestDeposit(market?: Address, enabled = true) {
  return useReadContract({
    address: market,
    abi: PredictionMarketABI,
    functionName: "REQUEST_DEPOSIT",
    query: { enabled: enabled && !!market },
  });
}

export function useMarketRequestClosePrice(market?: Address) {
  const { address: userAddress, isConnected } = useAccount();
  const chainError = useEnsureSomniaTestnet();
  const { data: depositRaw } = useMarketRequestDeposit(market, true);
  const deposit = typeof depositRaw === "bigint" ? depositRaw : undefined;

  const { writeContractAsync, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });

  useTxToast({ hash, isConfirmed, error, label: "Request close price" });

  const requestClosePrice = async (epoch: bigint): Promise<Hash> => {
    if (!isConnected || !userAddress) throw new Error("Please connect your wallet to continue.");
    if (chainError) throw new Error(chainError);
    if (!market) throw new Error("Market address is required.");
    if (!deposit) throw new Error("Required deposit not loaded yet.");
    return writeContractAsync({
      address: market,
      abi: PredictionMarketABI,
      functionName: "requestClosePrice",
      args: [epoch],
      value: deposit,
    });
  };

  return { requestClosePrice, deposit, hash, error, isPending, isConfirming, isConfirmed, receipt, reset };
}
