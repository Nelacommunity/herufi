import "server-only";
import type { Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { formatPrice } from "@/lib/utils";
import { BUSINESS } from "@/lib/business";

export type OrderEvent = "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
export const ORDER_EVENTS: OrderEvent[] = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

export type EmailOrder = {
  order_number: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  delivery_method: string;
  payment_status: string;
  shipping_address: { full_name?: string; line1?: string; line2?: string | null; city?: string; region?: string | null; phone?: string | null };
  items: { product_name: string; variant: string | null; quantity: number; price: number }[];
};

type Ctx = { name: string; number: string; method: string; shipDate: string | null; arrival: string | null; refunded: boolean };

/** Wording per event. Kept short: one headline, one or two sentences, one "what's next". */
const COPY: Record<Locale, Record<OrderEvent, (c: Ctx) => { subject: string; title: string; body: string[] }>> = {
  en: {
    confirmed: (c) => ({
      subject: `Order ${c.number} confirmed: payment received`,
      title: "Thank you, your payment is confirmed",
      body: [
        `We've received your payment for order ${c.number} and we're buying your items from the factory now.`,
        c.shipDate ? `It leaves China with our shipment on ${c.shipDate} by ${c.method}.` : `It will ship by ${c.method}.`,
        ...(c.arrival ? [`Estimated arrival in Tanzania: ${c.arrival}.`] : []),
      ],
    }),
    processing: (c) => ({
      subject: `Order ${c.number} is packed in our China warehouse`,
      title: "Your order is packed",
      body: [
        "Your items have arrived at our Guangzhou warehouse, passed our quality check and are packed.",
        c.shipDate ? `They leave China with the shipment on ${c.shipDate}.` : "They leave China with our next shipment.",
        ...(c.arrival ? [`Estimated arrival in Tanzania: ${c.arrival}.`] : []),
      ],
    }),
    shipped: (c) => ({
      subject: `Order ${c.number} is on its way to Tanzania`,
      title: "Your order has left China",
      body: [
        `Order ${c.number} is on its way to Tanzania by ${c.method}. We clear customs for you, then a courier delivers it.`,
        ...(c.arrival ? [`Estimated arrival: ${c.arrival}.`] : []),
        "The courier will call you before delivery.",
      ],
    }),
    delivered: (c) => ({
      subject: `Order ${c.number} has been delivered`,
      title: "Delivered. Enjoy!",
      body: [
        `Order ${c.number} has been delivered. We hope you love it.`,
        "If anything isn't right, you can return unused items within 14 days. Contact us using the details below.",
      ],
    }),
    cancelled: (c) => ({
      subject: `Order ${c.number} has been cancelled`,
      title: "Your order has been cancelled",
      body: [
        `Order ${c.number} has been cancelled.`,
        c.refunded
          ? "Your payment will be refunded to the mobile money account or card you paid with within 5 business days."
          : "No payment was taken for this order.",
      ],
    }),
  },
  sw: {
    confirmed: (c) => ({
      subject: `Oda ${c.number} imethibitishwa: malipo yamepokelewa`,
      title: "Asante, malipo yako yamethibitishwa",
      body: [
        `Tumepokea malipo ya oda ${c.number} na sasa tunanunua bidhaa zako kiwandani.`,
        c.shipDate ? `Itaondoka China na mzigo wetu wa tarehe ${c.shipDate} kwa ${c.method}.` : `Itasafirishwa kwa ${c.method}.`,
        ...(c.arrival ? [`Makadirio ya kufika Tanzania: ${c.arrival}.`] : []),
      ],
    }),
    processing: (c) => ({
      subject: `Oda ${c.number} imefungwa kwenye ghala letu China`,
      title: "Oda yako imefungwa",
      body: [
        "Bidhaa zako zimefika kwenye ghala letu la Guangzhou, zimekaguliwa ubora na kufungwa.",
        c.shipDate ? `Zitaondoka China na mzigo wa tarehe ${c.shipDate}.` : "Zitaondoka China na mzigo wetu unaofuata.",
        ...(c.arrival ? [`Makadirio ya kufika Tanzania: ${c.arrival}.`] : []),
      ],
    }),
    shipped: (c) => ({
      subject: `Oda ${c.number} iko njiani kuja Tanzania`,
      title: "Oda yako imeondoka China",
      body: [
        `Oda ${c.number} iko njiani kuja Tanzania kwa ${c.method}. Tunashughulikia forodha, kisha msafirishaji anakuletea.`,
        ...(c.arrival ? [`Makadirio ya kufika: ${c.arrival}.`] : []),
        "Msafirishaji atakupigia kabla ya kukuletea.",
      ],
    }),
    delivered: (c) => ({
      subject: `Oda ${c.number} imefikishwa`,
      title: "Imefika. Furahia!",
      body: [
        `Oda ${c.number} imefikishwa. Tunatumaini utaipenda.`,
        "Kama kuna tatizo, unaweza kurudisha bidhaa ambayo haijatumika ndani ya siku 14. Wasiliana nasi kwa mawasiliano yaliyo hapa chini.",
      ],
    }),
    cancelled: (c) => ({
      subject: `Oda ${c.number} imeghairiwa`,
      title: "Oda yako imeghairiwa",
      body: [
        `Oda ${c.number} imeghairiwa.`,
        c.refunded
          ? "Pesa yako itarudishwa kwenye akaunti ya pesa ya simu au kadi uliyolipia ndani ya siku 5 za kazi."
          : "Hakuna malipo yaliyochukuliwa kwa oda hii.",
      ],
    }),
  },
};

const LABELS: Record<Locale, { hi: string; items: string; qty: string; subtotal: string; discount: string; shipping: string; tax: string; total: string; deliverTo: string; view: string; help: string; free: string }> = {
  en: { hi: "Hi", items: "Your order", qty: "Qty", subtotal: "Subtotal", discount: "Discount", shipping: "Shipping", tax: "VAT (18%)", total: "Total", deliverTo: "Delivering to", view: "View your order", help: "This is an automatic email, so please don't reply. Questions? Contact us on", free: "Free" },
  sw: { hi: "Habari", items: "Oda yako", qty: "Idadi", subtotal: "Jumla ndogo", discount: "Punguzo", shipping: "Usafirishaji", tax: "VAT (18%)", total: "Jumla", deliverTo: "Inapelekwa kwa", view: "Tazama oda yako", help: "Hii ni barua pepe ya moja kwa moja, tafadhali usiijibu. Una swali? Wasiliana nasi kwa", free: "Bure" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Builds the subject, HTML and plain-text versions of one order update email. */
export function buildOrderEmail(event: OrderEvent, locale: Locale, order: EmailOrder, extra: { shipDate: string | null; arrival: string | null; link: string }) {
  const t = dictionaries[locale];
  const L = LABELS[locale];
  const a = order.shipping_address;
  const ctx: Ctx = {
    name: (a.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    number: order.order_number,
    method: (t.checkout.deliveryMethods[order.delivery_method]?.label ?? order.delivery_method).toLowerCase(),
    shipDate: extra.shipDate,
    arrival: extra.arrival,
    refunded: order.payment_status === "refunded",
  };
  const copy = COPY[locale][event](ctx);
  const showItems = event === "confirmed" || event === "cancelled";

  const rows = order.items.map((i) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #ebe9e4;font-size:14px;color:#121212">${esc(i.product_name)}${i.variant ? `<br><span style="color:#6b6a66;font-size:13px">${esc(i.variant)}</span>` : ""}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ebe9e4;font-size:14px;color:#6b6a66;text-align:center;white-space:nowrap">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ebe9e4;font-size:14px;color:#121212;text-align:right;white-space:nowrap">${esc(formatPrice(i.price * i.quantity))}</td>
    </tr>`).join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td colspan="2" style="padding:4px 0;font-size:14px;color:${bold ? "#121212" : "#6b6a66"};${bold ? "font-weight:600" : ""}">${label}</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#121212;${bold ? "font-weight:600" : ""}">${esc(value)}</td></tr>`;

  const html = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f3ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px 28px">
        <tr><td style="font-family:Georgia,serif;font-size:26px;color:#121212;padding-bottom:24px">herufi</td></tr>
        <tr><td style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b6a66;padding-bottom:6px">${esc(order.order_number)}</td></tr>
        <tr><td style="font-size:24px;font-weight:600;color:#121212;line-height:1.25;padding-bottom:16px">${esc(copy.title)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#121212">
          ${ctx.name ? `<p style="margin:0 0 12px">${L.hi} ${esc(ctx.name)},</p>` : ""}
          ${copy.body.map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join("")}
        </td></tr>
        <tr><td style="padding:12px 0 8px"><a href="${esc(extra.link)}" style="display:inline-block;background:#121212;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:999px">${L.view}</a></td></tr>
        ${showItems ? `
        <tr><td style="padding-top:24px">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#121212">${L.items}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
            ${line(L.subtotal, formatPrice(order.subtotal))}
            ${Number(order.discount) > 0 ? line(L.discount, `−${formatPrice(order.discount)}`) : ""}
            ${line(L.shipping, Number(order.shipping) === 0 ? L.free : formatPrice(order.shipping))}
            ${line(L.tax, formatPrice(order.tax))}
            ${line(L.total, formatPrice(order.total), true)}
          </table>
        </td></tr>` : ""}
        <tr><td style="padding-top:20px;font-size:14px;line-height:1.5;color:#6b6a66">
          <strong style="color:#121212">${L.deliverTo}:</strong> ${esc([a.full_name, a.line1, a.line2, a.city, a.region].filter(Boolean).join(", "))}
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid #ebe9e4;margin-top:24px;font-size:13px;line-height:1.5;color:#6b6a66">
          ${L.help} ${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}<br>Herufi · ${esc(BUSINESS.address)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    copy.title,
    "",
    ...(ctx.name ? [`${L.hi} ${ctx.name},`, ""] : []),
    ...copy.body,
    "",
    ...(showItems ? [L.items + ":", ...order.items.map((i) => `- ${i.product_name}${i.variant ? ` (${i.variant})` : ""} × ${i.quantity}: ${formatPrice(i.price * i.quantity)}`), `${L.total}: ${formatPrice(order.total)}`, ""] : []),
    `${L.view}: ${extra.link}`,
    "",
    `${L.help} ${BUSINESS.phone} · ${BUSINESS.email}`,
  ].join("\n");

  return { subject: copy.subject, html, text };
}
