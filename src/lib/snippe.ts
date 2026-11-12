import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const SNIPPE_BASE = "https://api.snippe.sh";

export type SnippePayment = {
  reference: string;
  status: string;
  payment_url?: string | null;
  expires_at?: string;
};

type SnippeResponse = { status?: string; message?: string; data?: SnippePayment };

/** Accepts 255XXXXXXXXX, +255XXXXXXXXX or local 0XXXXXXXXX and returns Snippe's 255XXXXXXXXX form. */
export function normalizeTzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("255") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `255${digits.slice(1)}`;
  if (digits.length === 9) return `255${digits}`;
  return null;
}

export async function createSnippePayment(
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<{ ok: true; payment: SnippePayment } | { ok: false; error: string }> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) return { ok: false, error: "Payments are not configured yet." };
  // Snippe rejects keys over 30 characters with the cryptic PAY_001.
  if (idempotencyKey.length > 30) return { ok: false, error: "Invalid idempotency key." };

  const res = await fetch(`${SNIPPE_BASE}/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as SnippeResponse | null;
  if (!res.ok || json?.status !== "success" || !json.data) {
    return { ok: false, error: json?.message ?? `Payment request failed (${res.status})` };
  }
  return { ok: true, payment: json.data };
}

/** Verifies X-Webhook-Signature (HMAC-SHA256 of `${timestamp}.${rawBody}`) and the 5-minute replay window. */
export function verifyWebhook(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SNIPPE_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type SnippeStatus = "pending" | "completed" | "failed" | "voided" | "expired";

/**
 * Asks Snippe for a payment's current status (GET /v1/payments/{reference}). Used as a fallback when
 * the webhook hasn't arrived (e.g. a wrong webhook secret), so paid orders don't stay "pending".
 * Returns null when Snippe can't be reached or the key isn't set.
 */
export async function getSnippePayment(reference: string): Promise<{ status: SnippeStatus; amount: number | null } | null> {
  const apiKey = process.env.SNIPPE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${SNIPPE_BASE}/v1/payments/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { data?: { status?: string; amount?: number | { value?: number } } } | null;
    const status = json?.data?.status;
    if (!res.ok || !status) {
      console.error("Snippe status check failed", reference, res.status, json);
      return null;
    }
    const raw = json.data?.amount;
    const amount = typeof raw === "number" ? raw : typeof raw?.value === "number" ? raw.value : null;
    return { status: status as SnippeStatus, amount };
  } catch (err) {
    console.error("Snippe status check error", reference, err);
    return null;
  }
}
