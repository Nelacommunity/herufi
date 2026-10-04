import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getAllProductSlugs, getCategories } from "@/lib/queries/catalog";
import { createPublicClient } from "@/lib/supabase/public";
import { HELP_TOPICS } from "@/lib/help";
import { GUIDE_SLUG, GUIDE_UPDATED } from "@/lib/seo-content";
import { localizedPath } from "@/lib/seo";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/** One entry per page with hreflang alternates for English and Kiswahili (?lang=sw). */
function page(path: string, extra: Omit<Entry, "url"> = {}): Entry {
  return {
    url: `${SITE_URL}${path}`,
    alternates: { languages: { "en-TZ": `${SITE_URL}${path}`, "sw-TZ": `${SITE_URL}${localizedPath(path, "sw")}` } },
    ...extra,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    page("/", { lastModified: now, changeFrequency: "daily", priority: 1 }),
    page("/products", { lastModified: now, changeFrequency: "daily", priority: 0.9 }),
    page(`/guides/${GUIDE_SLUG}`, { lastModified: new Date(GUIDE_UPDATED), changeFrequency: "monthly", priority: 0.8 }),
    page("/help", { changeFrequency: "monthly", priority: 0.4 }),
    ...HELP_TOPICS.map((t) => page(`/help/${t.slug}`, { changeFrequency: "monthly", priority: t.slug === "shipping" || t.slug === "faq" ? 0.6 : 0.3 })),
  ];
  try {
    const db = createPublicClient(3600);
    const [categories, products, images] = await Promise.all([
      getCategories(),
      getAllProductSlugs(),
      db.from("product_images").select("image_url, product:products!inner(slug, is_active)").eq("product.is_active", true).order("sort_order"),
    ]);
    const imageMap = new Map<string, string[]>();
    for (const row of (images.data ?? []) as unknown as { image_url: string; product: { slug: string } }[]) {
      imageMap.set(row.product.slug, [...(imageMap.get(row.product.slug) ?? []), row.image_url]);
    }
    return [
      ...staticPages,
      ...categories.map((c) => page(`/categories/${c.slug}`, { lastModified: now, changeFrequency: "weekly", priority: 0.8, images: c.image_url ? [c.image_url] : undefined })),
      ...products.map((p) => page(`/products/${p.slug}`, { lastModified: new Date(p.updated_at), changeFrequency: "weekly", priority: 0.7, images: imageMap.get(p.slug)?.slice(0, 3) })),
    ];
  } catch {
    return staticPages;
  }
}
