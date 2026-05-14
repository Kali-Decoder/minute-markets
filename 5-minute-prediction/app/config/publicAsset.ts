export function publicAssetUrl(assetPath: string): string {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return basePath ? `${basePath}${normalized}` : normalized;
}

