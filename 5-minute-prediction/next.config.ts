import type { NextConfig } from "next";
import path from "path";
import webpack from "webpack";

const nextConfig: NextConfig = {
  // Temporary: Next's typecheck currently fails inside @noble/curves with TS 5.9.x.
  // This does NOT affect runtime/bundling (Next still compiles successfully).
  // Prefer fixing by pinning a compatible TypeScript/dependency version when network installs are available.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Use webpack instead of Turbopack for builds to avoid issues with thread-stream test files
  webpack: (config, { isServer }) => {
    // Ignore test files and other non-production files from thread-stream
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]test/,
      })
    );
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]bench/,
      })
    );
    config.plugins.push(
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
    // Keep dev optimized (so local behaves normally); serve images as-is in prod.
    unoptimized: process.env.NODE_ENV === "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bin.bnbstatic.com",
        pathname: "/static/assets/logos/**",
      },
    ],
  },
};

export default nextConfig;
