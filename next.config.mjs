/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), display-capture=(), payment=()" },
  // Framing is allowed for the platform itself and the preview proxy only —
  // X-Frame-Options cannot express that, frame-ancestors can.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self' https://*.e2b.app; object-src 'none'; base-uri 'self'",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  // The sandbox preview proxies the dev server through *.e2b.app origins.
  allowedDevOrigins: ["*.e2b.app"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  poweredByHeader: false,
  // SMTP client must stay a real Node require at runtime, not a bundled chunk.
  serverExternalPackages: ["nodemailer"],
  // Keep the build self-contained: no external font/CDN fetches at compile time.
  images: { unoptimized: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
