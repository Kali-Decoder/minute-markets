"use client";

import Link from "next/link";
import { Search, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
// import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletConnect } from "./WalletConnect";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.mobile-menu') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 gap-2 sm:gap-4">
        
        {/* 1. Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-monad-purple shadow-[0_0_15px_-3px_rgba(135,109,255,0.4)]"></div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
            <span className="text-monad-purple">Somnia</span><span className="text-white">Predict</span>
          </span>
        </Link>

        {/* 2. Right: Navigation & Connect */}
        <div className="flex items-center gap-6 shrink-0">
          
          {/* Nav Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-400">
            <Link href="/binary-markets" className="hover:text-white transition-colors flex items-center gap-2">
              Markets
            </Link>
            <Link href="/rewards" className="hover:text-white transition-colors flex items-center gap-2">
              Rewards
            </Link>
          </div>

          {/* Divider (Desktop) */}
          <div className="hidden lg:block h-4 w-px bg-white/10"></div>
          
          {/* Wallet Connect */}
          <div className="hidden sm:block">
            <WalletConnect />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="mobile-menu-button lg:hidden p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl border-t border-white/5 overflow-y-auto z-40">
          <div className="px-4 py-6 space-y-4">
            {/* Mobile Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-monad-purple transition-colors" />
              <input 
                type="text" 
                placeholder="Search markets (BTC, ETH, SOMNIA)..." 
                className="h-10 w-full rounded-xl border border-white/5 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-monad-purple/50 focus:bg-white/10 focus:ring-1 focus:ring-monad-purple/50"
              />
            </div>

            {/* Mobile Nav Links */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <Link
                href="/binary-markets"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Markets
              </Link>
              <Link
                href="/rewards"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-base font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Rewards
              </Link>
            </div>

            {/* Mobile Wallet Connect */}
            <div className="pt-4 border-t border-white/10">
              <div className="px-4">
                <WalletConnect />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
