import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getI18n } from "@/i18n/server";
import type { Category } from "@/lib/types";
import { categoryName } from "@/lib/utils";

export async function Footer({ categories }: { categories: Category[] }) {
  const { t } = await getI18n();
  const f = t.footer;
  const columns = [
    { title: f.shop, links: [{ href: "/products?sort=newest", label: f.newArrivals }, { href: "/products?sort=popular", label: f.bestSellers }, { href: "/products?deals=1", label: f.deals }, ...categories.slice(0, 5).map((c) => ({ href: `/categories/${c.slug}`, label: categoryName(t.categories, c) }))] },
    { title: f.help, links: [{ href: "/help/shipping", label: f.shipping }, { href: "/help/returns", label: f.returns }, { href: "/help/faq", label: f.faq }, { href: "/help/contact", label: f.contact }, { href: "/account/orders", label: f.track }] },
    { title: f.company, links: [{ href: "/help/about", label: f.about }, { href: "/help/privacy", label: f.privacy }, { href: "/help/terms", label: f.terms }] },
  ];
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr] lg:gap-20">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-pretty text-muted">{f.blurb}</p>
          <p className="mb-3 mt-8 text-sm font-medium">{f.newsletter}</p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted md:flex-row">
          <p>© {new Date().getFullYear()} Herufi. {f.rights}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex flex-wrap items-center justify-center gap-1.5" aria-label={f.payments}>
              {["M-Pesa", "Tigo Pesa", "Airtel Money", "Visa", "Mastercard"].map((p) => (
                <span key={p} className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{p}</span>
              ))}
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
