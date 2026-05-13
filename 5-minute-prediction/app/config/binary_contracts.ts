import type { Address } from "viem";

export const BINARY_V2_CHAIN_ID = 50312;

export const BINARY_V2_ADDRESSES = {
  [BINARY_V2_CHAIN_ID]: {
    mockUSDC: "0xd6AC5203EedDb69531a7C207020C7fD7cDf77d15",
    shareToken: "0x16bCb751c8e9eE7F5bFc4F8D9da50cFC05760529",
    marketFactory: "0x5047A246F0a95F4d74784D2D1B4C0bE1eBaE5276",
    protocolWallet: "0xdAF0182De86F904918Db8d07c7340A1EfcDF8244",
    oracle: "0xdAF0182De86F904918Db8d07c7340A1EfcDF8244",
  },
} as const satisfies Record<
  number,
  {
    mockUSDC: Address;
    shareToken: Address;
    marketFactory: Address;
    protocolWallet: Address;
    oracle: Address;
  }
>;

export type BinaryV2Addresses = (typeof BINARY_V2_ADDRESSES)[typeof BINARY_V2_CHAIN_ID];

export function getBinaryV2Addresses(chainId: number): BinaryV2Addresses | undefined {
  return (BINARY_V2_ADDRESSES as Record<number, BinaryV2Addresses | undefined>)[chainId];
}

