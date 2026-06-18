import type { Metadata } from "next";
import "./globals.css";
import { ClientShell } from "./ClientShell";
import { publicAssetUrl } from "@/app/config/publicAsset";
import { BRAND_LOGO_FILENAME } from "@/app/config/brandAssets";

const brandIcon = publicAssetUrl(`/${BRAND_LOGO_FILENAME}`);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const metadataBase = siteUrl ? new URL(siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`) : undefined;

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: "MinuteMarkets | 5-Minute Prediction Market",
  description: "AI-powered 5-minute UP/DOWN prediction market on Somnia.",
  icons: {
    icon: [{ url: brandIcon, type: "image/svg+xml" }],
  },
  openGraph: {
    title: "MinuteMarkets | 5-Minute Prediction Market",
    description: "AI-powered 5-minute UP/DOWN prediction market on Somnia.",
    url: "https://somnia.network",
    images: [brandIcon],
  },
  twitter: {
    card: "summary_large_image",
    images: [brandIcon],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`
          antialiased 
          bg-background text-white 
          selection:bg-monad-purple/30 selection:text-monad-purple
          min-h-screen relative overflow-x-hidden
        `}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
