import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./providers";
import { FontLoader } from "./components/FontLoader";
import { AppLoader } from "./components/AppLoader";
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
        <Providers>
          <AppLoader />
          <FontLoader />
          {/* Terminal Grid + Ambient Glow */}
          <div className="fixed inset-0 -z-10 h-full w-full bg-background">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[520px] bg-monad-purple/7 blur-[140px] rounded-full pointer-events-none" />
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-[0.18] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(135,109,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(135,109,255,0.12) 1px, transparent 1px)",
                backgroundSize: "26px 26px",
                backgroundPosition: "center",
              }}
            />
            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />
          </div>
          <Navbar />
          <main className="pt-20 pb-12">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
