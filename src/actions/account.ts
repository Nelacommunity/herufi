"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { getI18n } from "@/i18n/server";

async function authed() {
  const [user, { t }] = await Promise.all([getUser(), getI18n()]);
  if (!user) throw new Error(t.errors.signInAgain);
  return { user, t, supabase: await createClient() };
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function updateProfile(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { user, t, supabase } = await authed();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: t.errors.checkFields, fieldErrors: { full_name: parsed.error.issues.some((i) => i.path[0] === "full_name") ? [t.checkout.errors.name] : undefined } };
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null }).eq("user_id", user.id);
  if (error) return { ok: false, error: t.errors.generic };
  await supabase.auth.updateUser({ data: { full_name: parsed.data.full_name } });
  revalidatePath("/account", "layout");
  return { ok: true, message: t.account.profileSaved };
}

export async function updateAvatar(url: string): Promise<ActionResult> {
  const { user, t, supabase } = await authed();
  // Only accept files from this user's own folder in the avatars bucket.
  const prefix = `/storage/v1/object/public/avatars/${user.id}/`;
  if (!new URL(url).pathname.startsWith(prefix)) return { ok: false, error: "Invalid avatar location." };
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/account", "layout");
  return { ok: true };
}

export async function updatePreferences(marketing: boolean): Promise<ActionResult> {
  const { user, t, supabase } = await authed();
  const { error } = await supabase.from("profiles").update({ marketing_opt_in: marketing }).eq("user_id", user.id);
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/account/settings");
  return { ok: true, message: t.account.settings.preferencesSaved };
}

export async function saveAddress(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { user, t, supabase } = await authed();
  const raw = Object.fromEntries(formData);
  const parsed = addressSchema.extend({ label: z.string().trim().min(1).max(40), id: z.uuid().optional().or(z.literal("")), is_default: z.string().optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t.errors.checkFields, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { id, is_default, ...data } = parsed.data;
  const makeDefault = is_default === "on";
  if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  const row = { ...data, line2: data.line2 || null, region: data.region || null, postal_code: data.postal_code || null, phone: data.phone, is_default: makeDefault || !count };
  const { error } = id
    ? await supabase.from("addresses").update(row).eq("id", id)
    : await supabase.from("addresses").insert({ ...row, user_id: user.id });
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/account/addresses");
  return { ok: true, message: id ? t.account.addresses.updated : t.account.addresses.added };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const { t, supabase } = await authed();
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/account/addresses");
  return { ok: true, message: t.account.addresses.removed };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const { user, t, supabase } = await authed();
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) return { ok: false, error: t.errors.generic };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function clearRecentlyViewed(): Promise<ActionResult> {
  const { user, supabase } = await authed();
  await supabase.from("product_views").delete().eq("user_id", user.id);
  revalidatePath("/account/recently-viewed");
  return { ok: true };
}
