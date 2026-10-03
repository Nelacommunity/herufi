"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Heart, Package, User } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useUI } from "@/providers/ui-provider";
import { useStore } from "@/providers/store-provider";
import type { Category } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { categoryName } from "@/lib/utils";

export function MobileMenu({ categories }: { categories: Category[] }) {
  const { menuOpen, closeMenu } = useUI();
  const { user, isAdmin } = useStore();
  const { t } = useI18n();

  return (
    <Sheet open={menuOpen} onClose={closeMenu} side="left" title={t.nav.menu}>
      <nav className="flex flex-col gap-8 p-5" aria-label="Mobile">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/products?sort=newest" onClick={closeMenu} className="rounded-2xl bg-surface-2 p-4 text-sm font-medium">{t.nav.newIn}</Link>
          <Link href="/products?deals=1" onClick={closeMenu} className="rounded-2xl bg-sale-soft p-4 text-sm font-medium text-sale">{t.nav.deals}</Link>
        </div>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.nav.categories}</h3>
          <ul>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} onClick={closeMenu} className="flex items-center gap-3 rounded-xl py-2.5 pr-1">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                    {c.image_url && <Image src={c.image_url} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <span className="flex-1 font-medium">{categoryName(t.categories, c)}</span>
                  <ChevronRight className="h-4 w-4 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-1 border-t border-border pt-6">
          <Link href={user ? "/account" : "/login"} onClick={closeMenu} className="flex items-center gap-3 rounded-xl py-2.5 font-medium">
            <User className="h-5 w-5" /> {user ? t.nav.myAccount : t.nav.signInOrCreate}
          </Link>
          <Link href="/account/orders" onClick={closeMenu} className="flex items-center gap-3 rounded-xl py-2.5 font-medium">
            <Package className="h-5 w-5" /> {t.nav.orders}
          </Link>
          <Link href="/wishlist" onClick={closeMenu} className="flex items-center gap-3 rounded-xl py-2.5 font-medium">
            <Heart className="h-5 w-5" /> {t.nav.wishlist}
          </Link>
          {isAdmin && <Link href="/admin" onClick={closeMenu} className="block rounded-xl py-2.5 font-medium">{t.nav.admin}</Link>}
        </section>
        <div className="space-y-4 border-t border-border pt-6 text-sm text-muted">
          <LanguageSwitcher />
          <div className="flex items-center justify-between">
            <Link href="/help" onClick={closeMenu}>{t.nav.help}</Link>
            <ThemeToggle withLabel />
          </div>
        </div>
      </nav>
    </Sheet>
  );
}
