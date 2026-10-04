"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { AccountMenu } from "@/components/layout/account-menu";
import { useStore } from "@/providers/store-provider";
import { useUI } from "@/providers/ui-provider";
import { NAV_CATEGORIES } from "@/lib/constants";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { itemCount, ready, bump, openCart, wishlist, user } = useStore();
  const { openSearch, openMenu } = useUI();
  const { t } = useI18n();
  const links = [
    { href: "/products?sort=newest", label: t.nav.newIn },
    ...NAV_CATEGORIES.map((slug) => ({ href: `/categories/${slug}`, label: t.categories[slug] })),
    { href: "/products?deals=1", label: t.nav.deals, sale: true },
  ];
  const [scrolled, setScrolled] = useState(false);
  const [bumping, setBumping] = useState(false);
  const firstBump = useRef(bump);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (bump === firstBump.current) return;
    setBumping(true);
    const t = setTimeout(() => setBumping(false), 500);
    return () => clearTimeout(t);
  }, [bump]);

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    return path !== "/products" && pathname.startsWith(path);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled ? "bg-background/80 shadow-[0_1px_0_var(--border)] backdrop-blur-xl backdrop-saturate-150" : "bg-background",
      )}
    >
      <div className={cn("container-page flex items-center gap-2 transition-[height] duration-300 lg:gap-8", scrolled ? "h-14 lg:h-16" : "h-16 lg:h-20")}>
        <button onClick={openMenu} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 lg:hidden" aria-label={t.nav.openMenu}>
          <Menu className="h-5 w-5" />
        </button>

        <Logo className={cn("text-[24px] transition-[font-size] duration-300 sm:text-[28px]", scrolled && "sm:text-[25px]")} />

        <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2",
                isActive(l.href) ? "text-foreground" : "text-muted hover:text-foreground",
                l.sale && "text-sale hover:text-sale",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <LanguageSwitcher compact className="mr-1 hidden sm:inline-flex" />
          <button
            onClick={openSearch}
            className="hidden h-10 w-64 items-center gap-2.5 rounded-full border border-border bg-surface px-4 text-sm text-subtle transition-colors hover:border-border-strong md:flex lg:hidden xl:flex xl:w-60 2xl:w-72"
            aria-label={t.nav.searchProducts}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">{t.nav.searchProducts}</span>
            <kbd className="rounded-md border border-border px-1.5 font-mono text-[11px] text-muted">⌘K</kbd>
          </button>
          <button onClick={openSearch} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2 md:hidden lg:grid xl:hidden" aria-label={t.common.search}>
            <Search className="h-5 w-5" />
          </button>

          <Link href="/wishlist" className="relative hidden h-10 w-10 place-items-center rounded-full hover:bg-surface-2 sm:grid" aria-label={wishlist.length ? fmt(t.nav.wishlistCount, { n: wishlist.length }) : t.nav.wishlist}>
            <Heart className="h-5 w-5" />
            {ready && wishlist.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-sale ring-2 ring-background" />}
          </Link>

          {user ? (
            <AccountMenu />
          ) : (
            <Link href="/login" className="hidden h-10 w-10 place-items-center rounded-full hover:bg-surface-2 sm:grid" aria-label={t.common.signIn}>
              <User className="h-5 w-5" />
            </Link>
          )}

          <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label={fmt(t.nav.bag, { n: itemCount })}>
            <ShoppingBag className={cn("h-5 w-5", bumping && "animate-bump")} />
            {ready && itemCount > 0 && (
              <span key={bump} className="absolute -right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background animate-pop">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
