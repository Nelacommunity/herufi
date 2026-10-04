"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/supabase/public";
import { addressSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { formatPrice } from "@/lib/utils";

const orderSchema = z.object({
  items: z.array(z.object({ product_id: z.uuid(), variant_id: z.uuid().nullable(), quantity: z.number().int().min(1).max(99) })).min(1, "Your bag is empty").max(50),
  email: z.email("Enter a valid email address"),
  address: addressSchema,
  delivery: z.enum(["standard", "express", "sea"]),
  payment: z.object({
    brand: z.string().max(20),
    last4: z.string().regex(/^\d{4}$/),
    exp_month: z.number().int().min(1).max(12),
    exp_year: z.number().int().min(2000).max(2100),
    name: z.string().trim().max(120),
  }),
  coupon: z.string().trim().max(32).optional(),
  saveAddress: z.boolean().optional(),
  saveCard: z.boolean().optional(),
});

export type PlaceOrderInput = z.infer<typeof orderSchema>;

export async function placeOrder(input: PlaceOrderInput): Promise<ActionResult<{ orderNumber: string }>> {
  const { t } = await getI18n();
  const e = t.checkout.errors;
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const path = String(parsed.error.issues[0]?.path[0] ?? "");
    return { ok: false, error: path === "email" ? e.email : path === "address" ? e.address : path === "items" ? e.emptyBag : t.errors.checkFields };
  }
  const { items, email, address, delivery, payment, coupon, saveAddress, saveCard } = parsed.data;

  const supabase = await createClient();
  const user = await getUser();

  // Prices, discounts, stock and totals are computed inside the database.
  const { data, error } = await supabase.rpc("place_order", {
    items,
    email,
    shipping_address: address,
    delivery_method: delivery,
    payment: { brand: payment.brand, last4: payment.last4 },
    coupon_code: coupon || null,
  });
  if (error) return { ok: false, error: translateOrderError(error.message, t) };

  if (user) {
    const tasks: PromiseLike<unknown>[] = [];
    if (saveAddress) {
      tasks.push(supabase.from("addresses").select("id", { count: "exact", head: true }).then(({ count }) =>
        supabase.from("addresses").insert({ ...address, user_id: user.id, label: "Home", is_default: !count })));
    }
    if (saveCard) {
      tasks.push(supabase.from("payment_methods").select("id", { count: "exact", head: true }).then(({ count }) =>
        supabase.from("payment_methods").insert({ user_id: user.id, brand: payment.brand, last4: payment.last4, exp_month: payment.exp_month, exp_year: payment.exp_year, cardholder_name: payment.name, is_default: !count })));
    }
    await Promise.allSettled(tasks);
  }

  updateTag(CATALOG_TAG); // stock and sales counts changed
  return { ok: true, data: { orderNumber: (data as { order_number: string }).order_number } };
}

/** place_order raises language-neutral codes (see 0005_tanzania.sql); turn them into the shopper's language. */
function translateOrderError(message: string, t: Awaited<ReturnType<typeof getI18n>>["t"]) {
  const e = t.checkout.errors;
  const stock = message.match(/OUT_OF_STOCK:(\d+):(.+)$/);
  if (stock) return fmt(e.outOfStock, { n: stock[1], name: stock[2] });
  const coupon = message.match(/COUPON:(\S+)/);
  if (coupon) {
    const code = coupon[1];
    if (code.startsWith("min:")) return fmt(t.summary.coupon.min, { amount: formatPrice(Number(code.slice(4))) });
    return t.summary.coupon[code as keyof typeof t.summary.coupon] ?? t.summary.coupon.invalid;
  }
  if (message.includes("DELIVERY_UNAVAILABLE")) return e.deliveryUnavailable;
  if (message.includes("EMPTY_BAG")) return e.emptyBag;
  if (message.includes("INVALID_EMAIL")) return e.email;
  if (message.includes("INVALID_ADDRESS")) return e.address;
  if (message.includes("SUSPENDED")) return e.suspended;
  return e.generic;
}
