import Image from "next/image";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPrice } from "@/lib/utils";

export const metadata = { title: "Products" };
const PER_PAGE = 20;

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filter = typeof sp.filter === "string" ? sp.filter : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let query = supabase.from("products")
    .select("id, name, slug, brand, price, compare_at_price, stock_quantity, is_active, is_featured, sales_count, category:categories(name), images:product_images(image_url, sort_order), variants:product_variants(id)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,brand.ilike.%${q.replace(/[%,()]/g, "")}%,sku.ilike.%${q.replace(/[%,()]/g, "")}%`);
  if (filter === "active") query = query.eq("is_active", true);
  if (filter === "draft") query = query.eq("is_active", false);
  if (filter === "low") query = query.lt("stock_quantity", 10);
  if (filter === "sale") query = query.gt("discount_percent", 0);
  const { data, count } = await query;
  const pages = Math.ceil((count ?? 0) / PER_PAGE);
  const link = (o: Record<string, string | number>) => `/admin/products?${new URLSearchParams({ ...(q && { q }), ...(filter !== "all" && { filter }), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <AdminPageHeader title="Products" description={`${count ?? 0} products in your catalog`} actions={<Link href="/admin/products/new" className={buttonVariants()}><Plus className="h-4 w-4" /> Add product</Link>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[["all", "All"], ["active", "Active"], ["draft", "Draft"], ["low", "Low stock"], ["sale", "On sale"]].map(([v, l]) => (
            <Link key={v} href={`/admin/products?${new URLSearchParams({ ...(q && { q }), ...(v !== "all" && { filter: v }) })}`} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", filter === v ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground")}>{l}</Link>
          ))}
        </div>
        <form className="relative sm:w-72">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search name, brand or SKU" className="h-10 w-full rounded-full border border-border-strong bg-surface pl-10 pr-4 text-sm outline-none focus:border-foreground" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-5 py-3 font-medium">Product</th><th className="py-3 font-medium">Status</th><th className="py-3 font-medium">Inventory</th><th className="py-3 font-medium">Price</th><th className="py-3 font-medium">Sold</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => {
              /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
              const img = ((p.images ?? []) as any[]).sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
              const category = (p.category as unknown as { name: string } | null)?.name;
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{img && <Image src={img} alt="" fill sizes="40px" className="object-cover" />}</span>
                      <span className="min-w-0"><span className="block truncate font-medium hover:underline">{p.name}</span><span className="text-xs text-muted">{p.brand}{category ? ` · ${category}` : ""}</span></span>
                    </Link>
                  </td>
                  <td className="py-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", p.is_active ? "bg-accent-soft text-success" : "bg-surface-2 text-muted")}>{p.is_active ? "Active" : "Draft"}</span>{p.is_featured && <span className="ml-1.5 text-xs text-muted">Featured</span>}</td>
                  <td className={cn("py-3 tabular-nums", p.stock_quantity === 0 ? "font-medium text-sale" : p.stock_quantity < 10 && "text-warning")}>{p.stock_quantity} in stock{p.variants?.length ? <span className="text-xs text-muted"> · {p.variants.length} variants</span> : null}</td>
                  <td className="py-3 tabular-nums">{formatPrice(p.price)}{p.compare_at_price && <span className="ml-1.5 text-xs text-subtle line-through">{formatPrice(p.compare_at_price)}</span>}</td>
                  <td className="py-3 tabular-nums text-muted">{p.sales_count.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right"><ProductRowActions id={p.id} slug={p.slug} active={p.is_active} /></td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={6} className="px-5 py-16 text-center text-muted">No products match. <Link href="/admin/products" className="underline">Clear filters</Link></td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={link({ page: page - 1 })} className={buttonVariants({ variant: "secondary", size: "sm" })}>Previous</Link>}
            {page < pages && <Link href={link({ page: page + 1 })} className={buttonVariants({ variant: "secondary", size: "sm" })}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
