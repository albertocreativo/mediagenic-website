import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    outputFileTracingExcludes: {
      '*': ['public/work/**', 'public/cards/**', 'public/ag/**'],
    },
  },
};

export default nextConfig;
