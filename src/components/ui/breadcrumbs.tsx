import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/env";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-subtle" aria-hidden />}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-foreground">{c.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-foreground line-clamp-1">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
