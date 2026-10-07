---
name: tegasms-integration
description: Build integrations with Tegasms (api.tegasms.co.tz), a Tanzanian SMS platform for bulk campaigns, OTP/transactional messages and alerts, with coverage across Tanzania and 50+ African countries. Use whenever the user mentions Tegasms, sending SMS or OTP from a Tanzanian app, SMS sender IDs, SMS balance checks, bulk SMS, or TZS-priced SMS. Covers the REST API (single send, multi send, balance), Bearer-token auth, sender ID rules, rate limits, error handling, pricing and coverage.
---

# Tegasms Integration

Tegasms is an SMS platform for businesses in Tanzania and 50+ African countries. This skill covers the REST API plus the account/dashboard facts that decide whether a send succeeds. Source docs: `https://tegasms-co.docs.docsio.co` (append `.md` to any page for raw markdown; index at `/llms.txt`).

## API basics

- **Base URL:** `https://api.tegasms.co.tz` (HTTPS only; HTTP is rejected)
- **Format:** JSON request and response bodies
- **Auth:** `Authorization: Bearer <api_token>` on every request
- **Get a key:** dashboard `https://sms.tegasms.co.tz` → Profile → My Account → API key → Generate
- **Rate limit:** 100 requests/minute on standard accounts; `429` when exceeded (ask support for higher limits)
- **Billing:** prepaid credit; each SMS costs 1 credit, and messages over 160 characters may use more

## Endpoints

| Purpose | Method | Path |
| --- | --- | --- |
| Send one SMS | POST | `/api/v1/send_sms/type/single` |
| Send many SMS (batch) | POST | `/api/v1/send_sms/type/multiple` |
| Check balance | GET | `/api/v1/sms/check_sms_balance` |

All three need `Authorization` and `Content-Type: application/json`.

### Single SMS

```json
{ "from": "Tegasms", "recipient": "25578246004", "message": "Hello", "reference": "order_123" }
```

| Field | Notes |
| --- | --- |
| `from` | Sender ID. Must be **approved on your account** |
| `recipient` | International format with country code first, e.g. `255620350083` |
| `message` | Text, 160 chars per SMS segment |
| `reference` | Optional, for tracking in your system |

Success (200):

```json
{ "status": "success", "message": "SMS sent successfully.", "sent": 1, "failed": 0, "failed_numbers": [] }
```

Always check `failed` / `failed_numbers`, not just the HTTP status.

### Multiple SMS

```json
{
  "messages": [
    { "from": "Tegasms", "recipient": "25578246004", "message": "Hello Maulid" },
    { "from": "Tegasms", "recipient": "255620350083", "message": "Hello Samile" }
  ],
  "reference": "bulk_001"
}
```

Success (200): `{ "status": "success", "message": "SMS messages dispatched successfully.", "count": 2 }`. Prefer this over a loop of single sends: it is one request against the rate limit.

### Balance

`GET /api/v1/sms/check_sms_balance` → `{ "sms_balance": 613 }`. Check it before large sends.

## Errors

| Status | Meaning |
| --- | --- |
| 200 | OK |
| 400 | Bad parameters, or unapproved / non-existent Sender ID |
| 401 | Missing or invalid token, or unauthorized Sender ID |
| 429 | Rate limit exceeded: back off, then retry |
| 500 | Server error: retry with exponential backoff |

Error body: `{ "status": "error", "message": "..." }`. The Sender ID failure reads `Unauthorized or non-existent Sender ID for the batch payload.` — the most common first-send failure. Fix it by using an approved sender ID, not by changing the token. Other 401 causes: missing header, wrong `Bearer` formatting, HTTP instead of HTTPS, expired/regenerated key.

## Critical rules

