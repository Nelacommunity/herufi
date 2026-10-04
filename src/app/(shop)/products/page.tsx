import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseFilters } from "@/components/catalog/params";
import { getCategoryBySlug } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { categoryName } from "@/lib/utils";
import { SEO_COPY } from "@/lib/seo-content";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const [f, { t, locale }] = [parseFilters(await searchParams), await getI18n()];
  if (f.q) return { title: fmt(t.catalog.searchMeta, { q: f.q }), robots: { index: false, follow: true } };
  const cat = f.category ? await getCategoryBySlug(f.category) : null;
  const copy = SEO_COPY[locale];
  const title = f.deals ? t.catalog.deals : cat ? categoryName(t.categories, cat) : f.sort === "newest" ? t.catalog.newArrivals : copy.productsTitle;
  // Filtered and sorted views consolidate to the clean listing (or the category page) for search engines.
  return { title, description: copy.productsDescription, alternates: pageAlternates(cat ? `/categories/${cat.slug}` : "/products", locale) };
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const [params, { t }] = await Promise.all([searchParams, getI18n()]);
  const f = parseFilters(params);
  const c = t.catalog;
  const heading = f.q
    ? <>{c.resultsFor} <span className="font-display font-normal italic">“{f.q}”</span></>
    : f.deals ? c.deals : f.sort === "newest" ? c.newArrivals : f.sort === "popular" ? c.bestSellers : c.shopAll;
  return (
    <div className="container-page pb-8 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: f.q ? c.searchCrumb : t.common.shop, href: "/products" }]} />
      <h1 className="mb-8 mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{heading}</h1>
      <CatalogView params={params} basePath="/products" />
    </div>
  );
}
