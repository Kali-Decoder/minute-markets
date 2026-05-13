"use client";
import "@rainbow-me/rainbowkit/styles.css";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/Toast";
import { useToastContext } from "./contexts/ToastContext";

const RainbowKitProviderWrapper = dynamic(
  () => import("./RainbowKitWrapper").then((mod) => mod.RainbowKitWrapper),
  { ssr: false }
);

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <RainbowKitProviderWrapper>
        <ToastProvider>
          {children}
          <ToastContainerWrapper />
        </ToastProvider>
      </RainbowKitProviderWrapper>
    </QueryClientProvider>
  );
}
