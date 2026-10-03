export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
}
