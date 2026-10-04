import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { FaqList, faqJsonLd } from "@/components/seo/faq-list";
import { getI18n } from "@/i18n/server";
import { getShippingExamples, getShippingRates } from "@/lib/queries/catalog";
import { GUIDE_SLUG, GUIDE_UPDATED, guideContent, homeFaq, shippingFacts } from "@/lib/seo-content";
import { absoluteUrl, jsonLd, pageAlternates } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";

const PATH = `/guides/${GUIDE_SLUG}`;
const EXAMPLES = ["kova-pods-pro-earbuds", "vale-14-ultrabook", "velvet-three-seat-sofa"];

export async function generateMetadata(): Promise<Metadata> {
  const [{ locale }, rates] = await Promise.all([getI18n(), getShippingRates()]);
  const g = guideContent(locale, shippingFacts(rates));
  return {
    title: g.metaTitle,
    description: g.description,
    alternates: pageAlternates(PATH, locale),
    openGraph: { type: "article", title: g.title, description: g.description, url: PATH, publishedTime: "2026-10-01", modifiedTime: GUIDE_UPDATED },
  };
}

export default async function GuidePage() {
  const [{ t, locale }, rates, examples] = await Promise.all([getI18n(), getShippingRates(), getShippingExamples(EXAMPLES)]);
  const facts = shippingFacts(rates);
  const g = guideContent(locale, facts);
  const faq = homeFaq(locale, facts);
  const inLanguage = locale === "sw" ? "sw-TZ" : "en-TZ";
  const methodLabel = (m: string) => t.shipping.methods[m]?.label ?? m;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.description,
      inLanguage,
      datePublished: "2026-10-01",
      dateModified: GUIDE_UPDATED,
      mainEntityOfPage: absoluteUrl(PATH),
      image: absoluteUrl("/opengraph-image"),
      author: { "@type": "Organization", name: SITE.name, url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") } },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: g.stepsTitle,
      inLanguage,
      totalTime: `P${facts.airDays.split("–")[0]}D`,
      step: g.steps.map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
    },
    faqJsonLd(faq, inLanguage),
  ];

  return (
    <article className="container-page max-w-4xl pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(schema)} />
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.help.crumb, href: "/help" }, { label: g.title }]} />

      <header className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{g.eyebrow}</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{g.title}</h1>
        <p className="mt-4 text-sm text-muted">{g.updated} <time dateTime={GUIDE_UPDATED}>{formatDate(GUIDE_UPDATED, "long", locale)}</time> · {SITE.name}</p>
      </header>

      {/* Answer-first summary for answer engines and skimmers */}
      <section className="mt-10 rounded-[1.5rem] bg-surface-2 p-6 sm:p-8" aria-labelledby="summary">
        <h2 id="summary" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{g.summaryTitle}</h2>
        <p className="mt-3 text-pretty text-lg leading-relaxed">{g.summary}</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{g.stepsTitle}</h2>
        <ol className="mt-6 space-y-5">
          {g.steps.map(([name, text], i) => (
            <li key={name} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
              <div><h3 className="font-semibold">{name}</h3><p className="mt-1 text-pretty leading-relaxed text-muted">{text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{g.costTitle}</h2>
        <p className="mt-3 text-muted">{g.costIntro}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-surface-2"><tr>{g.costHeaders.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{g.costRows.map((row) => <tr key={row[0]} className="border-t border-border">{row.map((c, i) => i === 0 ? <th key={i} scope="row" className="px-4 py-3 font-medium">{c}</th> : <td key={i} className="px-4 py-3 text-muted">{c}</td>)}</tr>)}</tbody>
          </table>
        </div>

        {examples.length > 0 && (
          <>
            <h3 className="mt-10 text-xl font-semibold">{g.examplesTitle}</h3>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-surface-2">
                  <tr><th scope="col" className="px-4 py-3 font-semibold">{t.search.products}</th>{examples[0].options.map((o) => <th key={o.method} scope="col" className="px-4 py-3 font-semibold">{methodLabel(o.method)}</th>)}</tr>
                </thead>
                <tbody>
                  {examples.map((e) => (
                    <tr key={e.slug} className="border-t border-border">
                      <th scope="row" className="px-4 py-3 font-medium"><Link href={`/products/${e.slug}`} className="hover:underline">{e.name}</Link><span className="block text-xs font-normal text-muted">{formatPrice(e.price)} · {e.weight_kg} kg</span></th>
                      {e.options.map((o) => (
                        <td key={o.method} className="px-4 py-3 tabular-nums">
                          {!o.available ? <span className="text-muted">{t.shipping.unavailable}</span>
                            : o.price === 0 ? <span className="font-medium text-success">{t.common.free}{o.list_price > 0 && <span className="ml-1 text-xs font-normal text-subtle line-through">{formatPrice(o.list_price)}</span>}</span>
                            : formatPrice(o.price)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h3 className="mt-10 text-xl font-semibold">{g.chargeableTitle}</h3>
        <p className="mt-2 text-pretty leading-relaxed text-muted">{g.chargeable}</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{g.customsTitle}</h2>
        <p className="mt-3 text-pretty leading-relaxed text-muted">{g.customs}</p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{g.compareTitle}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-surface-2"><tr>{g.compareHeaders.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{g.compareRows.map((row) => <tr key={row[0]} className="border-t border-border">{row.map((c, i) => i === 0 ? <th key={i} scope="row" className="px-4 py-3 font-medium">{c}</th> : <td key={i} className={i === 1 ? "px-4 py-3 font-medium text-success" : "px-4 py-3 text-muted"}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">{g.faqTitle}</h2>
        <FaqList items={faq} defaultOpen={2} />
      </section>

      <section className="mt-14 rounded-[1.5rem] bg-foreground p-8 text-background sm:p-10">
        <h2 className="text-2xl font-semibold tracking-tight">{g.ctaTitle}</h2>
        <p className="mt-2 opacity-75">{g.ctaBody}</p>
        <Link href="/products" className={buttonVariants({ variant: "inverse", size: "lg", className: "group mt-6" })}>{g.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
      </section>
    </article>
  );
}
