import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductImage, ProductSummary, ProductVariant } from "@/lib/types";

export const SUMMARY_SELECT =
  "id, slug, name, brand, price, compare_at_price, discount_percent, rating, review_count, stock_quantity, is_featured, created_at, " +
  "category:categories(id, name, slug), images:product_images(id, image_url, alt_text, sort_order), " +
  "variants:product_variants(id, name, value, additional_price, stock_quantity, sort_order)";

export const PRODUCT_SELECT = `${SUMMARY_SELECT}, description, details, specifications, sku, sales_count, is_active, updated_at`;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Products added within this many days get a "New" badge. */
const NEW_DAYS = 21;
const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function toSummary(row: any): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? "",
    price: Number(row.price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    discount_percent: Number(row.discount_percent ?? 0),
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    stock_quantity: Number(row.stock_quantity ?? 0),
    is_featured: Boolean(row.is_featured),
    created_at: row.created_at,
    is_new: Date.now() - new Date(row.created_at).getTime() < NEW_DAYS * 86_400_000,
    category: row.category ?? null,
    images: ((row.images ?? []) as ProductImage[]).slice().sort(bySort),
    variants: ((row.variants ?? []) as any[])
      .map((v): ProductVariant => ({ ...v, additional_price: Number(v.additional_price), stock_quantity: Number(v.stock_quantity) }))
      .sort(bySort),
  };
}

export function toProduct(row: any): Product {
  return {
    ...toSummary(row),
    description: row.description ?? "",
    details: row.details ?? [],
    specifications: row.specifications ?? {},
    sku: row.sku ?? null,
    sales_count: Number(row.sales_count ?? 0),
    is_active: row.is_active !== false,
    updated_at: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Fetch products by id, preserving the order of `ids`. Works with any Supabase client. */
export async function fetchProductsByIds(client: SupabaseClient, ids: string[]): Promise<ProductSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await client.from("products").select(SUMMARY_SELECT).in("id", ids).eq("is_active", true);
  if (error) throw error;
  const map = new Map((data ?? []).map((r) => [(r as unknown as { id: string }).id, toSummary(r)]));
  return ids.map((id) => map.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

/** True if the product (or any variant) can be bought. */
export function isInStock(p: Pick<ProductSummary, "stock_quantity" | "variants">) {
  return p.variants.length ? p.variants.some((v) => v.stock_quantity > 0) : p.stock_quantity > 0;
}
