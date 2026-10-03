import Link from "next/link";
import { SearchX } from "lucide-react";
import { CatalogShell, PendingResults } from "@/components/catalog/catalog-shell";
import { CatalogToolbar, ActiveFilters } from "@/components/catalog/catalog-toolbar";
import { FilterPanel } from "@/components/catalog/filter-panel";
import { Pagination } from "@/components/catalog/pagination";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { countActive, parseFilters, type RawParams } from "@/components/catalog/params";
import { getBrandFacets, getCategories, listProducts } from "@/lib/queries/catalog";
import { POPULAR_SEARCHES } from "@/lib/constants";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";

export async function CatalogView({ params, basePath, fixedCategory }: { params: RawParams; basePath: string; fixedCategory?: string }) {
  const filters = parseFilters(params, fixedCategory);
  const [result, categories, brands, { t }] = await Promise.all([listProducts(filters), getCategories(), getBrandFacets(filters.category), getI18n()]);
  const c = t.catalog;
  const activeCount = countActive(filters, fixedCategory);

  return (
    <CatalogShell>
      <div className="grid gap-10 lg:grid-cols-[240px_1fr] xl:gap-14">
        <aside className="hidden lg:block" aria-label={c.filters}>
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-8 pr-2 no-scrollbar">
            <FilterPanel filters={filters} categories={categories} brands={brands} fixedCategory={fixedCategory} />
          </div>
        </aside>
        <div className="min-w-0">
          <CatalogToolbar filters={filters} total={result.total} categories={categories} brands={brands} fixedCategory={fixedCategory} activeCount={activeCount} />
          <ActiveFilters filters={filters} fixedCategory={fixedCategory} categories={categories} />
          <PendingResults>
            {result.items.length ? (
              <>
                <ProductGrid products={result.items} columns={3} priorityCount={3} className="mt-8 xl:grid-cols-3" />
                <Pagination page={result.page} pageCount={result.pageCount} basePath={basePath} params={params} labels={{ nav: c.pagination, prev: c.prev, next: c.next }} />
              </>
            ) : (
              <EmptyState
                icon={<SearchX />}
                title={filters.q ? fmt(c.noResults, { q: filters.q }) : c.noMatch}
                description={filters.q ? c.noResultsDesc : c.noMatchDesc}
                action={
                  <>
                    {(activeCount > 0 || filters.q) && <Link href={basePath} className={buttonVariants({ variant: "primary" })}>{c.clearSearch}</Link>}
                    {filters.q && POPULAR_SEARCHES.slice(0, 3).map((s) => (
                      <Link key={s} href={`/products?q=${encodeURIComponent(s)}`} className={buttonVariants({ variant: "secondary" })}>{s}</Link>
                    ))}
                  </>
                }
              />
            )}
          </PendingResults>
        </div>
      </div>
    </CatalogShell>
  );
}
