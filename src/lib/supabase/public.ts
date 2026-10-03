import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

export const CATALOG_TAG = "catalog";

/**
 * Cookie-less anonymous client for public catalog reads. Responses go through
 * Next's fetch cache (tagged "catalog") so pages can be statically rendered and
 * revalidated on demand when an admin edits the catalog.
 */
export function createPublicClient(revalidate = 300) {
  assertSupabaseEnv();
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "force-cache", next: { revalidate, tags: [CATALOG_TAG] } }),
    },
  });
}
