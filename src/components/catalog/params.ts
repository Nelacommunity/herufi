import { SORT_OPTIONS, type SortValue } from "@/lib/constants";
import type { ProductFilters } from "@/lib/queries/catalog";

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export function parseFilters(params: RawParams, fixedCategory?: string): ProductFilters {
  const sort = first(params.sort);
  const brands = params.brand ? (Array.isArray(params.brand) ? params.brand : [params.brand]) : [];
  return {
    q: first(params.q)?.slice(0, 100) || undefined,
    category: fixedCategory ?? (first(params.category) || undefined),
    brands: brands.filter(Boolean).slice(0, 20),
    minPrice: num(first(params.min)),
    maxPrice: num(first(params.max)),
    rating: num(first(params.rating)),
    inStock: first(params.stock) === "1",
    deals: first(params.deals) === "1",
    sort: (SORT_OPTIONS as readonly string[]).includes(sort ?? "") ? (sort as SortValue) : "recommended",
    page: Math.max(1, Math.min(500, Number(first(params.page)) || 1)),
  };
}

export function countActive(f: ProductFilters, fixedCategory?: string) {
  return (f.category && !fixedCategory ? 1 : 0) + (f.brands?.length ?? 0) + (f.minPrice != null || f.maxPrice != null ? 1 : 0) +
    (f.rating ? 1 : 0) + (f.inStock ? 1 : 0) + (f.deals ? 1 : 0);
}
