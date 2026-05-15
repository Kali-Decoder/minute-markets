"use client";

import Link from "next/link";
import { Clock, User, Tag, Settings } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useEffect, useState, useMemo } from "react";
import { formatEther } from "viem";
import { useCoinPrice } from "@/app/hooks/useCoinPrice";
import { RemoteImageCascade } from "@/app/components/RemoteImageCascade";
import { getTokenLogoCandidates } from "@/app/config/tokenLogos";

function cn(...inputs: ClassValue[]) {
  // Utility function for merging Tailwind classes
  return twMerge(clsx(inputs));
}

// --- Custom Colors & Constants ---
const POSITIVE_COLOR = "#00ff9d"; // Neon Green for price display

// --- Utility Functions ---
function getTimeLeft(endTime: string | Date): string {
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// --- Type Definitions ---
export interface MarketCardProps {
  id: string;
  title: string;
  description?: string;
  marketName?: string;
  poolDescription?: string;
  totalVolume?: string;
  totalVolumeRaw?: bigint | string | number; // Raw volume in wei (10^18)
  participants: number;
  parameter?: string;
  category?: string;
  timeLeft?: string; // Optional for backward compatibility
  endTime?: string | Date; // New prop for dynamic calculation
  imageUrl?: string;
  startTime?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  initialValue?: number;
  status?: number;
  finalValue?: number;
}
export function MarketCard({
  id,
  description,
  marketName,
  totalVolumeRaw,
  participants,
  parameter,
  category = "Coins",
  timeLeft: staticTimeLeft,
  endTime,
  status,
  imageUrl,
}: MarketCardProps) {
  // Calculate time left dynamically if endTime is provided
  const [timeLeft, setTimeLeft] = useState<string>(() => {
    if (endTime) {
      return getTimeLeft(endTime);
    }
    return staticTimeLeft || "N/A";
  });

  // Update timer every second if endTime is provided
  useEffect(() => {
    if (!endTime) return;

    const updateTime = () => setTimeLeft(getTimeLeft(endTime));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Extract coin symbol from parameter (e.g., "BTC/USD" -> "BTC" or "BTC" -> "BTC")
  const coinSymbol = useMemo(() => {
    if (!parameter || parameter === "N/A" || parameter.trim() === "") {
      return null;
    }
    const trimmedParam = parameter.trim();
    const parts = trimmedParam.split("/");
    const symbol = parts[0]?.trim().toUpperCase();
    return symbol && symbol.length > 0 ? symbol : null;
  }, [parameter]);

  // Fetch coin price if category is "coin" or "coins" and we have a valid symbol
  const normalizedCategory = category?.trim().toLowerCase();
  const shouldFetchPrice = (normalizedCategory === "coin" || normalizedCategory === "coins") && !!coinSymbol;

  const { data: coinPriceData, isLoading: priceLoading, error: priceError } = useCoinPrice({
    symbol: coinSymbol || "ETH", // Fallback only used if enabled is true and coinSymbol exists
    enabled: !!shouldFetchPrice && !!coinSymbol, // Only enable if we have a valid symbol
    refetchInterval: 10000, // Refetch every 10 seconds
  });


  const currentPrice = useMemo(() => {
    if (!coinPriceData?.data?.length) {
      return null;
    }

    const coinData = coinPriceData.data[0];

    if (!coinData?.prices?.length || coinData.error) {
      return null;
    }

    const usdPrice = coinData.prices.find((p) => p.currency?.toUpperCase() === "USD");
    return usdPrice?.value || coinData.prices[0]?.value || null;
  }, [coinPriceData, coinSymbol]);

  // Map status number to text and background color
  const getStatusInfo = (statusValue?: number) => {
    if (statusValue === undefined || statusValue === null) {
      return { text: "Pending", bgColor: "bg-blue-600" };
    }
    switch (statusValue) {
      case 0:
        return { text: "Pending", bgColor: "bg-blue-600" };
      case 1:
        return { text: "Active", bgColor: "bg-green-600" };
      case 2:
        return { text: "Resolved", bgColor: "bg-zinc-600" };
      case 3:
        return { text: "Cancelled", bgColor: "bg-red-600" };
      default:
        return { text: "Pending", bgColor: "bg-blue-600" };
    }
  };

  const statusInfo = getStatusInfo(status);

  // Format TVL from wei to ether and then format for display
  const formattedTVL = useMemo(() => {
    if (totalVolumeRaw !== undefined && totalVolumeRaw !== null) {
      try {
        // Convert to BigInt if it's a number or string
        const volumeBigInt = typeof totalVolumeRaw === 'bigint' 
          ? totalVolumeRaw 
          : BigInt(totalVolumeRaw.toString());
        
        // Convert from wei to ether using formatEther
        const volumeInEther = parseFloat(formatEther(volumeBigInt));
        
        // Format for display
        if (volumeInEther >= 1000000) {
          return `$${(volumeInEther / 1000000).toFixed(2)}M`;
        } else if (volumeInEther >= 1000) {
          return `$${(volumeInEther / 1000).toFixed(1)}k`;
        } else {
          return `$${volumeInEther.toFixed(2)}`;
        }
      } catch (error) {
        console.error('Error formatting TVL:', error);
        return "$0"; 
      }
    }
    return "$0";
  }, [totalVolumeRaw]);

  return (
    <Link href={`/markets/${id}`} passHref>
      <div className="market-card group relative w-full h-[380px] sm:h-[400px] flex flex-col overflow-hidden rounded-xl border border-white/5 bg-surface p-0 shadow-xl shadow-black/30 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-monad-purple/50 hover:shadow-[0_20px_50px_-20px_rgba(135,109,255,0.35)] active:scale-[0.995] motion-reduce:transform-none motion-reduce:transition-none">
        <div className="flex items-center justify-between border-b border-white/5 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3.5 bg-white/[0.03] flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            {/* Pulsing Monad Purple Dot */}
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-monad-purple animate-pulse flex-shrink-0"></div>
            <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide uppercase truncate">{`Which Price ${coinSymbol} hit till this pool ends ?`}</h3>
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-400 font-mono bg-white/5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md flex-shrink-0 ml-2 sm:ml-3">
            ENDS IN <span className="text-monad-purple font-bold">{timeLeft.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          <PoolCard
            poolName={marketName}
            poolDescription={description}
            currentPrice={shouldFetchPrice ? currentPrice : undefined}
            priceLoading={shouldFetchPrice ? priceLoading : false}
            coinSymbol={coinSymbol || undefined}
            parameter={parameter}
            priceError={shouldFetchPrice ? priceError : undefined}
            imageUrl={imageUrl}
          />
        </div>


        <div className="flex flex-col border-t border-white/5 flex-shrink-0">
          <div className="grid grid-cols-2 bg-white/5">
            <FooterStat label="Status" value={statusInfo.text} icon={Settings} statusBgColor={statusInfo.bgColor} />
            <FooterStat label="Category" value={category} icon={Tag} />
          </div>
          <div className="grid grid-cols-2 border-t border-white/5 bg-white/5">
            <FooterStat label="TVL" value={formattedTVL} icon={Clock} />
            <FooterStat label="Participants" value={participants.toLocaleString()} icon={User} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- Sub-Components ---

function PoolCard({ 

  poolName, 
  poolDescription,
  currentPrice,
  priceLoading,
  coinSymbol,
  parameter,
  priceError,
  imageUrl
}: { 

  poolName?: string; 
  poolDescription?: string;
  currentPrice?: string | null;
  priceLoading?: boolean;
  coinSymbol?: string;
  parameter?: string;
  priceError?: Error | null;
  imageUrl?: string;
}) {
  const logoSources = useMemo(() => {
    const sym = coinSymbol ?? parameter?.split("/")[0]?.trim();
    const tokenFallback = getTokenLogoCandidates({ symbol: sym, coinId: null });
    const u = imageUrl?.trim();
    return u ? [u, ...tokenFallback] : tokenFallback;
  }, [imageUrl, coinSymbol, parameter]);

  const initials = useMemo(() => {
    const s = (coinSymbol || parameter?.split("/")[0] || "").trim();
    const compact = s.replace(/[^A-Za-z0-9]/g, "");
    const two = compact.slice(0, 2).toUpperCase();
    return two.length >= 2 ? two : compact.slice(0, 1).toUpperCase() || "—";
  }, [coinSymbol, parameter]);

  return (
    <div className={cn(
      "flex flex-col p-3 sm:p-4 md:p-5 transition-colors duration-200 flex-1 min-h-0",
      "hover:bg-white/[0.02]",
    )}>
      {/* Market Info */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        {/* Left: Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white/10 bg-white/[0.06]">
            <RemoteImageCascade
              sources={logoSources}
              alt={parameter || "Market"}
              loading="lazy"
              containerClassName="block size-full"
              imgClassName="size-full object-cover"
              fallback={
                <span className="flex size-full items-center justify-center bg-gradient-to-br from-monad-purple/35 to-purple-900/55 text-[10px] sm:text-xs font-bold uppercase text-white tracking-tighter">
                  {initials}
                </span>
              }
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
              <span className="text-xs sm:text-sm font-bold text-white truncate">{parameter || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
              <span className="text-gray-500 font-mono">PRICE</span>
              {priceLoading ? (
                <span className="font-mono font-semibold text-gray-400">Loading...</span>
              ) : currentPrice ? (
                <span className="font-mono font-semibold" style={{ color: POSITIVE_COLOR }}>
                  ${parseFloat(currentPrice).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </span>
              ) : (
                <span className="font-mono font-semibold text-gray-500" title={priceError ? priceError.message : (coinSymbol ? `No price data for ${coinSymbol}` : 'No coin symbol')}>
                  NA
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 sm:space-y-2 pt-3 sm:pt-4 border-t border-white/5">
        {poolName && (
          <h4 className="text-xs sm:text-sm font-semibold text-white leading-tight">{poolName}</h4>
        )}
        {poolDescription && (
          <p className="text-[11px] sm:text-xs text-white/90 leading-relaxed line-clamp-3">{poolDescription}</p>
        )}
       
      </div>
    </div>
  );
}

function FooterStat({ label, value, icon: Icon, statusBgColor }: { label: string, value: string, icon: React.ElementType, statusBgColor?: string }) {
  const isStatus = label === "Status";
  return (
    <div className="bg-white/[0.03] py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-5 flex items-center gap-2 sm:gap-3 hover:bg-white/[0.055] transition-colors duration-200 cursor-default">
      <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-monad-purple flex-shrink-0" />
      <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
        {label}
      </div>
      {isStatus && statusBgColor ? (
        <div className={`ml-auto ${statusBgColor} text-black text-[9px] sm:text-[10px] font-mono font-bold px-0.5 sm:px-1 py-0.5`}>
          {value}
        </div>
      ) : (
        <div className="ml-auto text-[10px] sm:text-xs font-mono font-semibold text-white tracking-tight truncate">{value}</div>
      )}
    </div>
  );
}