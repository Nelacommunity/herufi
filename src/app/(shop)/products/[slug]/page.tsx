import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductGallery } from "@/components/product/product-gallery";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { ReviewsSection } from "@/components/product/reviews-section";
import { QuestionsSection } from "@/components/product/questions-section";
import { ProductRail } from "@/components/product/product-grid";
import { getAllProductSlugs, getProductBySlug, getQuestions, getRelatedProducts, getReviews } from "@/lib/queries/catalog";
import { isInStock } from "@/lib/queries/shared";
import { SITE_URL } from "@/lib/env";
import { SITE } from "@/lib/constants";
import { getI18n } from "@/i18n/server";
import { categoryName } from "@/lib/utils";

export async function generateStaticParams() {
  try {
    return (await getAllProductSlugs()).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const description = `${product.description.slice(0, 155).trimEnd()}…`;
  const image = product.images[0];
  return {
    title: `${product.name} by ${product.brand}`,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      images: image ? [{ url: image.image_url.replace("w=1600", "w=1200"), width: 1200, height: 1500, alt: image.alt_text || product.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title: product.name, description, images: image ? [image.image_url] : undefined },
    other: { "product:price:amount": product.price.toFixed(2), "product:price:currency": "TZS" },
  };
}

function Disclosure({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-border" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="pb-6 text-pretty leading-relaxed text-muted">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [reviews, questions, related, { t }] = await Promise.all([getReviews(product.id), getQuestions(product.id), getRelatedProducts(product), getI18n()]);
  const p = t.product;
  const inStock = isInStock(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku ?? undefined,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category?.name,
    image: product.images.map((i) => i.image_url),
    url: `${SITE_URL}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: "TZS",
      price: product.price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE.name },
    },
    ...(product.review_count > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.review_count },
      review: reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        author: { "@type": "Person", name: r.author_name },
        name: r.title,
        reviewBody: r.content,
        datePublished: r.created_at.slice(0, 10),
      })),
    }),
  };

  const badge = !inStock ? <Badge tone="glass">{p.soldOut}</Badge> : product.discount_percent > 0 ? <Badge tone="sale">−{product.discount_percent}%</Badge> : null;

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-page pt-4 sm:pt-8">
        <div className="hidden sm:block">
          <Breadcrumbs items={[
            { label: t.common.home, href: "/" },
            ...(product.category ? [{ label: categoryName(t.categories, product.category), href: `/categories/${product.category.slug}` }] : []),
            { label: product.name },
          ]} />
        </div>

        <div className="mt-0 grid gap-8 sm:mt-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14 xl:gap-20">
          <ProductGallery images={product.images} name={product.name} badge={badge} />
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PurchasePanel product={product} />
          </div>
        </div>

        <div className="mt-20 grid gap-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14 xl:gap-20">
          <div>
            <Disclosure title={p.description} defaultOpen>
              <p>{product.description}</p>
              {product.details.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {product.details.map((d) => <li key={d} className="flex gap-3"><span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />{d}</li>)}
                </ul>
              )}
            </Disclosure>
            {Object.keys(product.specifications).length > 0 && (
              <Disclosure title={p.specifications} defaultOpen>
                <dl className="divide-y divide-border rounded-xl border border-border">
                  {Object.entries(product.specifications).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[40%_1fr] gap-4 px-4 py-3 text-sm">
                      <dt className="font-medium text-foreground">{k}</dt><dd>{String(v)}</dd>
                    </div>
                  ))}
                  {product.sku && <div className="grid grid-cols-[40%_1fr] gap-4 px-4 py-3 text-sm"><dt className="font-medium text-foreground">{p.sku}</dt><dd className="font-mono text-xs leading-5">{product.sku}</dd></div>}
                </dl>
              </Disclosure>
            )}
            <Disclosure title={p.shippingInfo}>
              <ul className="space-y-2">
                {p.shippingLines.map(([label, text]) => <li key={label}><strong className="text-foreground">{label}</strong>: {text}</li>)}
              </ul>
            </Disclosure>
            <Disclosure title={p.returnsPolicy}>
              <p>{p.returnsPolicyText}</p>
            </Disclosure>
          </div>
          <div className="space-y-16">
            <QuestionsSection questions={questions} productId={product.id} slug={product.slug} />
          </div>
        </div>

        <div className="mt-20 border-t border-border pt-16">
          <ReviewsSection reviews={reviews} rating={product.rating} count={product.review_count} productId={product.id} slug={product.slug} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-page mt-24">
          <SectionHeading eyebrow={p.alsoLike} title={p.related} href={product.category ? `/categories/${product.category.slug}` : "/products"} linkLabel={t.common.viewAll} />
          <ProductRail products={related.slice(0, 8)} />
        </section>
      )}
    </div>
  );
}
