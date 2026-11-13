import { buildOrderEmail, type EmailOrder } from "@/lib/order-emails";
const order: EmailOrder = {
  order_number: "HF-100329", total: 412000, subtotal: 350000, discount: 0, shipping: 0, tax: 62000, delivery_method: "sea", payment_status: "paid",
  shipping_address: { full_name: "Asha <b>Juma</b>", line1: "Mikocheni B", line2: "Blue gate", city: "Dar es Salaam", region: "Dar es Salaam" },
  items: [{ product_name: "Kova Pods Pro Earbuds", variant: "Color: Black", quantity: 2, price: 175000 }],
};
export async function GET(req: Request) {
  const u = new URL(req.url);
  const e = buildOrderEmail((u.searchParams.get("e") ?? "confirmed") as never, (u.searchParams.get("l") ?? "en") as never, order, { shipDate: "Saturday, 28 November", arrival: "2 Jan – 12 Jan", link: "https://www.herufi.shop/account/orders/HF-100329" });
  return new Response(u.searchParams.get("f") === "html" ? e.html : `SUBJECT: ${e.subject}\n\n${e.text}`, { headers: { "Content-Type": u.searchParams.get("f") === "html" ? "text/html" : "text/plain; charset=utf-8" } });
}
