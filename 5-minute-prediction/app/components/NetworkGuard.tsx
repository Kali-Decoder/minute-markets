"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { somniaTestnet } from "@/app/config/chains";

export function NetworkGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  const isWrongNetwork = isConnected && chainId !== somniaTestnet.id;

  if (!isWrongNetwork || dismissed) {
    return null;
  }

  const handleSwitch = () => {
    switchChain({ chainId: somniaTestnet.id });
  };

  return (
    <div className="border-b border-yellow-500/30 bg-yellow-500/10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
          <p className="text-xs sm:text-sm text-yellow-200">
            Your wallet is on the wrong network. Switch to{" "}
            <span className="font-semibold text-yellow-100">Somnia Testnet</span>{" "}
            to use MinuteMarkets.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleSwitch}
            disabled={isPending}
            className="rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-medium text-yellow-100 transition-colors hover:bg-yellow-500/30 disabled:opacity-60 sm:text-sm"
          >
            {isPending ? "Switching..." : "Switch Network"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-yellow-400/80 transition-colors hover:bg-yellow-500/10 hover:text-yellow-200"
            aria-label="Dismiss network warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
