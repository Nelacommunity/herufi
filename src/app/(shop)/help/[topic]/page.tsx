import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { HELP_TOPICS } from "@/lib/help";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { jsonLd, pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/help/[topic]">): Promise<Metadata> {
  const [{ topic }, { locale }] = await Promise.all([params, getI18n()]);
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  return found ? { title: found[locale].title, description: found[locale].summary, alternates: pageAlternates(`/help/${found.slug}`, locale) } : {};
}

export default async function HelpTopicPage({ params }: PageProps<"/help/[topic]">) {
  const [{ topic }, { t, locale }] = await Promise.all([params, getI18n()]);
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  if (!found) notFound();
  const content = found[locale];
  // Every help topic is a set of questions with direct answers: expose the FAQ topic as FAQPage.
  const faqSchema = found.slug === "faq" ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "sw" ? "sw-TZ" : "en-TZ",
    mainEntity: content.sections.map((s) => ({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: s.body.join(" ") } })),
  } : null;
  return (
    <div className="container-page pt-8 sm:pt-12">
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema)} />}
      <Breadcrumbs items={[{ label: t.help.crumb, href: "/help" }, { label: content.title }]} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t.help.topics} className="hidden lg:block">
          <ul className="sticky top-24 space-y-1">
            {HELP_TOPICS.map((x) => (
              <li key={x.slug}><Link href={`/help/${x.slug}`} className={cn("block rounded-lg px-3 py-2 text-sm", x.slug === found.slug ? "bg-surface-2 font-medium" : "text-muted hover:text-foreground")}>{x[locale].title}</Link></li>
            ))}
          </ul>
        </nav>
        <article className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{content.title}</h1>
          <p className="mt-3 text-lg text-muted">{content.summary}</p>
          <div className="mt-10 space-y-10">
            {content.sections.map((s) => (
              <section key={s.heading} id={s.id} className="scroll-mt-28">
                <h2 className="text-xl font-semibold">{s.heading}</h2>
                {s.body.map((p) => <p key={p} className="mt-3 text-pretty leading-relaxed text-muted">{p}</p>)}
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
