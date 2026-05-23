'use client';

import { useState, useEffect, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { Address, Abi } from 'viem';
import { PredictionMarketABI } from '../config/abi_config';
import { somniaTestnet } from '../config/chains';
import { useTxToast } from "@/app/hooks/useTxToast";

type UsePredictionMarketConfig = {
    enabled?: boolean;
    chainId?: number;
};

/**
 * Bet structure returned from contract
 */
export interface Bet {
    user: Address;
    amount: bigint;
    predictedValue: bigint;
    rewardAmount: bigint;
    claimed: boolean;
    timestamp: bigint;
}

/**
 * Parsed bet structure with converted values
 */
export interface ParsedBet {
    user: Address;
    amount: string;
    predictedValue: string;
    rewardAmount: string;
    claimed: boolean;
    timestamp: number;
}

/**
 * User bet information
 */
export interface UserBet {
    hasBet: boolean;
    amount: string;
    predictedValue: string;
    rewardAmount: string;
    claimed: boolean;
    timestamp: number;
}

/**
 * Prediction distribution data
 */
export interface PredictionDistribution {
    values: string[];
    counts: string[];
}

/**
 * Hook to place a bet on a prediction market
 */
export function usePredictionMarketPlaceBet(marketAddress?: Address, config: UsePredictionMarketConfig = {}) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { writeContractAsync, data: hash, error, isPending, isSuccess, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
        hash,
    });

    useTxToast({ hash, isConfirmed, error, label: "Place bet" });

    const placeBet = async (predictedValue: bigint, value?: bigint) => {
        if (!isConnected || !address) {
            throw new Error('Please connect your wallet to continue.');
        }

        if (chainId !== somniaTestnet.id) {
            throw new Error(`Please switch to ${somniaTestnet.name} (Chain ID: ${somniaTestnet.id}) to continue.`);
        }

        if (!marketAddress) {
            throw new Error('Market address is required.');
        }

        try {
            const txHash = await writeContractAsync({
                address: marketAddress,
                abi: PredictionMarketABI as Abi,
                functionName: 'placeBet',
                args: [predictedValue],
                value: value,
            });
            return txHash;
        } catch (err) {
            console.error('writeContractAsync error:', err);
            throw err;
        }
    };

    return {
        placeBet,
        hash,
        error,
        isPending,
        isSuccess,
        isConfirming,
        isConfirmed,
        receipt,
        reset: resetWrite,
    };
}

/**
 * Hook to claim reward from a prediction market
 */
export function usePredictionMarketClaimReward(marketAddress?: Address, config: UsePredictionMarketConfig = {}) {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { writeContractAsync, data: hash, error, isPending, isSuccess, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({
        hash,
    });

    useTxToast({ hash, isConfirmed, error, label: "Claim reward" });

    const claimReward = async () => {
        if (!isConnected || !address) {
            throw new Error('Please connect your wallet to continue.');
        }

        if (chainId !== somniaTestnet.id) {
            throw new Error(`Please switch to ${somniaTestnet.name} (Chain ID: ${somniaTestnet.id}) to continue.`);
        }

        if (!marketAddress) {
            throw new Error('Market address is required.');
        }

        try {
            const txHash = await writeContractAsync({
                address: marketAddress,
                abi: PredictionMarketABI as Abi,
                functionName: 'claimReward',
            });
            return txHash;
        } catch (err) {
            console.error('writeContractAsync error:', err);
            throw err;
        }
    };

    return {
        claimReward,
        hash,
        error,
        isPending,
        isSuccess,
        isConfirming,
        isConfirmed,
        receipt,
        reset: resetWrite,
    };
}

/**
 * Hook to get all bets from a prediction market
 */
export function usePredictionMarketGetAllBets(marketAddress?: Address, config: UsePredictionMarketConfig = {}) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: marketAddress,
        abi: PredictionMarketABI as Abi,
        functionName: 'getAllBets',
        query: {
            enabled: config.enabled !== false && !!marketAddress,
        },
    });

  const parsedBets = useMemo<ParsedBet[]>(() => {
    if (!data) return [];
    try {
      const bets = data as Bet[];
      return bets.map((bet) => ({
        user: bet.user,
        amount: bet.amount.toString(),
        predictedValue: bet.predictedValue.toString(),
        rewardAmount: bet.rewardAmount.toString(),
        claimed: bet.claimed,
        timestamp: Number(bet.timestamp),
      }));
    } catch (err) {
      console.error('Error parsing bets:', err);
      return [];
    }
  }, [data]);

    return {
        data: parsedBets,
        rawData: data as Bet[] | undefined,
        isLoading,
        error,
        refetch,
    };
}

