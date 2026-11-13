import "server-only";

/**
 * Transactional email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Needs RESEND_API_KEY and EMAIL_FROM, e.g. "Herufi <orders@herufi.shop>" on a domain verified in Resend.
 */
export type EmailResult = { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; idempotencyKey?: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM is not set", retryable: false };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Resend drops a repeat of the same key for 24 h, so a double trigger can't send twice.
        ...(msg.idempotencyKey && { "Idempotency-Key": msg.idempotencyKey.slice(0, 256) }),
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(process.env.EMAIL_REPLY_TO && { reply_to: process.env.EMAIL_REPLY_TO }),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
    if (res.ok && json?.id) return { ok: true, id: json.id };
    const error = `Resend ${res.status}: ${json?.message ?? json?.name ?? "unknown error"}`;
    // 4xx (bad key, unverified domain, invalid address) won't fix itself; 429/5xx might.
    return { ok: false, error, retryable: res.status === 429 || res.status >= 500 };
  } catch (err) {
    return { ok: false, error: `Resend unreachable: ${err instanceof Error ? err.message : String(err)}`, retryable: true };
  }
}
