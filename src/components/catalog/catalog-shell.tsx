"use client";

import { createContext, useCallback, useContext, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Update = Record<string, string | string[] | null>;
const Ctx = createContext<{ update: (u: Update, opts?: { keepPage?: boolean }) => void; clear: () => void; pending: boolean } | null>(null);

/** Owns URL-driven filter state and shows a soft pending state while the server re-renders results. */
export function CatalogShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback((u: Update, opts?: { keepPage?: boolean }) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(u)) {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((v) => next.append(key, v));
      else if (value != null && value !== "") next.set(key, value);
    }
    if (!opts?.keepPage) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }, [params, pathname, router]);

  const clear = useCallback(() => {
    const q = params.get("q");
    startTransition(() => router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, { scroll: false }));
  }, [params, pathname, router]);

  return <Ctx.Provider value={{ update, clear, pending }}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogShell>");
  return ctx;
}

export function PendingResults({ children }: { children: ReactNode }) {
  const { pending } = useCatalog();
  return <div className={cn("transition-opacity duration-300", pending && "pointer-events-none opacity-50")} aria-busy={pending}>{children}</div>;
}
