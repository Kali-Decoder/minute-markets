import { NextResponse } from "next/server";
import { getMarketServiceSingleton } from "@/app/api/market-service/service";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const token = process.env.MARKET_SERVICE_ADMIN_TOKEN;
  if (!token) return true; // dev default: no token required
  return req.headers.get("x-admin-token") === token;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = getMarketServiceSingleton();
  
  service.start({
    // Total round lifecycle = 5m betting window + 5m locked window = 10 minutes total execution.
    // We set createEveryMs to 12 minutes so a new market initializes cleanly after the previous one finishes.
    createEveryMs: 12 * 60_000, 
    lockAfterMs: 5 * 60_000,   // Wait 5 minutes for user bets before fetching opening price
    closeAfterMs: 5 * 60_000,  // Wait 5 minutes after locking before fetching closing price
  });

  return NextResponse.json(service.getState());
}