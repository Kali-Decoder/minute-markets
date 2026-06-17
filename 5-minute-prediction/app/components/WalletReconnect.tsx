"use client";

import { useReconnect } from "wagmi";

export function WalletReconnect() {
  useReconnect();
  return null;
}
