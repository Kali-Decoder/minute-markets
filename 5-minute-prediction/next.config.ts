import path from "path";
import webpack from "webpack";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporary: Next's typecheck currently fails inside @noble/curves with TS 5.9.x.
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
        pathname: "/static/assets/**",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
        pathname: "/coins/images/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/9.x/**",
      },
    ],
  },
};

export default nextConfig;