import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * "Download my data" (PDPA right of access): everything Herufi holds about the signed-in customer,
 * as a JSON file. Read with the service role but always filtered to this user's id and email.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await rateLimit("export", 5, 3600))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const db = createAdminClient();
  const email = user.email?.toLowerCase() ?? "";
  const [profile, addresses, ordersByUser, ordersByEmail, reviews, questions, wishlist, newsletter] = await Promise.all([
    db.from("profiles").select("email, full_name, phone, avatar_url, marketing_opt_in, created_at").eq("user_id", user.id).maybeSingle(),
    db.from("addresses").select("label, full_name, line1, line2, city, region, postal_code, country, phone, latitude, longitude, is_default, created_at").eq("user_id", user.id),
    db.from("orders").select("order_number, created_at, status, payment_status, email, total, subtotal, discount, shipping, tax, coupon_code, delivery_method, shipping_address, ship_date, items:order_items(product_name, variant, quantity, price)").eq("user_id", user.id),
    email ? db.from("orders").select("order_number, created_at, status, payment_status, email, total, subtotal, discount, shipping, tax, coupon_code, delivery_method, shipping_address, ship_date, items:order_items(product_name, variant, quantity, price)").is("user_id", null).eq("email", email) : Promise.resolve({ data: [] }),
    db.from("reviews").select("product_id, rating, title, content, created_at").eq("user_id", user.id),
    db.from("product_questions").select("product_id, question, answer, created_at").eq("user_id", user.id),
    db.from("wishlists").select("items:wishlist_items(product:products(name, slug), created_at)").eq("user_id", user.id).maybeSingle(),
    email ? db.from("newsletter_subscribers").select("email, created_at").eq("email", email).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, sign_in_methods: user.app_metadata?.providers ?? [] },
    profile: profile.data,
    addresses: addresses.data ?? [],
    orders: [...(ordersByUser.data ?? []), ...(ordersByEmail.data ?? [])],
    reviews: reviews.data ?? [],
    questions: questions.data ?? [],
    wishlist: wishlist.data?.items ?? [],
    newsletter: newsletter.data,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="herufi-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
