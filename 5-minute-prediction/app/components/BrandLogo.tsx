"use client";

import Image from "next/image";
import { twMerge } from "tailwind-merge";

type BrandLogoProps = {
  className?: string;
  /** Tailwind sizing for square container */
  sizeClassName?: string;
  priority?: boolean;
};

export function BrandLogo({
  className = "",
  sizeClassName = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={twMerge(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_18px_-4px_rgba(255,255,255,0.18)]",
        sizeClassName,
        className
      )}
    >
      <Image
        src="/logo.png"
        alt="MinuteMarkets"
        fill
        priority={priority}
        className="object-contain p-1"
        sizes="256px"
      />
    </div>
  );
}