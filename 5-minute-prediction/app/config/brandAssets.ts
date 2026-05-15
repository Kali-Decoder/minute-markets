import { publicAssetUrl } from "@/app/config/publicAsset";

/** Bundled logo in `public/` (avoid missing `logo.png`). */
export const BRAND_LOGO_FILENAME = "mm-logo.svg";

export function brandLogoLocalUrl(): string {
  return publicAssetUrl(`/${BRAND_LOGO_FILENAME}`);
}

/** Optional absolute URL when static asset path is wrong in some deploys. */
export function brandLogoRemoteFallbackUrl(): string | null {
  const raw = (process.env.NEXT_PUBLIC_BRAND_LOGO_URL || "").trim();
  return raw || null;
}
