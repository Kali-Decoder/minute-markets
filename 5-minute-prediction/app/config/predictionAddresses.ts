import type { Address } from "viem";

export const SOMNIA_TESTNET_CHAIN_ID = 50312;

export const PREDICTION_MARKET_FACTORY_ADDRESS_BY_CHAIN: Record<number, Address> = {
  [SOMNIA_TESTNET_CHAIN_ID]: "0xFD204c783A78db5142d4b13A5a11B005dc9C16Dc",
};

export function getPredictionMarketFactoryAddress(chainId?: number): Address | undefined {
  if (!chainId) return undefined;
  return PREDICTION_MARKET_FACTORY_ADDRESS_BY_CHAIN[chainId];
}

