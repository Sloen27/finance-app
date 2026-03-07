import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle all pages into single function to reduce serverless function count
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Reduce function count by using single deployment
  output: 'standalone',
};

export default nextConfig;
