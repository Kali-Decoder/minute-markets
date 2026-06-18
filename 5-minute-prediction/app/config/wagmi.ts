"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  injectedWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { http } from "wagmi";
import { somniaTestnet } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "MinuteMarkets",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    "367e7033f1d106ae8bdbbd60e7c478a9",
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        safeWallet,
        rainbowWallet,
        baseAccount,
        injectedWallet,
        walletConnectWallet,
      ],
    },
  ],
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http(
      process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ||
        "https://dream-rpc.somnia.network/"
    ),
  },
  ssr: false,
});
