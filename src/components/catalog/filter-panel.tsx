"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/input";
import { useCatalog } from "@/components/catalog/catalog-shell";
import type { ProductFilters } from "@/lib/queries/catalog";
import type { Category } from "@/lib/types";
import { categoryName, cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

const PRICE_PRESETS: { min?: number; max?: number }[] = [
  { max: 100_000 },
  { min: 100_000, max: 300_000 },
  { min: 300_000, max: 1_000_000 },
  { min: 1_000_000 },
];

function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-5 first:pt-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm font-semibold" aria-expanded={open}>
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-expo)]", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden"><div className="pt-4">{children}</div></div>
      </div>
    </div>
  );
}

export function FilterPanel({ filters, categories, brands, fixedCategory }: {
  filters: ProductFilters; categories: Category[]; brands: { brand: string; count: number }[]; fixedCategory?: string;
}) {
  const { update } = useCatalog();
  const { t } = useI18n();
  const c = t.catalog;
  const presetLabel = (p: { min?: number; max?: number }) =>
    p.min == null ? fmt(c.under, { amount: formatPrice(p.max, { compact: true }) }) : p.max == null ? `${formatPrice(p.min, { compact: true })}+` : `${formatPrice(p.min, { compact: true })} – ${formatPrice(p.max, { compact: true })}`;

  const selectedBrands = filters.brands ?? [];
  const toggleBrand = (b: string) =>
    update({ brand: selectedBrands.includes(b) ? selectedBrands.filter((x) => x !== b) : [...selectedBrands, b] });

  return (
    <div>
      <Group title={c.category}>
        <ul className="space-y-1">
          {fixedCategory ? (
            categories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/categories/${cat.slug}`} className={cn("flex items-center justify-between rounded-lg py-1.5 text-[15px] transition-colors", cat.slug === fixedCategory ? "font-semibold" : "text-muted hover:text-foreground")}>
                  {categoryName(t.categories, cat)} <span className="text-xs text-subtle">{cat.product_count}</span>
                </Link>
              </li>
            ))
          ) : (
            <>
              <li>
                <button onClick={() => update({ category: null })} className={cn("flex w-full items-center justify-between py-1.5 text-left text-[15px]", !filters.category ? "font-semibold" : "text-muted hover:text-foreground")}>
                  {c.allCategories}
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button onClick={() => update({ category: cat.slug === filters.category ? null : cat.slug, brand: null })} className={cn("flex w-full items-center justify-between py-1.5 text-left text-[15px] transition-colors", cat.slug === filters.category ? "font-semibold" : "text-muted hover:text-foreground")}>
                    {categoryName(t.categories, cat)} <span className="text-xs text-subtle">{cat.product_count}</span>
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      </Group>

      <Group title={c.price}>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p) => {
            const active = filters.minPrice === p.min && filters.maxPrice === p.max;
            return (
              <button key={presetLabel(p)} onClick={() => update(active ? { min: null, max: null } : { min: p.min?.toString() ?? null, max: p.max?.toString() ?? null })}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border-strong hover:border-foreground")}>
                {presetLabel(p)}
              </button>
            );
          })}
        </div>
        <PriceInputs labels={{ min: c.min, max: c.max, minAria: c.minAria, maxAria: c.maxAria }} key={`${filters.minPrice}-${filters.maxPrice}`} min={filters.minPrice} max={filters.maxPrice} onApply={(min, max) => update({ min, max })} />
      </Group>

      {brands.length > 0 && (
        <Group title={c.brand}>
          <div className="space-y-3">
            {brands.map((b) => (
              <Checkbox key={b.brand} checked={selectedBrands.includes(b.brand)} onChange={() => toggleBrand(b.brand)}
                label={<span className="flex justify-between">{b.brand}<span className="text-xs text-subtle">{b.count}</span></span>} />
            ))}
          </div>
        </Group>
      )}

      <Group title={c.rating}>
        <div className="space-y-1">
          {[4.5, 4, 3].map((r) => (
            <button key={r} onClick={() => update({ rating: filters.rating === r ? null : String(r) })}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors", filters.rating === r ? "bg-surface-2 font-semibold" : "hover:bg-surface-2")}>
              <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn("h-3.5 w-3.5", i < Math.floor(r) ? "fill-star text-star" : "text-border-strong fill-border-strong")} />)}</span>
              {r} {c.andUp}
            </button>
          ))}
        </div>
      </Group>

      <Group title={c.availability}>
        <div className="space-y-3">
          <Checkbox checked={Boolean(filters.inStock)} onChange={(e) => update({ stock: e.target.checked ? "1" : null })} label={c.inStockOnly} />
          <Checkbox checked={Boolean(filters.deals)} onChange={(e) => update({ deals: e.target.checked ? "1" : null })} label={c.onSale} />
        </div>
      </Group>
    </div>
  );
}

/** Remounted (via key) whenever the URL's price range changes, so local input state resets without effects. */
function PriceInputs({ min: initialMin, max: initialMax, onApply, labels }: { min?: number; max?: number; onApply: (min: string | null, max: string | null) => void; labels: { min: string; max: string; minAria: string; maxAria: string } }) {
  const [min, setMin] = useState(initialMin?.toString() ?? "");
  const [max, setMax] = useState(initialMax?.toString() ?? "");
  const apply = () => {
    if (min === (initialMin?.toString() ?? "") && max === (initialMax?.toString() ?? "")) return;
    onApply(min || null, max || null);
  };
  const input = "h-10 w-full rounded-lg border border-border-strong bg-surface pl-10 pr-2 text-sm outline-none focus:border-foreground";
  return (
    <form className="mt-4 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); apply(); }}>
      <label className="relative flex-1">
        <span className="sr-only">{labels.minAria}</span>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted">TSh</span>
        <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} onBlur={apply} placeholder={labels.min} className={input} />
      </label>
      <span className="text-muted">–</span>
      <label className="relative flex-1">
        <span className="sr-only">{labels.maxAria}</span>
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted">TSh</span>
        <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} onBlur={apply} placeholder={labels.max} className={input} />
      </label>
    </form>
  );
}
