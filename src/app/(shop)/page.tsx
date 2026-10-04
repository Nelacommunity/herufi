import { Hero } from "@/components/home/hero";
import { CategoryGrid } from "@/components/home/category-grid";
import { PromoBanner } from "@/components/home/promo-banner";
import { ValueProps } from "@/components/home/value-props";
import { DealsBand } from "@/components/home/deals-band";
import { Recommended } from "@/components/home/recommended";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, getSection, getShippingRates } from "@/lib/queries/catalog";
import { FaqList, faqJsonLd } from "@/components/seo/faq-list";
import { GUIDE_SLUG, SEO_COPY, homeFaq, shippingFacts } from "@/lib/seo-content";
import { jsonLd, pageAlternates } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const copy = SEO_COPY[locale];
  return {
    title: { absolute: copy.homeTitle },
    description: copy.homeDescription,
    keywords: [...copy.keywords],
    alternates: pageAlternates("/", locale),
    openGraph: { title: copy.homeTitle, description: copy.homeDescription, url: "/" },
  };
}

export default async function HomePage() {
  const [{ t, locale }, rates, categories, trending, newArrivals, bestSellers, deals, topRated] = await Promise.all([
    getI18n(),
    getShippingRates(),
    getCategories(),
    getSection("trending", 8),
    getSection("new", 4),
    getSection("bestsellers", 4),
    getSection("deals", 8),
    getSection("top-rated", 8),
  ]);

  const faq = homeFaq(locale, shippingFacts(rates));
  const inLanguage = locale === "sw" ? "sw-TZ" : "en-TZ";
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE.name,
      url: SITE_URL,
      inLanguage: ["en-TZ", "sw-TZ"],
      description: SEO_COPY[locale].homeDescription,
      potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
    faqJsonLd(faq, inLanguage),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
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

      <section className="container-page grid gap-10 pb-8 pt-8 lg:grid-cols-[1fr_1.4fr] lg:gap-20" aria-labelledby="faq-title">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{locale === "sw" ? "Maswali" : "FAQ"}</p>
          <h2 id="faq-title" className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {locale === "sw" ? "Maswali ambayo Watanzania huuliza" : "Questions Tanzanian shoppers ask"}
          </h2>
          <p className="mt-4 text-pretty text-muted">
            {locale === "sw" ? "Kila kitu kuhusu kununua kutoka China: gharama, muda, ushuru na malipo." : "Everything about buying from China: cost, delivery time, customs and payment."}
          </p>
          <Link href={`/guides/${GUIDE_SLUG}`} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
            {locale === "sw" ? "Soma mwongozo kamili →" : "Read the full buying guide →"}
          </Link>
        </div>
        <FaqList items={faq} defaultOpen={1} />
      </section>

    </>
  );
}

