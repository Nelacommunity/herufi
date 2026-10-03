"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/supabase/public";
import { ORDER_STATUSES } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { slugify } from "@/lib/utils";

/** Every admin action re-checks the role server-side; RLS (is_admin()) enforces it again in the database. */
async function admin() {
  await assertAdmin();
  return createClient();
}

function fail(error: unknown, fallback: string): ActionResult<never> {
  const e = error as { code?: string; message?: string };
  if (e?.code === "23505") return { ok: false, error: "That slug, SKU or code is already in use." };
  if (e?.code === "42501") return { ok: false, error: "You do not have permission to do that." };
  return { ok: false, error: e?.message && e.message.length < 160 ? e.message : fallback };
}

function refreshCatalog() {
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
}

// Products -------------------------------------------------------------------

const imageSchema = z.object({ id: z.string().optional(), image_url: z.url(), alt_text: z.string().max(200).default("") });
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
  additional_price: z.coerce.number().min(-100000).max(100000),
  stock_quantity: z.coerce.number().int().min(0).max(1000000),
});

const productSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Name is required").max(160),
  slug: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(80).default(""),
  category_id: z.uuid().nullable(),
  description: z.string().trim().max(10000).default(""),
  details: z.array(z.string().trim().min(1).max(300)).max(20),
  specifications: z.record(z.string(), z.string()),
  price: z.coerce.number().min(0, "Price must be positive").max(1000000),
  compare_at_price: z.coerce.number().min(0).max(1000000).nullable(),
  sku: z.string().trim().max(64).nullable(),
  stock_quantity: z.coerce.number().int().min(0).max(1000000),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  images: z.array(imageSchema).max(12),
  variants: z.array(variantSchema).max(50),
});
export type ProductPayload = z.input<typeof productSchema>;

export async function saveProduct(payload: ProductPayload): Promise<ActionResult<{ id: string }>> {
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const { id, images, variants, ...p } = parsed.data;
  if (p.compare_at_price != null && p.compare_at_price <= p.price) p.compare_at_price = null;
  const supabase = await admin();

  const row = {
    ...p,
    slug: slugify(p.slug || p.name),
    sku: p.sku || null,
    // With variants, product stock is the sum of variant stock.
    stock_quantity: variants.length ? variants.reduce((n, v) => n + v.stock_quantity, 0) : p.stock_quantity,
  };

  try {
    let productId = id;
    if (id) {
      const { error } = await supabase.from("products").update(row).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("products").insert(row).select("id").single();
      if (error) throw error;
      productId = data.id;
    }

    // Images: replace the set, keeping order.
    const { error: delImg } = await supabase.from("product_images").delete().eq("product_id", productId!);
    if (delImg) throw delImg;
    if (images.length) {
      const { error } = await supabase.from("product_images").insert(images.map((img, i) => ({ product_id: productId, image_url: img.image_url, alt_text: img.alt_text, sort_order: i })));
      if (error) throw error;
    }

    // Variants: update existing ids in place (cart lines reference them), insert new, delete removed.
    const keep = variants.filter((v) => v.id).map((v) => v.id!);
    let del = supabase.from("product_variants").delete().eq("product_id", productId!);
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
    const { error: delVar } = await del;
    if (delVar) throw delVar;
    for (const [i, v] of variants.entries()) {
      const data = { product_id: productId, name: v.name, value: v.value, additional_price: v.additional_price, stock_quantity: v.stock_quantity, sort_order: i };
      const { error } = v.id ? await supabase.from("product_variants").update(data).eq("id", v.id) : await supabase.from("product_variants").insert(data);
      if (error) throw error;
    }

    refreshCatalog();
    return { ok: true, data: { id: productId! }, message: id ? "Product updated" : "Product created" };
  } catch (e) {
    return fail(e, "We couldn't save this product.");
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return fail(error, "We couldn't delete this product.");
  refreshCatalog();
  return { ok: true, message: "Product deleted" };
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
  if (error) return fail(error, "We couldn't update this product.");
  refreshCatalog();
  return { ok: true };
}

export async function adjustStock(id: string, stock: number): Promise<ActionResult> {
  if (!Number.isInteger(stock) || stock < 0) return { ok: false, error: "Stock must be a whole number." };
  const supabase = await admin();
  const { error } = await supabase.from("products").update({ stock_quantity: stock }).eq("id", id);
  if (error) return fail(error, "We couldn't update stock.");
  refreshCatalog();
  return { ok: true, message: "Stock updated" };
}

// Categories -----------------------------------------------------------------

const categorySchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name is required").max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  image_url: z.url().optional().or(z.literal("")),
});

