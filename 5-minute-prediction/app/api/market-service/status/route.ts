import { NextResponse } from "next/server";
import { getMarketServiceSingleton } from "@/app/api/market-service/service";

export const runtime = "nodejs";

export async function GET() {
  const service = getMarketServiceSingleton();
  return NextResponse.json(service.getState());
}

