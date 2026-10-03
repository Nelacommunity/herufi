"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, MapPin, Package, Settings, User } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { initials } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function AccountMenu() {
  const { user, isAdmin, signOut } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!user) return null;

  const items = [
    { href: "/account", label: t.nav.account, icon: User },
    { href: "/account/orders", label: t.nav.orders, icon: Package },
    { href: "/wishlist", label: t.nav.wishlist, icon: Heart },
    { href: "/account/addresses", label: t.nav.addresses, icon: MapPin },
    { href: "/account/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.accountMenu}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
          {initials(user.name, user.email)}
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-64 origin-top-right rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-lift)] animate-scale-in">
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-medium">{user.name ?? t.nav.welcomeBack}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="h-px bg-border" />
          <div className="py-1">
            {items.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                <Icon className="h-4 w-4 text-muted" /> {label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
                <LayoutDashboard className="h-4 w-4 text-muted" /> {t.nav.admin}
              </Link>
            )}
          </div>
          <div className="h-px bg-border" />
          <button
            role="menuitem"
            onClick={async () => { setOpen(false); await signOut(); router.push("/"); router.refresh(); }}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            <LogOut className="h-4 w-4 text-muted" /> {t.common.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
