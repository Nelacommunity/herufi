import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Private links to an order's status page. Order numbers are sequential (HF-100329, HF-100330…),
 * so the page can't be open to anyone who guesses one. Emails carry `?order=…&t=<token>`, where the
 * token is an HMAC of the order number that only the server can produce.
 */
function secret() {
  return process.env.ORDER_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function orderToken(orderNumber: string) {
  return createHmac("sha256", secret()).update(`order-status:${orderNumber}`).digest("base64url").slice(0, 22);
}

export function validOrderToken(orderNumber: string, token: string | null | undefined) {
  if (!token || !secret()) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(orderToken(orderNumber));
  return a.length === b.length && timingSafeEqual(a, b);
}
