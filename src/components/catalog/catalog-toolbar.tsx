"use client";

import { useState } from "react";
import { ArrowUpDown, Check, SlidersHorizontal, X } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { useCatalog } from "@/components/catalog/catalog-shell";
import { SORT_OPTIONS } from "@/lib/constants";
import type { ProductFilters } from "@/lib/queries/catalog";
import type { Category } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { categoryName } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt, plural } from "@/i18n/config";

type Props = { filters: ProductFilters; total: number; categories: Category[]; brands: { brand: string; count: number }[]; fixedCategory?: string; activeCount: number };

export function CatalogToolbar({ filters, total, categories, brands, fixedCategory, activeCount }: Props) {
  const { update, pending } = useCatalog();
  const { t } = useI18n();
  const c = t.catalog;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortLabel = c.sort[filters.sort ?? "recommended"];

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">{pending ? c.updating : plural(t.common.products, total)}</p>
        <label className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted">{c.sortBy}</span>
          <Select value={filters.sort} onChange={(e) => update({ sort: e.target.value === "recommended" ? null : e.target.value })} className="h-10 w-52 rounded-full text-sm">
            {SORT_OPTIONS.map((o) => <option key={o} value={o}>{c.sort[o]}</option>)}
          </Select>
        </label>
      </div>

      {/* Mobile controls */}
      <div className="sticky top-14 z-30 -mx-4 mt-4 grid grid-cols-2 gap-2 border-y border-border bg-background/90 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
        <Button variant="secondary" size="md" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> {c.filters} {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] text-background">{activeCount}</span>}
        </Button>
        <Button variant="secondary" size="md" onClick={() => setSortOpen(true)}>
          <ArrowUpDown className="h-4 w-4" /> <span className="truncate">{sortLabel}</span>
        </Button>
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} side="bottom" title={c.filters}
        footer={<Button size="lg" className="w-full" loading={pending} onClick={() => setFiltersOpen(false)}>{fmt(c.showResults, { n: plural(t.common.results, total) })}</Button>}>
        <div className="p-5"><FilterPanel filters={filters} categories={categories} brands={brands} fixedCategory={fixedCategory} /></div>
      </Sheet>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} side="bottom" title={c.sortBy}>
        <ul className="p-3" role="listbox" aria-label={c.sortBy}>
          {SORT_OPTIONS.map((o) => (
            <li key={o}>
              <button role="option" aria-selected={filters.sort === o}
                onClick={() => { update({ sort: o === "recommended" ? null : o }); setSortOpen(false); }}
                className={cn("flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left", filters.sort === o ? "bg-surface-2 font-semibold" : "hover:bg-surface-2")}>
                {c.sort[o]} {filters.sort === o && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

export function ActiveFilters({ filters, fixedCategory, categories }: { filters: ProductFilters; fixedCategory?: string; categories: Category[] }) {
  const { update, clear } = useCatalog();
  const { t } = useI18n();
  const c = t.catalog;
  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.category && !fixedCategory) chips.push({ label: (() => { const cat = categories.find((x) => x.slug === filters.category); return cat ? categoryName(t.categories, cat) : filters.category!; })(), onRemove: () => update({ category: null }) });
  filters.brands?.forEach((b) => chips.push({ label: b, onRemove: () => update({ brand: filters.brands!.filter((x) => x !== b) }) }));
  if (filters.minPrice != null || filters.maxPrice != null) {
    const label = filters.minPrice != null && filters.maxPrice != null ? `${formatPrice(filters.minPrice, { compact: true })} – ${formatPrice(filters.maxPrice, { compact: true })}`
      : filters.minPrice != null ? fmt(c.from, { amount: formatPrice(filters.minPrice, { compact: true }) }) : fmt(c.under, { amount: formatPrice(filters.maxPrice!, { compact: true }) });
    chips.push({ label, onRemove: () => update({ min: null, max: null }) });
  }
  if (filters.rating) chips.push({ label: `${filters.rating}★ ${c.andUp}`, onRemove: () => update({ rating: null }) });
  if (filters.inStock) chips.push({ label: c.inStock, onRemove: () => update({ stock: null }) });
  if (filters.deals) chips.push({ label: c.onSale, onRemove: () => update({ deals: null }) });
  if (!chips.length) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button key={chip.label} onClick={chip.onRemove} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-3 pr-2 text-sm transition-colors hover:bg-surface-3 animate-scale-in" aria-label={fmt(c.removeFilter, { label: chip.label })}>
          {chip.label} <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <button onClick={clear} className="px-2 text-sm font-medium underline-offset-4 hover:underline">{c.clearAll}</button>
    </div>
  );
}
