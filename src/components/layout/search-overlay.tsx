"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clock, Search, TrendingUp, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useUI } from "@/providers/ui-provider";
import { POPULAR_SEARCHES } from "@/lib/constants";
import type { Category, SearchSuggestion } from "@/lib/types";
import { categoryName, cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

const RECENT_KEY = "herufi:recent-searches";

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function saveRecent(term: string) {
  try {
    const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function SearchOverlay({ categories }: { categories: Category[] }) {
  const { searchOpen, closeSearch } = useUI();
  const { t } = useI18n();
  return (
    <Sheet open={searchOpen} onClose={closeSearch} side="top" title={t.common.search} hideHeader>
      {searchOpen && <SearchPanel categories={categories} onClose={closeSearch} />}
    </Sheet>
  );
}

function SearchPanel({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [response, setResponse] = useState<{ q: string; products: SearchSuggestion[]; failed: boolean } | null>(null);
  const [recent, setRecent] = useState<string[]>(readRecent); // panel only mounts client-side, when opened
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const q = term.trim();

  // Debounced fetch with cancellation of stale requests.
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = await res.json();
        setResponse({ q, products: json.products ?? [], failed: !res.ok });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResponse({ q, products: [], failed: true });
      }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const searching = q.length >= 2;
  const loading = searching && response?.q !== q;
  // Keep the previous results on screen while the next request is in flight.
  const results = useMemo(() => (searching ? response?.products ?? [] : []), [searching, response]);
  const failed = searching && !loading && Boolean(response?.failed);

  const matchingCategories = useMemo(
    () => (q ? categories.filter((c) => `${c.name} ${categoryName(t.categories, c)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : []),
    [categories, q, t],
  );

  // Flat list of navigable targets for keyboard support.
  const targets = useMemo(() => [
    ...matchingCategories.map((c) => `/categories/${c.slug}`),
    ...results.map((p) => `/products/${p.slug}`),
    ...(q ? [`/products?q=${encodeURIComponent(q)}`] : []),
  ], [matchingCategories, results, q]);

  function go(href: string, remember = q) {
    if (remember) saveRecent(remember);
    onClose();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(targets.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && targets[active]) go(targets[active]);
      else if (q) go(`/products?q=${encodeURIComponent(q)}`);
    }
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const itemClass = (i: number) => cn("flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors", active === i ? "bg-surface-2" : "hover:bg-surface-2");

  return (
    <div className="flex h-full flex-col">
      <form
        role="search"
        className="flex items-center gap-3 border-b border-border px-4 sm:px-6"
        onSubmit={(e) => { e.preventDefault(); if (q) go(`/products?q=${encodeURIComponent(q)}`); }}
      >
        <Search className="h-5 w-5 shrink-0 text-muted" />
        <input
          data-autofocus
          value={term}
          onChange={(e) => { setTerm(e.target.value); setActive(-1); }}
          onKeyDown={onKeyDown}
          placeholder={t.search.placeholder}
          className="h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-subtle"
          aria-label={t.common.search}
          role="combobox"
          aria-expanded={targets.length > 0}
          aria-controls="search-results"
          aria-activedescendant={active >= 0 ? `search-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
        />
        {loading && <Spinner className="text-muted" />}
        {term && !loading && (
          <button type="button" onClick={() => { setTerm(""); setActive(-1); }} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={t.search.clear}>
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onClose} className="text-sm font-medium text-muted hover:text-foreground sm:hidden">{t.search.cancel}</button>
        <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted sm:block">esc</kbd>
      </form>

      <div ref={listRef} id="search-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {!q && (
          <div className="space-y-7 p-2 animate-fade-in">
            {recent.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.search.recent}</h3>
                  <button className="text-xs text-muted hover:text-foreground" onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}>{t.search.clearAll}</button>
                </div>
                <ul className="space-y-1">
                  {recent.map((r) => (
                    <li key={r}>
                      <button onClick={() => go(`/products?q=${encodeURIComponent(r)}`, r)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2">
                        <Clock className="h-4 w-4 text-subtle" /> {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.search.popular}</h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button key={s} onClick={() => go(`/products?q=${encodeURIComponent(s)}`, s)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm transition-colors hover:border-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-muted" /> {s}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.search.byCategory}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {categories.map((c) => (
                  <Link key={c.id} href={`/categories/${c.slug}`} onClick={onClose} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2">
                    {c.image_url && <Image src={c.image_url} alt="" fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-2 left-2.5 text-sm font-medium text-white">{categoryName(t.categories, c)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {q && (
          <div className="animate-fade-in">
            {matchingCategories.length > 0 && (
              <section className="mb-4">
                <h3 className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.search.categories}</h3>
                {matchingCategories.map((c, i) => (
                  <button key={c.id} id={`search-opt-${i}`} data-index={i} role="option" aria-selected={active === i} onClick={() => go(`/categories/${c.slug}`)} className={itemClass(i)}>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {c.image_url && <Image src={c.image_url} alt="" fill sizes="40px" className="object-cover" />}
                    </span>
                    <span className="flex-1">{categoryName(t.categories, c)}</span>
                    <span className="text-sm text-muted">{fmt(t.search.itemCount, { n: c.product_count ?? 0 })}</span>
                  </button>
                ))}
              </section>
            )}

            {results.length > 0 && (
              <section>
                <h3 className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{t.search.products}</h3>
                {results.map((p, j) => {
                  const i = matchingCategories.length + j;
                  return (
                    <button key={p.id} id={`search-opt-${i}`} data-index={i} role="option" aria-selected={active === i} onClick={() => go(`/products/${p.slug}`)} className={itemClass(i)}>
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                        {p.image_url && <Image src={p.image_url} alt="" fill sizes="56px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-muted">{p.brand}{p.category_slug ? ` · ${t.categories[p.category_slug] ?? p.category_name}` : ""}</span>
                        <span className="block truncate font-medium">{p.name}</span>
                      </span>
                      <span className="text-right text-sm">
                        <span className={cn("block font-medium", p.compare_at_price && "text-sale")}>{formatPrice(p.price)}</span>
                        {p.compare_at_price && <span className="block text-xs text-subtle line-through">{formatPrice(p.compare_at_price)}</span>}
                      </span>
                    </button>
                  );
                })}
              </section>
            )}

            {!loading && q.length >= 2 && results.length === 0 && matchingCategories.length === 0 && (
              <div className="px-4 py-12 text-center">
                <p className="font-medium">{failed ? t.search.unavailable : fmt(t.search.noResults, { q })}</p>
                <p className="mt-1 text-sm text-muted">{t.search.tryDifferent}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {POPULAR_SEARCHES.slice(0, 4).map((s) => (
                    <button key={s} onClick={() => { setTerm(s); setActive(-1); }} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-foreground">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {q.length >= 1 && (
              <button
                id={`search-opt-${targets.length - 1}`}
                data-index={targets.length - 1}
                role="option"
                aria-selected={active === targets.length - 1}
                onClick={() => go(`/products?q=${encodeURIComponent(q)}`)}
                className={cn(itemClass(targets.length - 1), "mt-2 justify-between font-medium")}
              >
                <span className="flex items-center gap-3"><Search className="h-4 w-4" /> {fmt(t.search.seeAll, { q })}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="hidden items-center gap-4 border-t border-border px-6 py-3 text-xs text-muted sm:flex">
        <span className="flex items-center gap-1.5"><kbd className="rounded border border-border px-1 font-mono">↑</kbd><kbd className="rounded border border-border px-1 font-mono">↓</kbd> {t.search.toNavigate}</span>
        <span className="flex items-center gap-1.5"><kbd className="rounded border border-border px-1 font-mono">↵</kbd> {t.search.toSelect}</span>
        <Link href="/products" onClick={onClose} className="ml-auto inline-flex items-center gap-1 hover:text-foreground">{t.search.browseEverything} <ArrowUpRight className="h-3 w-3" /></Link>
      </div>
    </div>
  );
}
