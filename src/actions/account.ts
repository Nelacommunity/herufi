"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { addressSchema, isTzMobile } from "@/lib/validation";
import { TZ_REGIONS } from "@/lib/constants";
import { safeNext } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { releaseUnpaidOrder } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/types";
import { getI18n } from "@/i18n/server";

async function authed() {
  const [user, { t, locale }] = await Promise.all([getUser(), getI18n()]);
  if (!user) throw new Error(t.errors.signInAgain);
  return { user, t, locale, supabase: await createClient() };
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
  const row = { ...data, line2: data.line2 || null, region: data.region || null, postal_code: data.postal_code || null, phone: data.phone, latitude: data.latitude ?? null, longitude: data.longitude ?? null, is_default: makeDefault || !count };
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

const onboardingSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().refine(isTzMobile),
  region: z.enum(TZ_REGIONS as [string, ...string[]]),
  city: z.string().trim().min(2).max(100),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  latitude: addressSchema.shape.latitude,
  longitude: addressSchema.shape.longitude,
  next: z.string().optional(),
});

/** "+255 754 123 456" from 0754123456 / 255754123456 / +255 754 123 456. */
function formatTzPhone(input: string) {
  const d = input.replace(/\D/g, "");
  const local = d.startsWith("255") ? d.slice(3) : d.replace(/^0/, "");
  return `+255 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/**
 * First-visit profile: phone number and where the customer lives. Saves the phone on the profile,
 * the address as the default delivery address, then marks the account as onboarded (a flag in the
 * auth user's metadata, which the proxy reads from the session to stop asking).
 */
export async function completeOnboarding(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { user, t, locale, supabase } = await authed();
  if (!(await rateLimit("onboarding", 10, 600))) return { ok: false, error: t.errors.tooMany };
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fields = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    const o = t.onboarding.errors;
    return {
      ok: false,
      error: t.errors.checkFields,
      fieldErrors: {
        full_name: fields.has("full_name") ? [t.checkout.errors.name] : undefined,
        phone: fields.has("phone") ? [o.phone] : undefined,
        city: fields.has("city") ? [o.city] : undefined,
        line1: fields.has("line1") ? [o.area] : undefined,
      },
    };
  }
  const { full_name, region, city, line1, line2, latitude, longitude, next } = parsed.data;
  const phone = formatTzPhone(parsed.data.phone);

  const { error: profileError } = await supabase.from("profiles").update({ full_name, phone }).eq("user_id", user.id);
  if (profileError) return { ok: false, error: t.errors.generic };

  const address = { full_name, phone, line1, line2: line2 || null, city, region, country: "TZ", postal_code: "", latitude: latitude ?? null, longitude: longitude ?? null };
  const { data: existing } = await supabase.from("addresses").select("id").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at").limit(1).maybeSingle();
  const { error: addressError } = existing
    ? await supabase.from("addresses").update(address).eq("id", existing.id)
    : await supabase.from("addresses").insert({ ...address, user_id: user.id, label: locale === "sw" ? "Nyumbani" : "Home", is_default: true });
  if (addressError) return { ok: false, error: t.errors.generic };

  const { error: metaError } = await supabase.auth.updateUser({ data: { full_name, onboarded: true } });
  if (metaError) return { ok: false, error: t.errors.generic };
  // The proxy reads the flag from the session token, so issue a fresh one now.
  await supabase.auth.refreshSession();

  revalidatePath("/account", "layout");
  redirect(safeNext(next, "/"));
}

/**
 * Deletes the signed-in customer's account (PDPA right to erasure). The customer must type their
 * email to confirm. Unpaid orders are released, past orders are stripped of personal details and
 * kept for accounting (prepare_account_deletion), the avatar is removed, then the auth user is
 * deleted, which cascades to everything else tied to the account.
 */
export async function deleteMyAccount(confirmEmail: string): Promise<ActionResult> {
  const { user, t, locale, supabase } = await authed();
  const d = t.account.settings.delete;
  if (!(await rateLimit("delete-account", 3, 3600))) return { ok: false, error: t.errors.tooMany };
  if (!user.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return { ok: false, error: d.mismatch };

  // Staff accounts are removed by a super admin, so nobody locks the shop out by accident.
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (profile?.role && profile.role !== "customer") return { ok: false, error: d.staff };

  let db: ReturnType<typeof createAdminClient>;
  try { db = createAdminClient(); } catch { return { ok: false, error: t.errors.generic }; }

  // Give back stock held by unpaid orders first (Snippe is checked, so a paid one is kept).
  const [byUser, byEmail] = await Promise.all([
    db.from("orders").select("order_number").eq("payment_status", "pending").eq("user_id", user.id),
    db.from("orders").select("order_number").eq("payment_status", "pending").eq("email", user.email.toLowerCase()),
  ]);
  const unpaid = new Set([...(byUser.data ?? []), ...(byEmail.data ?? [])].map((o) => o.order_number));
  for (const n of unpaid) await releaseUnpaidOrder(n);

  const { error: prepError } = await db.rpc("prepare_account_deletion", { p_user: user.id });
  if (prepError) {
    if (prepError.message.includes("ACTIVE_ORDERS")) return { ok: false, error: d.activeOrders };
    console.error("Account deletion: prepare failed", user.id, prepError);
    return { ok: false, error: t.errors.generic };
  }

  const { data: files } = await db.storage.from("avatars").list(user.id);
  if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("Account deletion: auth delete failed", user.id, deleteError);
    return { ok: false, error: t.errors.generic };
  }

  // A short confirmation (best effort; the account is already gone).
  await sendEmail({
    to: user.email,
    subject: d.emailSubject,
    text: d.emailBody,
    html: `<p style="font-family:sans-serif;font-size:15px;line-height:1.6">${d.emailBody.replace(/\n/g, "<br>")}</p>`,
  }).catch(() => undefined);

  await supabase.auth.signOut().catch(() => undefined);
  redirect(locale === "sw" ? "/?account=deleted&lang=sw" : "/?account=deleted");
}
