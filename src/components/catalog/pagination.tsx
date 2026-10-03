import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, pageCount, basePath, params, labels }: { page: number; pageCount: number; basePath: string; params: Record<string, string | string[] | undefined>; labels: { nav: string; prev: string; next: string } }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v == null) continue;
      (Array.isArray(v) ? v : [v]).forEach((x) => sp.append(k, x));
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);

  const cell = "grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm font-medium transition-colors";
  return (
    <nav aria-label={labels.nav} className="mt-16 flex items-center justify-center gap-1">
      {page > 1 ? <Link href={href(page - 1)} className={cn(cell, "hover:bg-surface-2")} aria-label={labels.prev} rel="prev"><ChevronLeft className="h-4 w-4" /></Link> : <span className={cn(cell, "opacity-30")}><ChevronLeft className="h-4 w-4" /></span>}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={cn(cell, p === page ? "bg-foreground text-background" : "hover:bg-surface-2")}>{p}</Link>
        </span>
      ))}
      {page < pageCount ? <Link href={href(page + 1)} className={cn(cell, "hover:bg-surface-2")} aria-label={labels.next} rel="next"><ChevronRight className="h-4 w-4" /></Link> : <span className={cn(cell, "opacity-30")}><ChevronRight className="h-4 w-4" /></span>}
    </nav>
  );
}
