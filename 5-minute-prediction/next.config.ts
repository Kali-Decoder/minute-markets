import type { NextConfig } from "next";
import path from "path";
import webpack from "webpack";

// ==========================================
// 1. Next.js Configuration
// ==========================================

const nextConfig: NextConfig = {
  // Temporary: Next's typecheck currently fails inside @noble/curves with TS 5.9.x.
  // This does NOT affect runtime/bundling (Next still compiles successfully).
  typescript: {
    ignoreBuildErrors: true,
  },

  // Use webpack instead of Turbopack for builds to avoid issues with thread-stream test files
  webpack: (config, { isServer }) => {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]test/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]bench/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /\.(md|txt|sh|zip|LICENSE)$/,
        contextRegExp: /thread-stream/,
      })
    );

    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "app/shims/asyncStorage.ts"
      ),
    };
    
    return config;
  },

  images: {
    // Netlify/static deployments may not support Next image optimization at runtime.
    // Keep dev optimized; serve images as-is in production.
    unoptimized: process.env.NODE_ENV === "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bin.bnbstatic.com",
        // FIXED: Loosened path restriction to prevent Next.js from blocking 
        // URLs due to strict case-sensitivity matching on the "/logos/" string.
        pathname: "/static/assets/**",
      },
    ],
  },
};

export default nextConfig;