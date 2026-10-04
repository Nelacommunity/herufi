import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCategories, getCategoryBySlug } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";
import { plural } from "@/i18n/config";
import { categoryName } from "@/lib/utils";
import { SEO_COPY } from "@/lib/seo-content";
import { pageAlternates } from "@/lib/seo";

export async function generateStaticParams() {
  try {
    return (await getCategories()).map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [cat, { t, locale }] = await Promise.all([getCategoryBySlug(slug), getI18n()]);
  if (!cat) return { title: "404" };
  const name = categoryName(t.categories, cat);
  const copy = SEO_COPY[locale];
  const description = copy.categoryDescription(name, cat.product_count ?? 0);
  return {
    title: copy.categoryTitle(name),
    description,
    alternates: pageAlternates(`/categories/${cat.slug}`, locale),
    openGraph: { title: name, description, images: cat.image_url ? [{ url: cat.image_url, width: 1200, height: 800, alt: cat.name }] : undefined },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [cat, { t }] = await Promise.all([getCategoryBySlug(slug), getI18n()]);
  if (!cat) notFound();
  const name = categoryName(t.categories, cat);
  const description = t.categoryDescriptions[cat.slug] ?? cat.description;

  return (
    <div className="pb-8">
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
    </div>
  );
}
