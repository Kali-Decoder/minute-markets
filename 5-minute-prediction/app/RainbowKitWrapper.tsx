"use client";

import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  injectedWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { WagmiProvider, http } from "wagmi";
import { somniaTestnet } from "./config/chains";
import { rainbowKitTheme } from "./config/theme";
import type { ReactNode } from "react";

const config = getDefaultConfig({
  appName: "Somnia Predict",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "367e7033f1d106ae8bdbbd60e7c478a9",
  wallets: [
    {
      groupName: "Popular",
      wallets: [safeWallet, rainbowWallet, baseAccount, injectedWallet, walletConnectWallet],
    },
  ],
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http(process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || "https://dream-rpc.somnia.network/"),
  },
});

export function RainbowKitWrapper({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider
        theme={darkTheme(rainbowKitTheme)}
        initialChain={somniaTestnet}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
