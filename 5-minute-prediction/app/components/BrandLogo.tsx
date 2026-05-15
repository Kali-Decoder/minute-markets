"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import { brandLogoLocalUrl, brandLogoRemoteFallbackUrl } from "@/app/config/brandAssets";

type BrandLogoProps = {
  className?: string;
  /** Tailwind sizing for square container */
  sizeClassName?: string;
  priority?: boolean;
};

/** Tries bundled `mm-logo.svg`, optional `NEXT_PUBLIC_BRAND_LOGO_URL`, then a global placeholder. */
export function BrandLogo({ className = "", sizeClassName = "", priority = false }: BrandLogoProps) {
  const remote = brandLogoRemoteFallbackUrl();
  const local = brandLogoLocalUrl();

  const sources = useMemo(() => {
    const list = [
      local,
      remote,
      `https://api.dicebear.com/9.x/shapes/png?seed=${encodeURIComponent("MinuteMarkets")}&size=256`,
    ];
    return [...new Set(list.filter((u): u is string => !!u?.trim()))];
  }, [local, remote]);

  const [failures, setFailures] = useState(0);

  useEffect(() => {
    setFailures(0);
  }, [sources.join("|")]);

  const exhausted = failures >= sources.length || sources.length === 0;
  const index = exhausted ? sources.length - 1 : Math.min(failures, sources.length - 1);
  const src = !exhausted && sources.length ? sources[index] : null;

  const boxClass = twMerge(
    "relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_18px_-4px_rgba(255,255,255,0.18)]",
    sizeClassName,
    className
  );

  if (exhausted) {
    return (
      <div className={boxClass} aria-hidden>
        <span className="absolute inset-0 flex items-center justify-center bg-monad-purple/25 text-[10px] font-bold uppercase text-white">
          MM
        </span>
      </div>
    );
  }

  return (
    <div className={boxClass}>
      <Image
        key={`${src}-${index}`}
        src={src as string}
        alt="MinuteMarkets"
        fill
        className="object-contain p-1"
        priority={priority}
        sizes="256px"
        onError={() => setFailures((n) => n + 1)}
      />
    </div>
  );
}
