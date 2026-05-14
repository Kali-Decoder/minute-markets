"use client";

import Link from "next/link";
import type { Address } from "viem";
import { formatEther } from "viem";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink } from "lucide-react";
import { somniaTestnet } from "@/app/config/chains";

const ROUND_STATUS_LABEL: Record<number, string> = {
  0: "LIVE",
  1: "LOCKED",
  2: "ENDED",
  3: "CANCELLED",
};

export type PredictionMarketCardProps = {
  address: Address;
  name: string;
  symbol: string;
  coinId: string;
  roundStatus?: number;
  upPool?: bigint;
  downPool?: bigint;
};

export function PredictionMarketCard({
  address,
  name,
  symbol,
  coinId,
  roundStatus,
  upPool,
  downPool,
}: PredictionMarketCardProps) {
  const hasPools = typeof upPool === "bigint" && typeof downPool === "bigint";
  const chartData = hasPools
    ? (() => {
        const up = Number(formatEther(upPool));
        const down = Number(formatEther(downPool));
        // two points so recharts draws visible line segments
        return [
          { x: 0, up, down },
          { x: 1, up, down },
        ];
      })()
    : [];

  const explorerBase = (somniaTestnet.blockExplorers?.default.url || "").replace(/\/$/, "");
  const explorerUrl = explorerBase ? `${explorerBase}/address/${address}` : "";

  return (
    <Link
      href={`/markets/${address}`}
      className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 hover:border-monad-purple/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold truncate">{name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300">
              {symbol}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 truncate">Coin ID: {coinId}</p>
          <p className="text-[11px] text-gray-500 mt-2 truncate">{address}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span
              className={[
                "text-[10px] px-2 py-0.5 rounded-full border",
                roundStatus === 2
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  : roundStatus === 1
                    ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
                    : roundStatus === 3
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-green-500/30 bg-green-500/10 text-green-300",
              ].join(" ")}
            >
              {typeof roundStatus === "number" ? ROUND_STATUS_LABEL[roundStatus] ?? `STATUS ${roundStatus}` : "—"}
            </span>
            <a
              href={explorerUrl}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center h-6 w-6 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-monad-purple/40"
              aria-label="Open in explorer"
              title="Open in explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
          <span>Up / Down pools</span>
          {hasPools ? (
            <span className="text-gray-500">
              {formatEther(upPool)} / {formatEther(downPool)} ETH
            </span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>
        <div className="h-10">
          {hasPools ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="x" hide />
                <YAxis hide domain={[0, "dataMax"]} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const up = payload.find((p) => p.dataKey === "up")?.value as number | undefined;
                    const down = payload.find((p) => p.dataKey === "down")?.value as number | undefined;
                    return (
                      <div className="rounded-lg border border-white/10 bg-black/80 px-3 py-2 text-xs text-white">
                        <div>UP: {typeof up === "number" ? up.toFixed(4) : "—"} ETH</div>
                        <div>DOWN: {typeof down === "number" ? down.toFixed(4) : "—"} ETH</div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="up" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="down" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-white/10 bg-white/5" />
          )}
        </div>
      </div>
    </Link>
  );
}
