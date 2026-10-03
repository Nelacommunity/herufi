import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HELP_TOPICS } from "@/lib/help";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.help.crumb, description: t.help.desc };
}

export default async function HelpIndex() {
  const { t, locale } = await getI18n();
  return (
    <div className="container-page max-w-5xl pt-10 sm:pt-16">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{t.help.title}</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">{t.help.desc}</p>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_TOPICS.map((topic) => (
          <Link key={topic.slug} href={`/help/${topic.slug}`} className="group flex flex-col justify-between rounded-2xl border border-border p-6 transition-all hover:border-border-strong hover:shadow-[var(--shadow-soft)]">
            <div><h2 className="text-lg font-semibold">{topic[locale].title}</h2><p className="mt-1 text-sm text-muted">{topic[locale].summary}</p></div>
            <ArrowUpRight className="mt-8 h-5 w-5 text-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
