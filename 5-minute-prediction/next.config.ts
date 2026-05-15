const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /thread-stream[\\/]test/ }),
      new webpack.IgnorePlugin({ resourceRegExp: /thread-stream[\\/]bench/ }),
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
    // Keeps dev optimized; uses a pass-through structure for production
    unoptimized: process.env.NODE_ENV === "production",
    loader: process.env.NODE_ENV === "production" ? "custom" : "default",
    loaderFile: process.env.NODE_ENV === "production" ? "./image-loader.js" : undefined,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bin.bnbstatic.com",
        pathname: "/static/assets/**",
      },
    ],
  },
};