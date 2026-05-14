"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { publicAssetUrl } from "@/app/config/publicAsset";

export function AppLoader() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Hide loader after reaching 100%
          setTimeout(() => {
            setIsVisible(false);
          }, 500);
          return 100;
        }
        // Increment by random amount between 1-5 for smooth progress
        const increment = Math.random() * 4 + 1;
        return Math.min(100, prev + increment);
      });
    }, 50); // Update every 50ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center bg-black px-4">
      <div className="flex flex-col items-center gap-4 sm:gap-6 md:gap-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_0_40px_-12px_rgba(255,255,255,0.25)]">
            <Image src={publicAssetUrl("/mm-logo.svg")} alt="MinuteMarkets" fill className="object-cover" priority />
          </div>
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight">
              <span className="text-monad-purple">Minute</span>Markets
            </h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs sm:max-w-sm md:w-80 lg:w-96">
          <div className="h-1.5 sm:h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Percentage Display */}
          <div className="mt-3 sm:mt-4 text-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-white">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Loading dots animation */}
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
