import "server-only";
import { normalizeTzPhone } from "@/lib/snippe";
import { BUSINESS } from "@/lib/business";

const TEGASMS_BASE = "https://api.tegasms.co.tz";

/**
 * Best-effort SMS via Tegasms. Never throws: an SMS failure must not break a payment webhook or an admin action.
 * Silently skipped when TEGASMS_API_KEY / TEGASMS_SENDER_ID aren't configured. Keep `message` ≤160 chars (1 credit).
 */
export async function sendSms(phone: string | null | undefined, message: string, reference?: string): Promise<boolean> {
  const key = process.env.TEGASMS_API_KEY;
  const from = process.env.TEGASMS_SENDER_ID;
  const recipient = phone ? normalizeTzPhone(phone) : null;
  if (!key || !from || !recipient) return false;
  try {
    const res = await fetch(`${TEGASMS_BASE}/api/v1/send_sms/type/single`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, recipient, message, reference }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.status === "error" || (json?.failed ?? 0) > 0) {
      console.error("Tegasms send failed", res.status, json?.message ?? json?.failed_numbers);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Tegasms request error", e);
    return false;
  }
}

export const orderSms = {
  paid: (n: string) => `${BUSINESS.brand}: payment received for order ${n}. Asante! We'll update you when it ships.`,
  shipped: (n: string) => `${BUSINESS.brand}: order ${n} has shipped. Track it in your account.`,
  delivered: (n: string) => `${BUSINESS.brand}: order ${n} was delivered. Asante for shopping with us!`,
  cancelled: (n: string) => `${BUSINESS.brand}: order ${n} was cancelled. Contact support if you have questions.`,
} as const;
