# Dashboard workflows and features

Dashboard: `https://sms.tegasms.co.tz`

## Getting started
1. Sign up (name, email, password; no card needed).
2. Top up credit (M-Pesa, Tigo Pesa, Airtel Money, bank transfer).
3. Send via the dashboard ("Send SMS" / "New Campaign") or the API.

## Bulk campaigns (dashboard)
- Upload a CSV with phone numbers in the first column (`+255712345678` or without country code if all domestic), preview, Import, compose, "Send to All".
- Send now or schedule for a date/time. Messages up to 160 chars per segment; longer ones are multi-part.
- Live counts: sent, delivered, pending, failed; per-recipient timestamp and carrier.
- Practices: test small first, send at peak hours, concise copy with a clear call to action, honour opt-outs.

## OTP and transactional SMS
- Prioritised routing: advertised 2.3 s average delivery, 99.8% delivery rate, automatic retries, detailed logs.
- Typical uses: signup/login/2FA codes, password resets, order and payment confirmations, shipping updates, balance and renewal alerts.
- Message style: code plus validity plus "ignore if you didn't request this", e.g. `Your verification code is 123456. Valid for 10 minutes.`
- Same volume pricing as bulk.
- Use a dedicated sender ID per message type (e.g. `SHOP` for marketing, `SHOPOTP` for authentication). Sender IDs are alphanumeric only, so no hyphens.

## Sender IDs
- Up to 11 alphanumeric characters; 4–8 is ideal. Free to request.
- Dashboard: Settings → Sender IDs → Request New Sender ID; provide business name, registration number and use case. Review takes ~1–3 business days (Tegasms plus carriers).
- Rejected: impersonating government or banks, deceptive names, spam/phishing.
- If approved but a number still shows: contact support (some carriers need extra configuration).

## Analytics and reports
- Statuses: **Sent** (in transit), **Delivered**, **Pending**, **Failed** (undeliverable), **Bounced** (invalid/unreachable).
- Delivery rate = Delivered / Total sent × 100; cost per message and campaign ROI available.
- Export CSV/PDF with numbers, status, timestamps, carrier, cost.
- Troubleshooting failures: check number format and country code, number validity, sender ID approval; then email support.
