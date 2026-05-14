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
    createEveryMs: 10 * 60_000,
    lockAfterMs: 5 * 60_000,
    closeAfterMs: 10 * 60_000,
  });
  return NextResponse.json(service.getState());
}

