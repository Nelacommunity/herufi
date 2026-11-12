# Herufi

Buy direct from China, delivered to Tanzania. A bilingual (English / Kiswahili) storefront priced in Tanzanian shillings, with an admin dashboard, built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS 4** and **Supabase** (Postgres, Auth, Storage, RLS).

## Setup

1. **Create a Supabase project** and copy `.env.example` to `.env.local`, then fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only. Used by `scripts/create-admin.mjs` and by the payment code (Snippe webhook, starting a payment, payment status). Never expose it to the browser.
   - `SNIPPE_API_KEY`, `SNIPPE_WEBHOOK_SECRET`: from the Snippe dashboard. Register `https://your-domain/api/snippe/webhook` as the webhook URL.
   - `SUPABASE_DB_URL`: the *Session pooler* connection string (Connect → Session pooler), used by the DB scripts
2. **Install, migrate and seed**
   ```bash
   pnpm install
   pnpm db:setup          # applies supabase/migrations/*.sql, then loads supabase/seed.sql
   # (or paste each migration, then seed.sql, into the Supabase SQL editor)
   pnpm admin:create you@example.com 'a-strong-password' "Your Name"
   pnpm dev
   ```
3. **Auth settings** (Supabase → Authentication → URL Configuration):
   - Site URL: your deployed URL (or `http://localhost:3000`)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `https://your-domain/auth/callback`
   - Google: enable the provider, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

**Deploying to a VPS with Coolify** (app + self-hosted Supabase): see [`docs/DEPLOY-COOLIFY.md`](docs/DEPLOY-COOLIFY.md).

`pnpm db:migrate` applies only new migrations. `pnpm db:seed` reloads the demo catalog, which **replaces** products, categories, reviews, coupons and orders. Edit `scripts/seed/catalog.mjs` and run `pnpm db:seed:build` to regenerate `supabase/seed.sql`.

## Demo data

The seed loads 8 categories and 54 products with multiple images, variants, discounts, about 300 reviews, Q&A, 84 historical orders for the dashboard, and these coupons:

| Code | Effect |
|---|---|
| `KARIBU10` | 10% off |
| `OKOA50` | TSh 50,000 off orders over TSh 400,000 |
| `SIKUKUU20` | expired (shows the error state) |

Prices are TZS (seed values are USD × 2,600, rounded). Shipping from China: air cargo (10–14 days, free over TSh 250,000, else TSh 15,000), express air (5–7 days, TSh 45,000), sea freight (30–45 days, TSh 8,000). VAT is 18%. These rules live in `supabase/migrations/0005_tanzania.sql`.

Payments go through **[Snippe](https://snippe.sh)** (`src/lib/snippe.ts`, `src/actions/checkout.ts`):

- **Mobile money** (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa): the customer gets a USSD prompt on their phone and enters their PIN; checkout waits for confirmation.
- **Card**: the customer is sent to Snippe's hosted page, so card numbers never touch Herufi.
- Orders are created **unpaid** and hold their stock. Only the signed webhook (`/api/snippe/webhook`) marks an order paid; the amount always comes from the order in the database, never from the browser.
- Failed, expired or cancelled payments cancel the order and return its stock and coupon. Abandoned checkouts are released automatically (no payment started within 1 hour, or no answer from Snippe within 24 hours).
- If money arrives for an order that had already expired, the order shows as **cancelled** with payment **paid** in the admin: refund or reinstate it.

## Languages

English and Kiswahili, chosen with the EN/SW switch in the header, footer, mobile menu or account settings. The choice is stored in the `herufi-locale` cookie; first-time visitors get Kiswahili if their browser prefers it. Strings live in `src/i18n/dictionaries/{en,sw}.ts` (the Kiswahili file is type-checked against the English one). Product names and descriptions come from the database and are shown as entered. The admin dashboard is English.

## Images

`next/image` uses a custom loader (`src/lib/image-loader.ts`) that asks the image CDN to resize: Unsplash/imgix for the demo catalog, Supabase Image Transformations for uploads when `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=true` (Pro plan). Without that flag, uploaded images are served at their original size.

## Architecture

```
src/
  app/                 routes (App Router)
    (shop)/            storefront: home, products, categories, cart, wishlist, account, help
    (auth)/            login, signup, forgot/reset password
    checkout/          focused checkout layout + success page
    admin/             dashboard (server-side role check in layout + every action)
    auth/              OAuth / magic-link / recovery callbacks
    api/search/        cached autocomplete endpoint
    sitemap.ts, robots.ts, opengraph-image.tsx
  actions/             server actions (validated with zod)
  components/          ui/ primitives, layout/, product/, catalog/, cart/, checkout/, account/, admin/, home/
  lib/
    supabase/          browser, server (cookie session), public (cached, cookie-less) clients + proxy session refresh
    queries/           catalog queries (server-only) and shared mappers
    auth.ts            getUser / requireUser / requireAdmin
  providers/           client store (cart, wishlist, auth) and UI state
  proxy.ts             session refresh and route protection (Next 16 "proxy", formerly middleware)
supabase/
  migrations/          schema, RLS & storage policies, business-logic RPCs
  seed.sql             generated demo data
```

### Key decisions

- **Prices are never trusted from the browser.** `quote_order` and `place_order` (Postgres functions) resolve prices, variant surcharges, coupons, shipping and tax, lock and decrement stock, and record the order in one transaction. The cart and checkout display server quotes.
- **RLS everywhere.** Users can read and write only their own profile, cart, wishlist, addresses, payment methods and views, and can read only their own orders. Profile `role`/`status`, product rating/sales counters and order totals are protected with column-level privileges. Staff roles are `admin` (only the permissions a super admin grants, e.g. create products or view orders) and `super_admin` (everything, including managing staff). Every admin read and write requires `has_permission(...)` at the database level *and* a server-side check in each action (see `supabase/migrations/0009_staff_permissions.sql` and `src/lib/permissions.ts`). Discount codes are assigned to a staff member so their orders and revenue can be tracked per admin. The service-role key is only used server-side: by a local CLI script and by the Snippe payment code.
- **Fast catalog pages.** Public catalog reads use a cookie-less client whose requests go through Next's data cache (tag `catalog`), so the home, category and product pages are statically generated and revalidated when an admin changes the catalog.
- **Guest-friendly cart and wishlist.** Both live in local storage for guests, are merged into the account on sign-in, and then sync to Supabase.
- **Search.** A weighted `tsvector` (name, brand, category, description) with prefix matching, plus `pg_trgm` word similarity for typos, behind a debounced, keyboard-navigable overlay.

## Scripts

| Command | |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | quality checks |
| `pnpm db:setup` / `db:migrate` / `db:seed` | database |
| `pnpm admin:create <email> <password> [name]` | create or promote a super admin (add other staff from /admin/staff) |
