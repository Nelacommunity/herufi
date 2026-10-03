import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

let client: SupabaseClient | undefined;

/** Browser client (singleton). Uses the anon key; every query is subject to RLS. */
export function createClient() {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
