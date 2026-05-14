"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ADMIN_ADDRESS } from "@/app/config/admin";
import { MarketServiceControl } from "@/app/components/MarketServiceControl";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const isAdmin = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
  }, [address]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link href="/markets" className="inline-flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Board</h1>
      <p className="text-sm text-gray-400 mb-6">
        Admin address: <span className="text-gray-300">{ADMIN_ADDRESS}</span>
      </p>

      {!isConnected ? (
        <p className="text-gray-400">Connect wallet to continue.</p>
      ) : !isAdmin ? (
        <p className="text-red-300">This page is only for the admin wallet.</p>
      ) : (
        <MarketServiceControl defaultVariant="hero" showVariantToggle={true} />
      )}
    </div>
  );
}

