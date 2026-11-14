import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almohandes.edu";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/docs", "/login"],
        // Portals, auth steps, verification and APIs stay out of search engines.
        disallow: ["/admin", "/student", "/teacher", "/exam", "/verify", "/welcome", "/api"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
