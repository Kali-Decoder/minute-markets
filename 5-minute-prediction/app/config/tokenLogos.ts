import { publicAssetUrl } from "@/app/config/publicAsset";

export type TokenSymbol = "BTC" | "ETH" | "SOL" | "SOMI";

export type TokenLogoArgs = { symbol?: string | null; coinId?: string | null };

/** Bundled Somnia / SOMI mark (`public/somnia.png`). */
const SOMNIA_LOGO = publicAssetUrl("/somnia.png");

/** Binance static logos (e.g. BTC: `.../logos/BTC.png`) — tried first for non-SOMI. */
const TOKEN_LOGOS_BINANCE: Record<TokenSymbol, string> = {
  BTC: "https://bin.bnbstatic.com/static/assets/logos/BTC.png",
  ETH: "https://bin.bnbstatic.com/static/assets/logos/ETH.png",
  SOL: "https://bin.bnbstatic.com/static/assets/logos/SOL.png",
  SOMI: "https://bin.bnbstatic.com/static/assets/logos/SOMI.png",
};

/**
 * CoinGecko CDN — secondary fallback if Binance blocks or 404s in a region.
 * SOMI omitted until a stable Gecko image id is confirmed.
 */
const TOKEN_LOGOS_COINGECKO: Partial<Record<TokenSymbol, string>> = {
  BTC: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
};

export function cryptoIdenticonFallback(seed: string): string {
  const s = seed.trim() || "crypto";
  return `https://api.dicebear.com/9.x/shapes/png?seed=${encodeURIComponent(s)}&size=128`;
}

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

export function tokenLogoSeed(args: TokenLogoArgs): string {
  const sym = normalizeTokenSymbol(args.symbol) ?? tokenSymbolFromCoinId(args.coinId);
  if (sym) return sym;
  const raw = (args.symbol || args.coinId || "token").trim();
  return raw || "token";
}

/** Ordered list of remote images to try; ends with deterministic online placeholder. */
export function getTokenLogoCandidates(args: TokenLogoArgs): string[] {
  const sym = normalizeTokenSymbol(args.symbol) ?? tokenSymbolFromCoinId(args.coinId);

  if (!sym) {
    const seed = tokenLogoSeed(args);
    return [cryptoIdenticonFallback(seed)];
  }

  const candidates: string[] = [];
  if (sym === "SOMI") {
    candidates.push(SOMNIA_LOGO);
    candidates.push(TOKEN_LOGOS_BINANCE.SOMI);
  } else {
    candidates.push(TOKEN_LOGOS_BINANCE[sym]);
    const cg = TOKEN_LOGOS_COINGECKO[sym];
    if (cg) candidates.push(cg);
  }
  candidates.push(cryptoIdenticonFallback(sym));

  return [...new Set(candidates.filter(Boolean))];
}

export function getTokenLogoUrl(args: TokenLogoArgs): string | null {
  const list = getTokenLogoCandidates(args);
  /** First non–Dicebear entry (local `/…` paths or CDN). */
  return list.find((u) => !u.includes("api.dicebear.com")) ?? list[0] ?? null;
}
