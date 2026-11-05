import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCategoryBySlug, getShippingRates, listProducts } from "@/lib/queries/catalog";
import { FaqList, faqJsonLd } from "@/components/seo/faq-list";
import { categorySeo, clampDescription } from "@/lib/seo-keywords";
import { shippingFacts } from "@/lib/seo-content";
import { absoluteUrl, jsonLd, localizedPath } from "@/lib/seo";
import { getI18n } from "@/i18n/server";
import { plural } from "@/i18n/config";
import { categoryName } from "@/lib/utils";
import { pageAlternates, socialMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [cat, { t, locale }] = await Promise.all([getCategoryBySlug(slug), getI18n()]);
  if (!cat) return { title: "404" };
  const name = categoryName(t.categories, cat);
  const seo = categorySeo(cat.slug, name, locale);
  const description = clampDescription(seo.description);
  return {
    title: seo.title,
    description,
    keywords: seo.keywords,
    alternates: pageAlternates(`/categories/${cat.slug}`, locale),
    ...socialMeta({ title: seo.title, description, path: `/categories/${cat.slug}`, locale }),
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [cat, { t, locale }, rates] = await Promise.all([getCategoryBySlug(slug), getI18n(), getShippingRates()]);
  if (!cat) notFound();
  const name = categoryName(t.categories, cat);
  const description = t.categoryDescriptions[cat.slug] ?? cat.description;
  const seo = categorySeo(cat.slug, name, locale);
  const faq = seo.faq(shippingFacts(rates));
  const inLanguage = locale === "sw" ? "sw-TZ" : "en-TZ";
  const top = await listProducts({ category: cat.slug, page: 1 }).then((r) => r.items.slice(0, 12)).catch(() => []);
  const url = absoluteUrl(localizedPath(`/categories/${cat.slug}`, locale));
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#collection`,
      name: seo.title,
      description: seo.description,
      url,
      inLanguage,
      isPartOf: { "@id": absoluteUrl("/#website") },
      about: { "@type": "Thing", name },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: cat.product_count ?? top.length,
        itemListElement: top.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/products/${p.slug}`), name: p.name })),
      },
    },
    faqJsonLd(faq, inLanguage),
  ];

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <section className="container-page pt-6 sm:pt-10">
        <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.common.shop, href: "/products" }, { label: name }]} />
        <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-surface-2">
          {cat.image_url && <Image src={cat.image_url} alt="" fill priority sizes="100vw" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
          <div className="relative max-w-xl px-6 py-14 text-white sm:px-12 sm:py-20 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{plural(t.common.products, cat.product_count ?? 0)}</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">{name}</h1>
            {description && <p className="mt-4 text-pretty text-lg text-white/80">{description}</p>}
          </div>
        </div>
      </section>
      <div className="container-page mt-10">
        <CatalogView params={sp} basePath={`/categories/${cat.slug}`} fixedCategory={cat.slug} />
      </div>
      <section className="container-page mt-20 grid gap-10 border-t border-border pt-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20" aria-labelledby="category-about">
        <div>
          <h2 id="category-about" className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{seo.title}</h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted">{seo.intro}</p>
        </div>
        <FaqList items={faq} defaultOpen={1} />
      </section>
    </div>
  );
}
