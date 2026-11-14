import type { MetadataRoute } from "next";
import { DOCS } from "@/lib/docs";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://almohandes.edu";

/**
 * Only public, crawlable surfaces. Authenticated portals (student/admin/…),
 * the 2FA steps and card-verification pages are deliberately excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...DOCS.map((doc) => ({
      url: `${BASE}/docs/${doc.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
