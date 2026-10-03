import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseFilters } from "@/components/catalog/params";
import { getCategoryBySlug } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { categoryName } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const [f, { t }] = [parseFilters(await searchParams), await getI18n()];
  if (f.q) return { title: fmt(t.catalog.searchMeta, { q: f.q }), robots: { index: false, follow: true } };
  const cat = f.category ? await getCategoryBySlug(f.category) : null;
  const title = f.deals ? t.catalog.deals : cat ? categoryName(t.categories, cat) : f.sort === "newest" ? t.catalog.newArrivals : t.catalog.shopAll;
  return { title, description: t.catalog.metaDesc, alternates: { canonical: cat ? `/categories/${cat.slug}` : "/products" } };
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
