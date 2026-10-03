"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Search, User } from "lucide-react";
import { useUI } from "@/providers/ui-provider";
import { useStore } from "@/providers/store-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

/** Native-app style bottom navigation on small screens. Hidden where a sticky purchase bar takes over. */
export function MobileTabBar() {
  const pathname = usePathname();
  const { openSearch } = useUI();
  const { user, wishlist, ready } = useStore();
  const { t } = useI18n();
  if (/^\/products\/[^/]+/.test(pathname) || pathname.startsWith("/checkout") || pathname.startsWith("/cart")) return null;

  const tabs = [
    { href: "/", label: t.nav.tabs.home, icon: Home, active: pathname === "/" },
    { href: "/products", label: t.nav.tabs.shop, icon: LayoutGrid, active: pathname.startsWith("/products") || pathname.startsWith("/categories") },
    { label: t.nav.tabs.search, icon: Search, onClick: openSearch },
    { href: "/wishlist", label: t.nav.tabs.saved, icon: Heart, active: pathname === "/wishlist", dot: ready && wishlist.length > 0 },
    { href: user ? "/account" : "/login", label: user ? t.nav.tabs.account : t.nav.tabs.signIn, icon: User, active: pathname.startsWith("/account") || pathname === "/login" },
  ];

  return (
    <>
      <div className="h-16 sm:hidden" aria-hidden />
      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-safe backdrop-blur-xl sm:hidden">
        <ul className="grid grid-cols-5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const inner = (
              <>
                <span className="relative">
                  <Icon className={cn("h-[22px] w-[22px]", t.active && "stroke-[2.25]")} />
                  {t.dot && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sale ring-2 ring-background" />}
                </span>
                <span className="text-[10px] font-medium">{t.label}</span>
              </>
            );
            const cls = cn("flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors", t.active ? "text-foreground" : "text-subtle");
            return (
              <li key={t.label}>
                {t.href ? <Link href={t.href} className={cls} aria-current={t.active ? "page" : undefined}>{inner}</Link> : <button onClick={t.onClick} className={cls}>{inner}</button>}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
