/**
 * Essential Theme Configuration for MinuteMarkets
 * 
 * This file contains all theme-related constants and configurations
 * used throughout the application.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // Primary colors
  background: "#000000",
  foreground: "#ffffff",
  
  // Brand colors
  somniaPurple: "#876dff",
  monadPurple: "#876dff", // Alias for backward compatibility
  
  // UI colors
  cardBg: "#121212",
  cardBorder: "#262626",
  muted: "#a1a1aa",
} as const;

// ============================================================================
// RAINBOWKIT THEME CONFIGURATION
// ============================================================================

export const rainbowKitTheme = {
  accentColor: colors.somniaPurple,
  accentColorForeground: "white",
  borderRadius: "large" as const,
  fontStack: "system" as const,
  overlayBlur: "small" as const,
} as const;

// ============================================================================
// CSS VARIABLES (for use in globals.css)
// ============================================================================

export const cssVariables = {
  "--background": colors.background,
  "--foreground": colors.foreground,
  "--somnia-purple": colors.somniaPurple,
  "--monad-purple": colors.monadPurple,
  "--card-bg": colors.cardBg,
  "--card-border": colors.cardBorder,
  "--muted": colors.muted,
} as const;

// ============================================================================
// FONT CONFIGURATION
// ============================================================================

export const fonts = {
  mono: {
    family: "JetBrains Mono",
    fallback: "monospace",
    variable: "--font-mono",
  },
  inter: {
    family: "Inter",
    variable: "--font-inter",
  },
} as const;

// ============================================================================
// ANIMATION CONFIGURATION
// ============================================================================

export const animations = {
  fadeIn: {
    duration: "0.5s",
    easing: "ease-out",
  },
  slideIn: {
    duration: "0.3s",
    easing: "ease-out",
  },
} as const;

// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================

export const layout = {
  navbar: {
    height: "5rem", // pt-20 = 5rem
  },
  backgroundGlow: {
    height: "500px",
    blur: "120px",
    opacity: 0.05, // bg-monad-purple/5
  },
} as const;

// ============================================================================
// THEME EXPORT
// ============================================================================

export const theme = {
  colors,
  rainbowKitTheme,
  cssVariables,
  fonts,
  animations,
  layout,
} as const;

export default theme;
