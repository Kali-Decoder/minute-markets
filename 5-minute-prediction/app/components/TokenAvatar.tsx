"use client";

import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { RemoteImageCascade } from "@/app/components/RemoteImageCascade";
import { getTokenLogoCandidates, normalizeTokenSymbol, tokenSymbolFromCoinId, type TokenLogoArgs } from "@/app/config/tokenLogos";

type TokenAvatarProps = {
  symbol?: string | null;
  coinId?: string | null;
  /** e.g. on-chain cover image — tried first when present */
  preferredUrl?: string | null;
  size: number;
  className?: string;
};

function initialsFromArgs(args: TokenLogoArgs): string {
  const sym = normalizeTokenSymbol(args.symbol) ?? tokenSymbolFromCoinId(args.coinId);
  if (sym) return sym;
  const raw = (args.symbol || args.coinId || "?").trim();
  const u = raw.slice(0, 2).toUpperCase();
  return u.length ? u : "?";
}

export function TokenAvatar({ symbol, coinId, preferredUrl, size, className }: TokenAvatarProps) {
  const args: TokenLogoArgs = useMemo(() => ({ symbol, coinId }), [symbol, coinId]);
  const candidates = useMemo(() => getTokenLogoCandidates(args), [args]);

  const sources = useMemo(() => {
    const p = preferredUrl?.trim();
    return p ? [p, ...candidates] : candidates;
  }, [preferredUrl, candidates]);

  const initials = useMemo(() => initialsFromArgs(args), [args]);
  const ariaLabel = useMemo(
    () => `${symbol?.trim() || coinId?.trim() || "Token"} logo`,
    [symbol, coinId]
  );

  return (
    <div
      className={twMerge(
        "relative shrink-0 overflow-hidden rounded-full bg-white/[0.06] ring-2 ring-white/10 shadow-inner",
        className
      )}
      style={{ width: size, height: size }}
    >
      <RemoteImageCascade
        sources={sources}
        alt={ariaLabel}
        loading="eager"
        containerClassName="block size-full [&>img]:size-full [&>img]:object-cover"
        imgClassName="size-full object-cover rounded-full"
        fallback={
          <span className="flex size-full items-center justify-center bg-gradient-to-br from-monad-purple/40 to-purple-900/60 text-[10px] font-bold uppercase leading-none tracking-tighter text-white">
            {initials}
          </span>
        }
      />
    </div>
  );
}