export async function saveCategory(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await admin();
  const { id, ...c } = parsed.data;
  const row = { name: c.name, slug: slugify(c.slug || c.name), description: c.description || null, image_url: c.image_url || null };
  let error;
  if (id) ({ error } = await supabase.from("categories").update(row).eq("id", id));
  else {
    const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
    ({ error } = await supabase.from("categories").insert({ ...row, sort_order: count ?? 0 }));
  }
  if (error) return fail(error, "We couldn't save this category.");
  refreshCatalog();
  return { ok: true, message: id ? "Category updated" : "Category created" };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error, "We couldn't delete this category.");
  refreshCatalog();
  return { ok: true, message: "Category deleted. Its products are now uncategorised." };
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_reorder_categories", { ids });
  if (error) return fail(error, "We couldn't reorder categories.");
  refreshCatalog();
  return { ok: true };
}

// Orders ---------------------------------------------------------------------

export async function updateOrderStatus(id: string, status: string): Promise<ActionResult> {
  if (!ORDER_STATUSES.includes(status as never)) return { ok: false, error: "Unknown status" };
  const supabase = await admin();
  const update: Record<string, string> = { status };
  if (status === "cancelled") update.payment_status = "refunded";
  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) return fail(error, "We couldn't update this order.");
  revalidatePath("/admin/orders", "layout");
  revalidatePath("/admin");
  return { ok: true, message: `Order marked as ${status}` };
}

// Customers ------------------------------------------------------------------

export async function setCustomerStatus(userId: string, status: "active" | "suspended"): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.rpc("admin_set_customer_status", { p_user_id: userId, p_status: status });
  if (error) return fail(error, "We couldn't update this customer.");
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message: status === "suspended" ? "Account suspended" : "Account reactivated" };
}

// Coupons --------------------------------------------------------------------

const couponSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Use 3–32 letters, numbers, - or _"),
  description: z.string().trim().max(200).optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive("Value must be greater than 0"),
  min_subtotal: z.coerce.number().min(0).default(0),
  expires_at: z.string().optional(),
  usage_limit: z.string().optional(),
  is_active: z.string().optional(),
}).refine((c) => c.type !== "percentage" || c.value <= 100, { message: "Percentage can't exceed 100", path: ["value"] });

export async function saveCoupon(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, expires_at, usage_limit, is_active, ...c } = parsed.data;
  const limit = usage_limit ? Number(usage_limit) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return { ok: false, error: "Usage limit must be a whole number" };
  const row = {
    ...c,
    description: c.description || null,
    expires_at: expires_at ? new Date(`${expires_at}T23:59:59`).toISOString() : null,
    usage_limit: limit,
    is_active: is_active === "on",
  };
  const supabase = await admin();
  const { error } = id ? await supabase.from("coupons").update(row).eq("id", id) : await supabase.from("coupons").insert(row);
  if (error) return fail(error, "We couldn't save this discount.");
  revalidatePath("/admin/discounts");
  return { ok: true, message: id ? "Discount updated" : "Discount created" };
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  const supabase = await admin();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return fail(error, "We couldn't delete this discount.");
  revalidatePath("/admin/discounts");
  return { ok: true, message: "Discount deleted" };
}

export async function answerQuestion(id: string, answer: string): Promise<ActionResult> {
  const text = answer.trim();
  if (text.length < 2) return { ok: false, error: "Write an answer first." };
  const supabase = await admin();
  const { error } = await supabase.from("product_questions").update({ answer: text, answered_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(error, "We couldn't save the answer.");
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Answer published" };
}
