import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Enable static export for S3 deployment
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Optional: Add trailing slashes for better S3 compatibility
  trailingSlash: true,
};

export default nextConfig;
