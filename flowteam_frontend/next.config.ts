import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**.example.com" },
      { protocol: "https", hostname: "**.flowteam.app" },
      { protocol: "https", hostname: "**.fly.dev" },
      { protocol: "https", hostname: "railway.app" },
      { protocol: "https", hostname: "*.vercel.app" },
    ],
  },
};

export default nextConfig;
