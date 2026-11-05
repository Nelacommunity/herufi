# Deploying to a VPS with Coolify (app + self-hosted Supabase)

Both run on the same Coolify server: Supabase as a one-click **Service**, the storefront as an
**Application** built from this repo's `Dockerfile`.

Do it in this order. **Supabase has to be up before the app's first build**, because the catalog pages are
generated at build time.

## 1. DNS

Point two records at the VPS IP:

| Record | Used for |
|---|---|
| `herufi.example.com` | the storefront |
| `api.herufi.example.com` | Supabase (Kong gateway: auth, REST, storage) |

## 2. Supabase service

1. Coolify → **+ New → Service → Supabase**.
2. Open the **supabase-kong** resource and set its domain to `https://api.herufi.example.com`.
   Leave Studio on its own domain, or skip it. It's password protected (`SERVICE_USER_ADMIN` / `SERVICE_PASSWORD_ADMIN`).
3. **Environment Variables** (on the service). Change these:

   | Variable | Value |
   |---|---|
   | `SERVICE_FQDN_SUPABASEKONG` / `API_EXTERNAL_URL` | `https://api.herufi.example.com` |
   | `GOTRUE_SITE_URL` | `https://herufi.example.com` |
   | `ADDITIONAL_REDIRECT_URLS` | `https://herufi.example.com/auth/callback,http://localhost:3000/auth/callback` |
   | `ENABLE_EMAIL_AUTOCONFIRM` | `false` (sign-ups must confirm their email) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME` | a real mail provider (Resend, Brevo, Mailgun, SES…). Without it, confirmation, magic-link and password-reset emails are never sent. |
   | `MAILER_URLPATHS_*` | leave as default |

   Google sign-in (optional): add `GOTRUE_EXTERNAL_GOOGLE_ENABLED=true`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`,
   `GOTRUE_EXTERNAL_GOOGLE_SECRET` and `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://api.herufi.example.com/auth/v1/callback`
   on the **supabase-auth** container (edit the compose file if the template doesn't list them). Use the same
   redirect URI in Google Cloud Console.
4. Deploy. Copy these generated values for later:
   - `SERVICE_SUPABASEANON_KEY` → the app's `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SERVICE_SUPABASESERVICE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`
   - `SERVICE_PASSWORD_POSTGRES` → database password

Check it with `curl https://api.herufi.example.com/auth/v1/health -H "apikey: <anon key>"`. It should return JSON.

> Image resizing: Coolify's Supabase ships with imgproxy (`IMGPROXY_ENABLE_WEBP_DETECTION`, `ENABLE_IMAGE_TRANSFORMATION=true`
> on supabase-storage). If it's enabled, set `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=true` in the app so uploads are served resized.
> Upload size is capped by `FILE_SIZE_LIMIT` on supabase-storage (and by the bucket limit in `0002_security.sql`).

## 3. Migrations, seed and first admin (from your laptop)

Postgres isn't exposed to the internet, and it shouldn't be. Open an SSH tunnel to the database container instead:

```bash
# on the VPS: find the DB container's internal IP
ssh root@VPS "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' \$(docker ps -qf name=supabase-db)"

# on your laptop: forward local 54322 → that IP:5432 (keep it open)
ssh -N -L 54322:<DB_IP>:5432 root@VPS
```

Create `.env.prod` (git-ignored; deliberately *not* `.env.production`, which `next build` would auto-load):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.herufi.example.com
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_SUPABASESERVICE_KEY>
SUPABASE_DB_URL=postgresql://postgres:<SERVICE_PASSWORD_POSTGRES>@localhost:54322/postgres
```

Then:

```bash
pnpm db:setup:prod      # all migrations + demo seed  (or: pnpm db:migrate:prod for schema only)
pnpm admin:create:prod you@example.com 'a-strong-password' "Your Name"
```

Run `pnpm db:migrate:prod` the same way whenever a new file lands in `supabase/migrations/`, **before** deploying
the app code that needs it. If you connect to Postgres some other way without TLS, append `?sslmode=disable` to the URL.

## 4. App

1. Coolify → **+ New → Application** → your Git repo, branch `main`, **Build Pack: Dockerfile**.
2. **Domain**: `https://herufi.example.com`. **Ports Exposes**: `3000`.
3. **Environment Variables**. Tick **Build Variable** on every `NEXT_PUBLIC_*` one. They're baked into the bundle,
   so changing them requires a redeploy, not just a restart.

   | Variable | Build var? | Value |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ✅ | `https://api.herufi.example.com` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon key |
   | `NEXT_PUBLIC_SITE_URL` | ✅ | `https://herufi.example.com` |
   | `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | ✅ | `true` / `false` |
   | `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS` | ✅ | `true` if imgproxy is on |
   | `SUPABASE_SERVICE_ROLE_KEY` | ❌ | service key (needed for push notifications) |
   | `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PRICE_MULTIPLIER`, `AI_PRICE_ROUNDING`, `AI_DEFAULT_STOCK`, `CNY_TZS_RATE` | ❌ | as in `.env.example` |
   | `CRON_SECRET` | ❌ | long random string (`openssl rand -hex 32`) |
   | `EXPO_ACCESS_TOKEN` | ❌ | optional |
   | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | ✅ | `openssl rand -base64 32`, fixed. Keeps open tabs' forms working across redeploys. |

4. Deploy. The container has a health check on `/robots.txt`.

## 5. Push-notification cron (replaces `vercel.json`)

App → **Scheduled Tasks → Add**:

- Name: `push`
- Frequency: `0 7 * * *` (07:00 server time; Vercel used UTC)
- Command:
  ```sh
  wget -qO- --header "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/notifications/push
  ```

The task runs inside the app container, so `$CRON_SECRET` comes from the app's env. If your Coolify version
doesn't expand variables in task commands, paste the secret into the command.

## Checklist after the first deploy

- [ ] Home, a category and a product page load with images
- [ ] Sign up → confirmation email arrives → link lands back on `herufi.example.com` and signs you in
- [ ] Password reset email works
- [ ] `/admin` works for the super admin; an image upload shows up on the product page
- [ ] Checkout places an order (payment is still the mock step; see README)
- [ ] Scheduled task "push" → **Execute now** returns JSON, not `Unauthorized`
- [ ] Backups: Coolify → Supabase service → **supabase-db** → Backups (S3 target + schedule). Storage files live in the
      `supabase-storage` volume, so back that up too.

## Notes

- **Catalog cache**: pages are statically generated at build and revalidated on admin edits (`revalidateTag`). The cache lives
  inside the container, so each redeploy starts fresh from the build. That's fine for a single instance. Don't scale the app
  to several replicas without a shared cache handler.
- **Build server needs Supabase**: the build fetches the catalog from `NEXT_PUBLIC_SUPABASE_URL`. If a build fails with
  `fetch failed`, check that Supabase is up and the domain resolves from the VPS.
- `maxDuration` in the API routes only applies on Vercel and is ignored here, so there's no timeout on the AI import.
  If you put Cloudflare in front, its 100 s proxy limit can still cut long AI imports.
