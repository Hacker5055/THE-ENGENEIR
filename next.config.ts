import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The sandbox preview proxies the dev server through *.e2b.app origins.
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  poweredByHeader: false,
};

export default nextConfig;
