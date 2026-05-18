"use client";

import "@rainbow-me/rainbowkit/styles.css";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi"; // Imported Wagmi components
import { somniaTestnet } from "@/app/config/chains";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";

// Keep this wrapper dynamic for RainbowKit's internal UI components
const RainbowKitProviderWrapper = dynamic(
  () => import("./RainbowKitWrapper").then((mod) => mod.RainbowKitWrapper),
  { ssr: false }
);

// 1. Create your Wagmi configuration out here
const config = createConfig({
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http(),
  },
});

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* 2. Wrap the dynamic component with WagmiProvider */}
      <WagmiProvider config={config}>
        <RainbowKitProviderWrapper>
          <ToastProvider>
            {children}
            <ToastContainerWrapper />
          </ToastProvider>
        </RainbowKitProviderWrapper>
      </WagmiProvider>
    </QueryClientProvider>
  );
}