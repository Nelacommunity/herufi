// Creates (or promotes) a super admin, the first staff account, who can then add other admins from /admin/staff. Runs locally with the service-role key; never ship that key to the browser.
// Usage: pnpm admin:create admin@example.com 'a-strong-password' "Store Owner"
import { createClient } from "@supabase/supabase-js";

const [email, password, name = "Store Admin"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !password) { console.error("Usage: pnpm admin:create <email> <password> [full name]"); process.exit(1); }
if (!url || !key || url.includes("YOUR-PROJECT-REF")) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
if (error) {
  if (!/already|registered|exists/i.test(error.message)) { console.error(error.message); process.exit(1); }
  // Existing user: look them up and promote.
  for (let page = 1; !userId; page++) {
    const { data: list, error: e } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (e || !list.users.length) break;
    userId = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
  }
  if (!userId) { console.error("User exists but could not be found."); process.exit(1); }
  console.log("User already exists; promoting to admin.");
} else {
  userId = data.user.id;
}

const upsert = (role) => supabase.from("profiles").upsert({ user_id: userId, email, full_name: name, role, status: "active" }, { onConflict: "user_id" });
let { error: pErr } = await upsert("super_admin");
// Before migrations 0008/0009 the super_admin role doesn't exist yet; fall back to the old full-access admin role.
if (pErr && /invalid input value for enum/i.test(pErr.message)) ({ error: pErr } = await upsert("admin"));
if (pErr) { console.error(pErr.message); process.exit(1); }
console.log(`✓ ${email} is a super admin. Sign in at /login, then open /admin (add other staff under Staff).`);
