import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow NEAR-related domains for images if needed
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.near.social' },
      { protocol: 'https', hostname: '**.ipfs.dweb.link' },
      { protocol: 'https', hostname: 'cloudflare-ipfs.com' },
    ],
  },
};

export default nextConfig;
