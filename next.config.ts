import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable server-side rendering
  // distDir: 'out', // Using default .next directory
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
