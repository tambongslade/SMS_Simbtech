import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to enable server-side rendering
  // Normally '.next'. deploy-onprem.ps1 points a build at a side directory
  // via SMS_BUILD_DIR so it can build a new release without touching the
  // .next the live pm2 instances are still serving from mid-deploy, then
  // swaps it in only once the build has actually succeeded. The pm2 process
  // env never sets this, so `next start` always reads plain '.next'.
  distDir: process.env.SMS_BUILD_DIR || '.next',
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
