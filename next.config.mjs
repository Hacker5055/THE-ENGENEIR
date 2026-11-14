/** @type {import('next').NextConfig} */
const nextConfig = {
  // The sandbox preview proxies the dev server through *.e2b.app origins.
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  poweredByHeader: false,
  // Keep the build self-contained: no external font/CDN fetches at compile time.
  images: { unoptimized: true },
};

export default nextConfig;
