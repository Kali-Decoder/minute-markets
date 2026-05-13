import { defineChain } from "viem";

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Somnia Testnet Token",
    symbol: "STT",
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://dream-rpc.somnia.network/"] 
    },
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://shannon-explorer.somnia.network/" },
  },
  testnet: true,
});

export const somniaMainnet = defineChain({
  id: 5031,
  name: "Somnia Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Somnia",
    symbol: "SOMI",
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://api.infra.mainnet.somnia.network/"] 
    },
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://explorer.somnia.network" },
  },
  testnet: false,
});
