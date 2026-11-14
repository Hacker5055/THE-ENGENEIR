import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The sandbox preview proxies the dev server through *.run.app / *.e2b.app origins.
  allowedDevOrigins: ["*.run.app", "*.e2b.app", "localhost", "127.0.0.1"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: ["*.run.app", "*.e2b.app", "localhost:3000", "127.0.0.1:3000"],
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
