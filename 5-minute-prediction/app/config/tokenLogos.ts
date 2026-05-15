export type TokenSymbol = "BTC" | "ETH" | "SOL" | "SOMI";

const TOKEN_LOGOS: Record<TokenSymbol, string> = {
  BTC: "https://bin.bnbstatic.com/static/assets/logos/BTC.png",
  ETH: "https://bin.bnbstatic.com/static/assets/logos/ETH.png",
  SOL: "https://bin.bnbstatic.com/static/assets/logos/SOL.png",
  SOMI: "https://bin.bnbstatic.com/static/assets/logos/SOMI.png",
};

export function normalizeTokenSymbol(input?: string | null): TokenSymbol | null {
  const v = (input || "").trim().toUpperCase();
  if (v === "BTC") return "BTC";
  if (v === "ETH") return "ETH";
  if (v === "SOL") return "SOL";
  if (v === "SOMI") return "SOMI";
  return null;
}

export function tokenSymbolFromCoinId(coinId?: string | null): TokenSymbol | null {
  const normalized = (coinId || "").trim().toLowerCase();
  if (normalized === "bitcoin" || normalized === "btc") return "BTC";
  if (normalized === "ethereum" || normalized === "eth") return "ETH";
  if (normalized === "solana" || normalized === "sol") return "SOL";
  if (normalized === "somnia" || normalized === "somi") return "SOMI";
  return null;
}

export function getTokenLogoUrl(args: { symbol?: string | null; coinId?: string | null }): string | null {
  const fromSymbol = normalizeTokenSymbol(args.symbol);
  if (fromSymbol) return TOKEN_LOGOS[fromSymbol];
  const fromCoinId = tokenSymbolFromCoinId(args.coinId);
  return fromCoinId ? TOKEN_LOGOS[fromCoinId] : null;
}