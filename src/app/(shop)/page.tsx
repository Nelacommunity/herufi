import { Hero } from "@/components/home/hero";
import { CategoryGrid } from "@/components/home/category-grid";
import { PromoBanner } from "@/components/home/promo-banner";
import { ValueProps } from "@/components/home/value-props";
import { DealsBand } from "@/components/home/deals-band";
import { Recommended } from "@/components/home/recommended";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { getCategories, getSection } from "@/lib/queries/catalog";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { getI18n } from "@/i18n/server";

export default async function HomePage() {
  const [{ t }, categories, trending, newArrivals, bestSellers, deals, topRated] = await Promise.all([
    getI18n(),
    getCategories(),
    getSection("trending", 8),
    getSection("new", 4),
    getSection("bestsellers", 4),
    getSection("deals", 8),
    getSection("top-rated", 8),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE_URL,
    potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero t={t} spotlight={[trending[0], newArrivals[0]].filter(Boolean)} />
      <ValueProps t={t} />

      <section id="collections" className="container-page scroll-mt-24 py-16 sm:py-24">
        <SectionHeading eyebrow={t.home.collectionsEyebrow} title={t.home.collectionsTitle} description={t.home.collectionsDesc} href="/products" linkLabel={t.common.browseAll} />
        <CategoryGrid t={t} categories={categories} />
      </section>

      <section className="container-page pb-16 sm:pb-24">
        <SectionHeading eyebrow={t.home.trendingEyebrow} title={t.home.trendingTitle} href="/products?sort=popular" linkLabel={t.common.viewAll} />
        <ProductGrid products={trending} priorityCount={0} />
      </section>

      <DealsBand t={t} products={deals} />

      <section className="container-page grid gap-16 py-16 sm:py-24 lg:grid-cols-2 lg:gap-10">
        <div>
          <SectionHeading eyebrow={t.home.newEyebrow} title={t.home.newTitle} href="/products?sort=newest" linkLabel={t.common.viewAll} className="sm:mb-8" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5">
            {newArrivals.map((p) => <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 22vw, 46vw" />)}
          </div>
        </div>
        <div>
          <SectionHeading eyebrow={t.home.bestEyebrow} title={t.home.bestTitle} href="/products?sort=popular" linkLabel={t.common.viewAll} className="sm:mb-8" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5">
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 22vw, 46vw" />)}
          </div>
        </div>
      </section>

      <PromoBanner t={t} />
      <Recommended fallback={topRated} />

    </>
  );
}

