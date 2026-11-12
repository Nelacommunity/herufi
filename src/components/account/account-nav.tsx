"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Heart, LayoutDashboard, LogOut, MapPin, Package, Settings, User } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

const LINKS = [
  { href: "/account", key: "profile", icon: User, exact: true },
  { href: "/account/orders", key: "orders", icon: Package },
  { href: "/wishlist", key: "wishlist", icon: Heart },
  { href: "/account/addresses", key: "addresses", icon: MapPin },
  { href: "/account/recently-viewed", key: "viewed", icon: Clock },
  { href: "/account/settings", key: "settings", icon: Settings },
] as const;

export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useStore();
  const { t } = useI18n();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
        {LINKS.map(({ href, key, icon: Icon, ...rest }) => {
          const exact = "exact" in rest;
          return (
          <li key={href} className="shrink-0">
            <Link href={href} aria-current={active(href, exact) ? "page" : undefined}
              className={cn("flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-colors lg:rounded-xl",
                active(href, exact) ? "bg-foreground text-background lg:bg-surface-2 lg:text-foreground" : "bg-surface-2 text-muted hover:text-foreground lg:bg-transparent lg:hover:bg-surface-2")}>
              <Icon className="hidden h-4 w-4 lg:block" /> {t.account.nav[key]}
            </Link>
          </li>
        );})}
        {isAdmin && (
          <li className="shrink-0 lg:mt-4 lg:border-t lg:border-border lg:pt-4">
            <Link href="/admin" className="flex items-center gap-3 whitespace-nowrap rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground lg:rounded-xl lg:bg-transparent lg:hover:bg-surface-2">
              <LayoutDashboard className="hidden h-4 w-4 lg:block" /> {t.account.nav.admin}
            </Link>
          </li>
        )}
        <li className="shrink-0 lg:mt-4 lg:border-t lg:border-border lg:pt-4">
          <button onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}
            className="flex w-full items-center gap-3 whitespace-nowrap rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground lg:rounded-xl lg:bg-transparent lg:hover:bg-surface-2">
            <LogOut className="hidden h-4 w-4 lg:block" /> {t.common.signOut}
          </button>
        </li>
      </ul>
    </nav>
  );
}
