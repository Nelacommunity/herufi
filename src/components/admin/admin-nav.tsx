"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BadgePercent, FolderTree, LayoutDashboard, Menu, Package, Ship, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { can, canAny, isSuperAdmin, ROLE_LABEL, type StaffRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type NavProfile = { role: string; status: string; permissions: string[] };

type Who = NavProfile;
const LINKS: { href: string; label: string; icon: typeof Package; exact?: boolean; show: (p: Who) => boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, show: () => true },
  { href: "/admin/products", label: "Products", icon: Package, show: (p) => canAny(p, "products.create", "products.edit", "products.delete", "questions.answer") },
  { href: "/admin/categories", label: "Categories", icon: FolderTree, show: (p) => can(p, "categories.manage") },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, show: (p) => can(p, "orders.view") },
  { href: "/admin/customers", label: "Customers", icon: Users, show: (p) => can(p, "customers.view") },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent, show: () => true },
  { href: "/admin/shipping", label: "Shipping", icon: Ship, show: (p) => can(p, "shipping.manage") },
  { href: "/admin/staff", label: "Staff", icon: ShieldCheck, show: (p) => isSuperAdmin(p) },
];

function NavLinks({ profile, onNavigate }: { profile: Who; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {LINKS.filter((l) => l.show(profile)).map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSidebar({ name, profile }: { name: string; profile: Who }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-3"><Logo className="text-2xl" /><span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Admin</span></div>
      <nav aria-label="Admin" className="mt-10 flex-1"><NavLinks profile={profile} /></nav>
      <div className="space-y-1 border-t border-border pt-4">
        <Link href="/" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-foreground">View store <ArrowUpRight className="h-4 w-4" /></Link>
        <div className="flex items-center justify-between gap-2 px-3">
          <span className="min-w-0"><span className="block truncate text-sm text-muted">{name}</span><span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">{ROLE_LABEL[profile.role as StaffRole] ?? profile.role}</span></span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

export function AdminTopbar({ profile }: { profile: Who }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
      <button onClick={() => setOpen(true)} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button>
      <Logo className="text-2xl" />
      <ThemeToggle />
      <Sheet open={open} onClose={() => setOpen(false)} side="left" title="Admin">
        <nav aria-label="Admin" className="p-4"><NavLinks profile={profile} onNavigate={() => setOpen(false)} /></nav>
        <div className="border-t border-border p-4"><Link href="/" className="text-sm text-muted">← Back to store</Link></div>
      </Sheet>
    </header>
  );
}
