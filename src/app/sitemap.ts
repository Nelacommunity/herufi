import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getAllProductSlugs, getCategories } from "@/lib/queries/catalog";
import { HELP_TOPICS } from "@/lib/help";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/help`, changeFrequency: "monthly", priority: 0.3 },
    ...HELP_TOPICS.map((t) => ({ url: `${SITE_URL}/help/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
  try {
    const [categories, products] = await Promise.all([getCategories(), getAllProductSlugs()]);
    return [
      ...staticPages,
      ...categories.map((c) => ({ url: `${SITE_URL}/categories/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...products.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "weekly" as const, priority: 0.7 })),
    ];
  } catch {
    return staticPages;
  }
}
