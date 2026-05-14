import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/Navbar";
import { Providers } from "./providers";
import { FontLoader } from "./components/FontLoader";
import { AppLoader } from "./components/AppLoader";
import { publicAssetUrl } from "@/app/config/publicAsset";

export const metadata: Metadata = {
  title: "MinuteMarkets | 5-Minute Prediction Market",
  description: "AI-powered 5-minute UP/DOWN prediction market on Somnia.",
  icons: {
    icon: [{ url: publicAssetUrl("/mm-logo.svg"), type: "image/svg+xml" }],
  },
  openGraph: {
    title: "MinuteMarkets | 5-Minute Prediction Market",
    description: "AI-powered 5-minute UP/DOWN prediction market on Somnia.",
    url: "https://somnia.network",
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
          font-mono antialiased 
          bg-background text-white 
          selection:bg-monad-purple/30 selection:text-monad-purple
          min-h-screen relative overflow-x-hidden
        `}
      >
        <Providers>
          <AppLoader />
          <FontLoader />
          {/* Subtle Ambient Background Glow */}
          <div className="fixed inset-0 -z-10 h-full w-full bg-background">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-monad-purple/5 blur-[120px] rounded-full pointer-events-none" />
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
