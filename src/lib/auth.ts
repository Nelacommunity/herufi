import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Verified user for this request (validated with the Auth server, not just the cookie). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, email, full_name, avatar_url, phone, role, status, marketing_opt_in, created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});

export async function requireUser(next = "/account") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Server-side admin gate. The role is read from the database with the user's own
 * session; RLS (`is_admin()`) enforces the same rule on every admin write.
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") redirect("/");
  return { user, profile };
}

/** For server actions: returns an error instead of redirecting. */
export async function assertAdmin() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    throw new Error("You do not have permission to do that.");
  }
  return profile;
}
