import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable server-side rendering
  // distDir: 'out', // Using default .next directory
  trailingSlash: true,
  // LAN devices (phone/other PCs) hitting the dev server need to be allowed
  // to load dev resources like /_next/webpack-hmr
  allowedDevOrigins: ['192.168.0.220', '192.168.1.103', 'localhost', '127.0.0.1'],
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
