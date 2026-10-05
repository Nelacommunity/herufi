import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { can, isStaff, isSuperAdmin, type Permission } from "@/lib/permissions";

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
  const cols = "id, user_id, email, full_name, avatar_url, phone, role, status, marketing_opt_in, created_at";
  const first = await supabase.from("profiles").select(`${cols}, permissions`).eq("user_id", user.id).maybeSingle();
  let data: Record<string, unknown> | null = first.data;
  // Before migration 0009 the permissions column doesn't exist (42703); fall back so admins aren't locked out.
  if (first.error?.code === "42703") data = (await supabase.from("profiles").select(cols).eq("user_id", user.id).maybeSingle()).data;
  return data ? ({ ...data, permissions: (data.permissions as string[] | undefined) ?? [] } as Profile) : null;
});

export async function requireUser(next = "/account") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Server-side staff gate (admins and super admins). The role is read from the database with the user's own
 * session; Row Level Security enforces the same permissions on every read and write.
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (!isStaff(profile)) redirect("/");
  return { user, profile: profile! };
}

/** Page gate for one permission: staff without it are sent back to the admin home. */
export async function requirePermission(...anyOf: Permission[]) {
  const ctx = await requireAdmin();
  if (!anyOf.some((p) => can(ctx.profile, p))) redirect("/admin?denied=1");
  return ctx;
}

export async function requireSuperAdmin() {
  const ctx = await requireAdmin();
  if (!isSuperAdmin(ctx.profile)) redirect("/admin?denied=1");
  return ctx;
}

/** For server actions: throws instead of redirecting. Pass no permission to require any staff role. */
export async function assertAdmin(...anyOf: Permission[]) {
  const profile = await getProfile();
  if (!isStaff(profile) || (anyOf.length > 0 && !anyOf.some((p) => can(profile, p)))) {
    throw new Error("You do not have permission to do that.");
  }
  return profile!;
}

export async function assertSuperAdmin() {
  const profile = await getProfile();
  if (!isSuperAdmin(profile)) throw new Error("Only a super admin can do that.");
  return profile!;
}
