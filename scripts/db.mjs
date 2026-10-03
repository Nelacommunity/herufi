// Applies migrations and/or seed data to the database in SUPABASE_DB_URL.
// Usage: node --env-file=.env.local scripts/db.mjs [migrate|seed|reset]
//   migrate  apply supabase/migrations/*.sql not yet recorded in public._herufi_migrations
//   seed     load supabase/seed.sql (replaces catalog, reviews, coupons and orders)
//   reset    migrate + seed
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = fileURLToPath(new URL('..', import.meta.url));
const cmd = process.argv[2] ?? 'reset';
const url = process.env.SUPABASE_DB_URL;
if (!url || url.includes('YOUR-PROJECT-REF')) {
  console.error('Set SUPABASE_DB_URL in .env.local (Supabase → Connect → Session pooler).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false } });
await client.connect();

async function migrate() {
  await client.query('create table if not exists public._herufi_migrations (name text primary key, applied_at timestamptz not null default now())');
  await client.query('alter table public._herufi_migrations enable row level security');
  let { rows } = await client.query('select name from public._herufi_migrations');
  const files = readdirSync(`${root}/supabase/migrations`).filter((f) => f.endsWith('.sql')).sort();
  // Baseline: if the schema was applied by hand (e.g. in the SQL editor), don't re-run what's already there.
  if (!rows.length) {
    const { rows: probe } = await client.query(`select
      to_regclass('public.products') is not null as has_schema,
      to_regclass('public.newsletter_subscribers') is not null as has_newsletter`);
    if (probe[0].has_schema) {
      const baseline = files.filter((f) => f < '0004' || (f.startsWith('0004') && probe[0].has_newsletter));
      for (const f of baseline) await client.query('insert into public._herufi_migrations (name) values ($1) on conflict do nothing', [f]);
      console.log(`Existing schema detected; marked as applied: ${baseline.join(', ')}`);
      ({ rows } = await client.query('select name from public._herufi_migrations'));
    }
  }
  const done = new Set(rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    process.stdout.write(`→ ${f} … `);
    await client.query('begin');
    try {
      await client.query(readFileSync(`${root}/supabase/migrations/${f}`, 'utf8'));
      await client.query('insert into public._herufi_migrations (name) values ($1)', [f]);
      await client.query('commit');
      console.log('ok');
    } catch (e) {
      await client.query('rollback');
      console.log('failed');
      throw e;
    }
  }
}

async function seedDb() {
  process.stdout.write('→ seed.sql … ');
  await client.query(readFileSync(`${root}/supabase/seed.sql`, 'utf8'));
  console.log('ok');
}

try {
  if (cmd === 'migrate' || cmd === 'reset') await migrate();
  if (cmd === 'seed' || cmd === 'reset') await seedDb();
  // Ask PostgREST to pick up schema changes immediately.
  await client.query("notify pgrst, 'reload schema'");
} catch (e) {
  console.error(e.message);
  if (e.position) console.error('at position', e.position);
  process.exitCode = 1;
} finally {
  await client.end();
}