- **Keep the token server-side.** Never ship it in client code or `NEXT_PUBLIC_*` vars; keep it in an env var (e.g. `TEGASMS_API_KEY`) and rotate if leaked. Separate keys per environment.
- **Sender ID must be approved first.** Up to 11 alphanumeric characters, no spaces or special characters. Request it in the dashboard (Settings → Sender IDs) with business name and registration details; approval takes about 1–3 business days. Free to request. Impersonating banks/government or deceptive names are rejected.
- **Phone numbers:** full international format with country code. The API examples use digits with no `+` (`255` + 9 digits for Tanzania, 12 digits total). One doc example, `25578246004`, has only 11 digits and looks like a typo, so don't copy it. Normalise local `07XXXXXXXX` / `06XXXXXXXX` to `255…` before sending. Without a country code the platform assumes your default country.
- **Check the response body**, not only the status: partial failures come back in `failed_numbers`.
- **No idempotency key is documented.** A retried request after a timeout can double-send. Use `reference` to track, and retry only on 429/500 (not after a 200).
- **No documented delivery-report webhook or status-lookup endpoint.** Delivery status (sent, delivered, pending, failed, bounced) is in the dashboard and exportable as CSV/PDF. Do not invent callbacks; if the user needs programmatic delivery receipts, ask Tegasms support.
- **Scheduling, CSV contact upload and analytics are dashboard features**, not documented API features.
- **Message hygiene:** OTP texts should be short, state the code and validity ("Your verification code is 123456. Valid for 10 minutes."), and include "ignore if you didn't request this". Honour opt-outs on marketing sends.

## Example: server-side helper (TypeScript / Next.js)

```ts
import "server-only";

const BASE = "https://api.tegasms.co.tz";

/** 07XX… / +255… / 255… → 255XXXXXXXXX (Tanzania). */
export function toTzRecipient(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("255") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return `255${d.slice(1)}`;
  if (d.length === 9) return `255${d}`;
  return null;
}

async function tega<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.TEGASMS_API_KEY;
  if (!key) throw new Error("TEGASMS_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status === "error") {
    throw new Error(json?.message ?? `Tegasms request failed (${res.status})`);
  }
  return json as T;
}

export async function sendSms(recipient: string, message: string, reference?: string) {
  const to = toTzRecipient(recipient);
  if (!to) throw new Error("Invalid Tanzanian phone number");
  const out = await tega<{ sent: number; failed: number; failed_numbers: string[] }>(
    "/api/v1/send_sms/type/single",
    { method: "POST", body: JSON.stringify({ from: process.env.TEGASMS_SENDER_ID, recipient: to, message, reference }) },
  );
  if (out.failed > 0) throw new Error(`SMS failed for: ${out.failed_numbers.join(", ")}`);
}

export const getSmsBalance = () => tega<{ sms_balance: number }>("/api/v1/sms/check_sms_balance");
```

For retries on `429`/`500`, use exponential backoff with a small cap, and never retry a `200`.

## Pricing (Tanzania, TZS per SMS, volume tiers)

1–10,000: 19 · 10,001–25,000: 18 · 25,001–50,000: 17 · 50,001–100,000: 16 · 100,001–250,000: 15 · 250,001–500,000: 14 · 500,001–1,000,000: 13.50 · 1,000,001+: 13. No setup fees or minimums. Top up by M-Pesa, Tigo Pesa, Airtel Money or bank transfer. Monthly prepaid packages (Starter TZS 2,000 → Basic Business TZS 95,000) expire after a month with no rollover. Details: `references/pricing-and-coverage.md`.

## Doc inconsistencies to be aware of

- The OTP page shows `POST https://api.tegasms.co.tz/send` with `to` / `type: "otp"`. The SMS Endpoints reference documents `/api/v1/send_sms/type/single` with `recipient`. **Use the endpoints reference**; treat the `/send` example as unverified.
- Docs show recipients both as `+255…` and `255…`. The API reference examples omit the `+`.
- The single endpoint documents the error status as "401/400".

## Support and contacts

Email `info@tegasms.co.tz` for enterprise pricing (100K+/month OTP, 1M+ SMS/month), higher rate limits, new-country coverage, or unresolved sender-ID/delivery problems.

## References

- `references/pricing-and-coverage.md` — prepaid packages, per-country pricing, carriers, supported countries
- `references/dashboard-and-features.md` — dashboard workflows, analytics statuses, bulk/CSV, OTP guidance
