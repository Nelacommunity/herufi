import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** The visitor's IP. On Vercel, x-real-ip / the first x-forwarded-for entry is set by the platform. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Fixed-window rate limit per visitor (IP) for one action, stored in Postgres (hit_rate_limit) so it
 * works across serverless instances. Returns true when the request may go ahead.
 * Fails open: if the limiter itself is unavailable, real customers are never blocked.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, ip?: string): Promise<boolean> {
  try {
    const key = `${bucket}:${ip ?? (await clientIp())}`;
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) {
      if (error.code !== "PGRST202") console.error("Rate limit check failed", bucket, error.message);
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}
