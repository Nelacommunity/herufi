import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { HELP_TOPICS } from "@/lib/help";
import { companyDetails, fillBusiness } from "@/lib/business";
import { getI18n } from "@/i18n/server";
import { cn, formatDate } from "@/lib/utils";
import { jsonLd, pageAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/help/[topic]">): Promise<Metadata> {
  const [{ topic }, { locale }] = await Promise.all([params, getI18n()]);
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  return found
    ? { title: fillBusiness(found[locale].title, locale), description: fillBusiness(found[locale].summary, locale), alternates: pageAlternates(`/help/${found.slug}`, locale) }
    : {};
}

/** Paragraphs, with runs of "- " lines rendered as bullet lists. */
function Body({ lines }: { lines: string[] }) {
  const blocks: (string | string[])[] = [];
  for (const l of lines) {
    if (l.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (Array.isArray(last)) last.push(l.slice(2)); else blocks.push([l.slice(2)]);
    } else blocks.push(l);
  }
  return (
    <>
      {blocks.map((b, i) => Array.isArray(b) ? (
        <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-muted marker:text-subtle">
          {b.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : <p key={i} className="mt-3 text-pretty leading-relaxed text-muted">{b}</p>)}
    </>
  );
}

export default async function HelpTopicPage({ params }: PageProps<"/help/[topic]">) {
  const [{ topic }, { t, locale }] = await Promise.all([params, getI18n()]);
  const found = HELP_TOPICS.find((x) => x.slug === topic);
  if (!found) notFound();
  const fill = (s: string) => fillBusiness(s, locale);
  const content = found[locale];
  const sections = content.sections.map((s) => ({ ...s, heading: fill(s.heading), body: s.body.map(fill) }));
  if (found.slug === "contact" || found.slug === "terms") sections.push({ id: "company", heading: t.help.company, body: companyDetails(locale) });
  const policies = HELP_TOPICS.filter((x) => x.kind === "policy");
  const isPolicy = found.kind === "policy";

  // Every help topic is a set of questions with direct answers: expose the FAQ topic as FAQPage.
  const faqSchema = found.slug === "faq" ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "sw" ? "sw-TZ" : "en-TZ",
    mainEntity: sections.map((s) => ({ "@type": "Question", name: s.heading, acceptedAnswer: { "@type": "Answer", text: s.body.join(" ") } })),
  } : null;

  const navGroup = (items: typeof HELP_TOPICS, title: string) => (
    <div>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-subtle">{title}</p>
      <ul className="space-y-1">
        {items.map((x) => (
          <li key={x.slug}><Link href={`/help/${x.slug}`} aria-current={x.slug === found.slug ? "page" : undefined} className={cn("block rounded-lg px-3 py-2 text-sm", x.slug === found.slug ? "bg-surface-2 font-medium" : "text-muted hover:text-foreground")}>{fill(x[locale].title)}</Link></li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="container-page pt-8 sm:pt-12">
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema)} />}
      <Breadcrumbs items={[{ label: t.help.crumb, href: "/help" }, { label: fill(content.title) }]} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t.help.topics} className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {navGroup(HELP_TOPICS.filter((x) => x.kind !== "policy"), t.help.topics)}
            {navGroup(policies, t.help.policies)}
          </div>
        </nav>
        <article className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{fill(content.title)}</h1>
          <p className="mt-3 text-lg text-muted">{fill(content.summary)}</p>
          {found.updated && <p className="mt-3 text-sm text-subtle">{t.help.updated.replace("{date}", formatDate(found.updated, "long", locale))}</p>}
          {isPolicy && sections.length > 4 && (
            <nav aria-label={fill(content.title)} className="mt-8 rounded-2xl bg-surface-2 p-5">
              <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
                {sections.map((s, i) => <li key={s.heading}><a href={`#s-${i}`} className="text-muted hover:text-foreground hover:underline">{s.heading}</a></li>)}
              </ol>
            </nav>
          )}
          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <section key={s.heading} id={s.id ?? `s-${i}`} className="scroll-mt-28">
                {s.id && <span id={`s-${i}`} className="block scroll-mt-28" aria-hidden />}
                <h2 className="text-xl font-semibold">{s.heading}</h2>
                <Body lines={s.body} />
              </section>
            ))}
          </div>
          {(isPolicy || found.slug === "returns") && (
            <aside className="mt-14 border-t border-border pt-8">
              <h2 className="text-sm font-semibold">{t.help.related}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {policies.filter((x) => x.slug !== found.slug).map((x) => (
                  <li key={x.slug}><Link href={`/help/${x.slug}`} className="inline-flex rounded-full border border-border px-3.5 py-1.5 text-sm hover:border-foreground">{fill(x[locale].title)}</Link></li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </div>
    </div>
  );
}
