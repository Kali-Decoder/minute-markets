"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { WagmiProvider, cookieToInitialState } from "wagmi";
import { somniaTestnet } from "@/app/config/chains";
import { wagmiConfig } from "@/app/config/wagmi";
import { rainbowKitTheme } from "./config/theme";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";
import { WalletReconnect } from "./components/WalletReconnect";

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie?: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const initialState = useMemo(
    () => cookieToInitialState(wagmiConfig, cookie),
    [cookie]
  );

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme(rainbowKitTheme)}
          initialChain={somniaTestnet}
        >
          <WalletReconnect />
          <ToastProvider>
            {children}
            <ToastContainerWrapper />
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
