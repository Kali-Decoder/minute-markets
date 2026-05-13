'use client';

import { useEffect, useState, useCallback } from 'react';

interface Price {
    currency: string;
    value: string;
    lastUpdatedAt: string; // ISO date string
}

interface CoinPriceData {
    symbol: string;
    prices: Price[];
    error?: string;
}

interface CoinPriceResponse {
    data: CoinPriceData[];
}

interface BinancePriceResponse {
    symbol: string;
    price: string;
}

interface UseCoinPriceParams {
    symbol: string; // e.g., 'BTC'
    enabled?: boolean;
    refetchInterval?: number;
}

export function useCoinPrice({
    symbol,
    enabled = true,
    refetchInterval,
}: UseCoinPriceParams) {
    const [data, setData] = useState<CoinPriceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState<Error | null>(null);

    const fetchCoinPrice = useCallback(async () => {
        // Check if enabled and symbol is valid (not empty string)
        if (!enabled || !symbol || symbol.trim() === '') {
            setIsLoading(false);
            return;
        }

        console.log("useCoinPrice - symbol:", symbol, "enabled:", enabled);

        try {
            setIsLoading(true);
            setError(null);

            // Convert symbol to Binance format (e.g., "BTC" -> "BTCUSDT")
            const binanceSymbol = `${symbol.toUpperCase()}USDT`;
            console.log(binanceSymbol,"binnace");
            const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {},
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Failed to fetch coin price: ${response.status} ${response.statusText}. ${errorText}`
                );
            }

            const binanceResult: BinancePriceResponse = await response.json();

            const transformedData: CoinPriceResponse = {
                data: [
                    {
                        symbol: symbol.toUpperCase(),
                        prices: [
                            {
                                currency: 'USD',
                                value: binanceResult.price,
                                lastUpdatedAt: new Date().toISOString(),
                            },
                        ],
                    },
                ],
            };

            setData(transformedData);
        } catch (err) {
            // Log errors for debugging
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            console.error(`useCoinPrice - Error fetching price for ${symbol}:`, errorMessage, err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [symbol, enabled]);

    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchCoinPrice();

        // Set up polling if refetchInterval is provided
        if (refetchInterval) {
            const intervalId = setInterval(() => {
                fetchCoinPrice();
            }, refetchInterval);

            return () => {
                clearInterval(intervalId);
            };
        }
    }, [fetchCoinPrice, refetchInterval, enabled]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchCoinPrice,
    };
}

