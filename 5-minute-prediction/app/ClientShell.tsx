"use client";

import dynamic from "next/dynamic";
import { AppLoader } from "./components/AppLoader";
import { FontLoader } from "./components/FontLoader";

const Providers = dynamic(
  () => import("./providers").then((mod) => mod.Providers),
  { ssr: false }
);

const Navbar = dynamic(
  () => import("./components/Navbar").then((mod) => mod.Navbar),
  { ssr: false }
);

const NetworkGuard = dynamic(
  () => import("./components/NetworkGuard").then((mod) => mod.NetworkGuard),
  { ssr: false }
);

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AppLoader />
      <FontLoader />
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[520px] bg-monad-purple/7 blur-[140px] rounded-full pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(135,109,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(135,109,255,0.12) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      </div>
      <Navbar />
      <NetworkGuard />
      <main className="pt-20 pb-12">{children}</main>
    </Providers>
  );
}
