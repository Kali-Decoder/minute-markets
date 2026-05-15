"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type RemoteImageCascadeProps = {
  sources: (string | null | undefined)[];
  alt: string;
  containerClassName?: string;
  imgClassName?: string;
  draggable?: boolean;
  loading?: "eager" | "lazy";
  /** Shown after every URL fails */
  fallback: ReactNode;
};

/**
 * Try remote URLs in order (CDN fallbacks). Uses a plain <img> so it works
 * cleanly on Netlify with `images.unoptimized` and mixed CDNs.
 */
export function RemoteImageCascade({
  sources,
  alt,
  containerClassName,
  imgClassName,
  draggable = false,
  loading = "lazy",
  fallback,
}: RemoteImageCascadeProps) {
  const urls = useMemo(
    () => Array.from(new Set(sources.filter((u): u is string => !!u?.trim()))),
    [sources]
  );

  const [failed, setFailed] = useState(0);

  useEffect(() => {
    setFailed(0);
  }, [urls.join("|")]);

  const index = Math.min(failed, Math.max(0, urls.length - 1));
  const src = urls[index];

  if (!urls.length || failed >= urls.length) {
    return <span className={containerClassName}>{fallback}</span>;
  }

  return (
    <span className={containerClassName}>
      <img
        key={`${src}-${index}`}
        src={src}
        alt={alt}
        draggable={draggable}
        loading={loading}
        className={imgClassName}
        decoding="async"
        onError={() => setFailed((n) => n + 1)}
      />
    </span>
  );
}
