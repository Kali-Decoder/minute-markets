"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { Hash } from "viem";
import { useToastContext } from "@/app/contexts/ToastContext";

function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}

function txUrl(hash: Hash): string {
  // Somnia explorer
  return `https://explorer.somnia.network/tx/${hash}`;
}

export function useTxToast(params: {
  hash?: Hash;
  isConfirmed?: boolean;
  error?: unknown;
  label: string;
}) {
  const { showInfo, showSuccess, showError } = useToastContext();
  const lastHash = useRef<Hash | null>(null);
  const lastError = useRef<string | null>(null);
  const lastConfirmedHash = useRef<Hash | null>(null);

  const errorMessage = useMemo(() => {
    if (!params.error) return null;
    if (params.error instanceof Error) return params.error.message;
    return String(params.error);
  }, [params.error]);

  useEffect(() => {
    if (!params.hash) return;
    if (lastHash.current === params.hash) return;
    lastHash.current = params.hash;
    lastConfirmedHash.current = null;

    const h = params.hash;
    showInfo(
      <span className="flex items-center gap-2 flex-wrap">
        <span className="font-black">{params.label} submitted</span>
        <Link className="underline decoration-white/10 hover:decoration-white/30" href={txUrl(h)} target="_blank">
          {shortHash(h)}
        </Link>
      </span>,
      6000
    );
  }, [params.hash, params.label, showInfo]);

  useEffect(() => {
    if (!errorMessage) return;
    if (lastError.current === errorMessage) return;
    lastError.current = errorMessage;
    showError(
      <span className="flex items-center gap-2 flex-wrap">
        <span className="font-black">{params.label} failed</span>
        <span className="text-white/80">{errorMessage}</span>
      </span>,
      8000
    );
  }, [errorMessage, params.label, showError]);

  useEffect(() => {
    if (!params.hash || !params.isConfirmed) return;
    if (lastConfirmedHash.current === params.hash) return;
    lastConfirmedHash.current = params.hash;
    showSuccess(
      <span className="flex items-center gap-2 flex-wrap">
        <span className="font-black">{params.label} confirmed</span>
        <Link className="underline decoration-white/10 hover:decoration-white/30" href={txUrl(params.hash)} target="_blank">
          {shortHash(params.hash)}
        </Link>
      </span>,
      7000
    );
  }, [params.hash, params.isConfirmed, params.label, showSuccess]);
}
