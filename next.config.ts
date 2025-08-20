import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable server-side rendering
  // distDir: 'out', // Using default .next directory
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