export function usePredictionMarketGetUserBet(
    marketAddress?: Address,
    userAddress?: Address,
    config: UsePredictionMarketConfig = {}
) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: marketAddress,
        abi: PredictionMarketABI as Abi,
        functionName: 'getUserBet',
        args: userAddress ? [userAddress] : undefined,
        query: {
            enabled: config.enabled !== false && !!marketAddress && !!userAddress,
        },
    });

  const parsedBet = useMemo<UserBet | null>(() => {
    if (!data) return null;
    try {
      const result = data as [boolean, bigint, bigint, bigint, boolean, bigint];
      const [hasBet, amount, predictedValue, rewardAmount, claimed, timestamp] = result;
      return {
        hasBet,
        amount: amount.toString(),
        predictedValue: predictedValue.toString(),
        rewardAmount: rewardAmount.toString(),
        claimed,
        timestamp: Number(timestamp),
      };
    } catch (err) {
      console.error('Error parsing user bet:', err);
      return null;
    }
  }, [data]);

    return {
        data: parsedBet,
        rawData: data as [boolean, bigint, bigint, bigint, boolean, bigint] | undefined,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to get the current user's bet from a prediction market
 */
export function usePredictionMarketGetCurrentUserBet(
    marketAddress?: Address,
    config: UsePredictionMarketConfig = {}
) {
    const { address } = useAccount();
    return usePredictionMarketGetUserBet(marketAddress, address, config);
}

/**
 * Hook to get prediction distribution from a prediction market
 */
export function usePredictionMarketGetPredictionDistribution(
    marketAddress?: Address,
    config: UsePredictionMarketConfig = {}
) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: marketAddress,
        abi: PredictionMarketABI as Abi,
        functionName: 'getPredictionDistribution',
        query: {
            enabled: config.enabled !== false && !!marketAddress,
        },
    });

  const parsedDistribution = useMemo<PredictionDistribution | null>(() => {
    if (!data) return null;
    try {
      const result = data as [bigint[], bigint[]];
      const [values, counts] = result;
      return {
        values: values.map((v) => v.toString()),
        counts: counts.map((c) => c.toString()),
      };
    } catch (err) {
      console.error('Error parsing prediction distribution:', err);
      return null;
    }
  }, [data]);

    return {
        data: parsedDistribution,
        rawData: data as [bigint[], bigint[]] | undefined,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to get the balance of a prediction market
 */
export function usePredictionMarketGetBalance(marketAddress?: Address, config: UsePredictionMarketConfig = {}) {
    const { data, isLoading, error, refetch } = useReadContract({
        address: marketAddress,
        abi: PredictionMarketABI as Abi,
        functionName: 'getBalance',
        query: {
            enabled: config.enabled !== false && !!marketAddress,
        },
    });

    return {
        data: data ? (data as bigint).toString() : undefined,
        rawData: data as bigint | undefined,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Combined hook for all prediction market operations
 */
export function usePredictionMarket(marketAddress?: Address, config: UsePredictionMarketConfig = {}) {
    const { address } = useAccount();
    const placeBet = usePredictionMarketPlaceBet(marketAddress, config);
    const claimReward = usePredictionMarketClaimReward(marketAddress, config);
    const allBets = usePredictionMarketGetAllBets(marketAddress, config);
    const userBet = usePredictionMarketGetUserBet(marketAddress, address, config);
    const distribution = usePredictionMarketGetPredictionDistribution(marketAddress, config);
    const balance = usePredictionMarketGetBalance(marketAddress, config);

    return {
        placeBet,
        claimReward,
        allBets,
        userBet,
        distribution,
        balance,
        marketAddress,
    };
}
