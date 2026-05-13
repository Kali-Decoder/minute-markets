import type { NextConfig } from "next";
import path from "path";
import webpack from "webpack";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
