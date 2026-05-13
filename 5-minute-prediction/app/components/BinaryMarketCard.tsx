"use client";

import Link from "next/link";
import { TrendingUp, Eye, Heart, Repeat2, MessageCircle, Twitter } from "lucide-react";
import { useEffect, useState } from "react";

// --- Utility Functions ---
function getTimeLeft(endTime: string | Date): string {
  const end = typeof endTime === "string" ? new Date(endTime) : endTime;
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// --- Type Definitions ---
export interface BinaryMarketCardProps {
  id: string;
  tweetId: string;
  tweetUrl: string;
  tweetText: string;
  authorHandle: string;
  authorName: string;
  avatarUrl?: string;
  metric: "VIEWS" | "LIKES" | "RETWEETS" | "COMMENTS";
  targetValue: number;
  currentValue: number;
  yesOdds: number;
  noOdds: number;
  totalVolume: string;
  participants: number;
  category?: string;
  endTime: string | Date;
  status?: "pending" | "active" | "resolved" | "cancelled";
  resolvedOutcome?: "yes" | "no" | null;
}

const getMetricIcon = (metric: string) => {
  switch (metric) {
    case "VIEWS":
      return Eye;
    case "LIKES":
      return Heart;
    case "RETWEETS":
      return Repeat2;
    case "COMMENTS":
      return MessageCircle;
    default:
      return TrendingUp;
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

function MetricIcon({ metric, className }: { metric: BinaryMarketCardProps["metric"]; className?: string }) {
  switch (metric) {
    case "VIEWS":
      return <Eye className={className} />;
    case "LIKES":
      return <Heart className={className} />;
    case "RETWEETS":
      return <Repeat2 className={className} />;
    case "COMMENTS":
      return <MessageCircle className={className} />;
    default:
      return <TrendingUp className={className} />;
  }
}

export function BinaryMarketCard(props: BinaryMarketCardProps) {
  const {
    id,
    tweetText,
    authorHandle,
    authorName,
    avatarUrl,
    metric,
    targetValue,
    currentValue,
    yesOdds,
    noOdds,
    totalVolume,
    participants,
    endTime,
    status = "active",
  } = props;
  const [timeLeft, setTimeLeft] = useState<string>(() => getTimeLeft(endTime));
  const [imageErrorForUrl, setImageErrorForUrl] = useState<string | null>(null);

  // Update timer every second
  useEffect(() => {
    const updateTime = () => setTimeLeft(getTimeLeft(endTime));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Map status to display info
  const getStatusInfo = (statusValue: string) => {
    switch (statusValue) {
      case "pending":
        return { text: "Pending", bgColor: "bg-blue-600" };
      case "active":
        return { text: "Active", bgColor: "bg-green-600" };
      case "resolved":
        return { text: "Resolved", bgColor: "bg-zinc-600" };
      case "cancelled":
        return { text: "Cancelled", bgColor: "bg-red-600" };
      default:
        return { text: "Active", bgColor: "bg-green-600" };
    }
  };

  const statusInfo = getStatusInfo(status);
  const progress = Math.min(100, (currentValue / targetValue) * 100);
  const imageErrored = !!avatarUrl && imageErrorForUrl === avatarUrl;

  return (
    <Link href={`/binary-markets/${id}`} passHref>
      <div className="binary-market-card group relative w-full flex flex-col overflow-hidden rounded-xl border border-white/5 bg-surface transition-all hover:border-monad-purple/50 shadow-xl shadow-black/30">
        {/* Twitter-style Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Twitter className="h-4 w-4 text-[#1DA1F2]" />
            <span className="text-xs font-semibold text-gray-400">Twitter Prediction</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
            {timeLeft}
          </div>
        </div>

        {/* Tweet Content */}
        <div className="p-4 space-y-3">
          {/* Author Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-monad-purple/20 flex items-center justify-center overflow-hidden flex-shrink-0">
              {avatarUrl && !imageErrored ? (
                <img 
                  key={avatarUrl}
                  src={avatarUrl} 
                  alt={authorName}
                  className="w-full h-full object-cover"
                  onError={() => setImageErrorForUrl(avatarUrl)}
                />
              ) : (
                <span className="text-xs font-bold text-monad-purple">
                  {authorName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">{authorName}</span>
                <span className="text-sm text-gray-500 truncate">@{authorHandle}</span>
              </div>
            </div>
          </div>

          {/* Tweet Text */}
          <p className="text-sm text-white leading-relaxed line-clamp-3">
            {tweetText}
          </p>

          {/* Metric & Target */}
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MetricIcon metric={metric} className="h-4 w-4 text-monad-purple" />
                <span className="text-xs font-semibold text-gray-400 uppercase">{metric}</span>
              </div>
              <span className="text-xs text-gray-500">
                {formatNumber(currentValue)} / {formatNumber(targetValue)}
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-monad-purple to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Yes/No Odds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-green-400">YES</span>
              <span className="text-xs font-bold text-green-400">{yesOdds}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300"
                style={{ width: `${yesOdds}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-400">NO</span>
              <span className="text-xs font-bold text-red-400">{noOdds}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                style={{ width: `${noOdds}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="border-t border-white/5 bg-white/[0.02]">
          <div className="grid grid-cols-3 gap-px bg-white/5">
            <FooterStat label="Volume" value={totalVolume} />
            <FooterStat label="Traders" value={participants.toLocaleString()} />
            <FooterStat label="Status" value={statusInfo.text} statusBgColor={statusInfo.bgColor} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Footer Stat Component
function FooterStat({ 
  label, 
  value, 
  statusBgColor 
}: { 
  label: string;
  value: string;
  statusBgColor?: string;
}) {
  const isStatus = label === "Status";
  return (
    <div className="bg-white/[0.03] py-3 px-3 flex flex-col items-center justify-center hover:bg-white/[0.05] transition-colors">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
        {label}
      </div>
      {isStatus && statusBgColor ? (
        <div className={`${statusBgColor} text-black text-[10px] font-mono font-bold px-1.5 py-0.5 rounded`}>
          {value}
        </div>
      ) : (
        <div className="text-xs font-mono font-semibold text-white">{value}</div>
      )}
    </div>
  );
}
