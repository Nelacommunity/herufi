import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { PAGE_SIZE, type SortValue } from "@/lib/constants";
import type { Category, Product, ProductQuestion, ProductSummary, Review } from "@/lib/types";
import { PRODUCT_SELECT, SUMMARY_SELECT, toProduct, toSummary } from "@/lib/queries/shared";

export const getCategories = cache(async (): Promise<Category[]> => {
  const db = createPublicClient(3600);
  const [{ data, error }, counts] = await Promise.all([
    db.from("categories").select("id, name, slug, description, image_url, sort_order").order("sort_order"),
    db.rpc("category_counts"),
  ]);
  if (error) throw error;
  const countMap = new Map<string, number>(
    ((counts.data ?? []) as { category_id: string; product_count: number }[]).map((c) => [c.category_id, Number(c.product_count)]),
  );
  return (data ?? []).map((c) => ({ ...c, product_count: countMap.get(c.id) ?? 0 }));
});

export async function getCategoryBySlug(slug: string) {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
}

export type ProductFilters = {
  q?: string;
  category?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  deals?: boolean;
  sort?: SortValue;
  page?: number;
};

export async function listProducts(filters: ProductFilters): Promise<{ items: ProductSummary[]; total: number; page: number; pageCount: number }> {
  const db = createPublicClient(120);
  const page = Math.max(1, filters.page ?? 1);
  const q = filters.q?.trim().slice(0, 100);

  let query = q
    ? db.rpc("search_products", { q }, { count: "exact" }).select(SUMMARY_SELECT)
    : db.from("products").select(SUMMARY_SELECT, { count: "exact" }).eq("is_active", true);

  if (filters.category) {
    const cat = await getCategoryBySlug(filters.category);
    if (!cat) return { items: [], total: 0, page, pageCount: 0 };
    query = query.eq("category_id", cat.id);
  }
  if (filters.brands?.length) query = query.in("brand", filters.brands);
  if (filters.minPrice != null && !Number.isNaN(filters.minPrice)) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice != null && !Number.isNaN(filters.maxPrice)) query = query.lte("price", filters.maxPrice);
  if (filters.rating) query = query.gte("rating", filters.rating);
  if (filters.inStock) query = query.gt("stock_quantity", 0);
  if (filters.deals) query = query.gt("discount_percent", 0);

  switch (filters.sort) {
    case "newest": query = query.order("created_at", { ascending: false }); break;
    case "price-asc": query = query.order("price", { ascending: true }); break;
    case "price-desc": query = query.order("price", { ascending: false }); break;
    case "popular": query = query.order("sales_count", { ascending: false }); break;
    case "rating": query = query.order("rating", { ascending: false }).order("review_count", { ascending: false }); break;
    default:
      // With a search query the function already orders by relevance.
      if (!q) query = query.order("is_featured", { ascending: false }).order("sales_count", { ascending: false });
  }
  query = query.order("id"); // stable pagination

  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) {
    // Out-of-range pages return 416 from PostgREST.
    if (error.code === "PGRST103") return { items: [], total: count ?? 0, page, pageCount: Math.ceil((count ?? 0) / PAGE_SIZE) };
    throw error;
  }
  const total = count ?? 0;
  return { items: ((data ?? []) as unknown[]).map(toSummary), total, page, pageCount: Math.ceil(total / PAGE_SIZE) };
}

export async function getBrandFacets(categorySlug?: string) {
  const db = createPublicClient(3600);
  const cat = categorySlug ? await getCategoryBySlug(categorySlug) : null;
  const { data, error } = await db.rpc("brand_facets", { p_category_id: cat?.id ?? null });
  if (error) throw error;
  return (data ?? []).map((b: { brand: string; product_count: number }) => ({ brand: b.brand, count: Number(b.product_count) }));
}

export type Section = "trending" | "new" | "bestsellers" | "deals" | "top-rated";

export async function getSection(section: Section, limit = 8): Promise<ProductSummary[]> {
  const db = createPublicClient(300);
  let query = db.from("products").select(SUMMARY_SELECT).eq("is_active", true);
  switch (section) {
    case "trending":
      query = query.eq("is_featured", true).order("sales_count", { ascending: false });
      break;
    case "new":
      query = query.order("created_at", { ascending: false });
      break;
    case "bestsellers":
      query = query.order("sales_count", { ascending: false });
      break;
    case "deals":
      query = query.gt("discount_percent", 0).order("discount_percent", { ascending: false });
      break;
    case "top-rated":
      query = query.gt("stock_quantity", 0).order("rating", { ascending: false }).order("review_count", { ascending: false });
      break;
  }
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return (data ?? []).map(toSummary);
}

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const db = createPublicClient(300);
  const { data, error } = await db.from("products").select(PRODUCT_SELECT).eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
});

export async function getAllProductSlugs() {
  const db = createPublicClient(3600);
  const { data, error } = await db.from("products").select("slug, updated_at").eq("is_active", true);
  if (error) throw error;
  return data ?? [];
}

export async function getRelatedProducts(product: Pick<Product, "id" | "category" | "brand">, limit = 8) {
  const db = createPublicClient(600);
  const { data, error } = await db
    .from("products")
    .select(SUMMARY_SELECT)
    .eq("is_active", true)
    .neq("id", product.id)
    .eq("category_id", product.category?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("sales_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const items = (data ?? []).map(toSummary);
  if (items.length >= 4) return items;
  // Top up thin categories with best sellers.
  const extra = await getSection("bestsellers", limit + 1);
  return [...items, ...extra.filter((p) => p.id !== product.id && !items.some((i) => i.id === p.id))].slice(0, limit);
}

export async function getReviews(productId: string): Promise<Review[]> {
  const db = createPublicClient(120);
  const { data, error } = await db
    .from("reviews")
    .select("id, author_name, rating, title, content, created_at, user_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getQuestions(productId: string): Promise<ProductQuestion[]> {
  const db = createPublicClient(120);
  const { data, error } = await db
    .from("product_questions")
    .select("id, author_name, question, answer, answered_at, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}
