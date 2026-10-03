"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import type { ActionResult } from "@/lib/types";

export async function subscribeNewsletter(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { t } = await getI18n();
  const parsed = z.email().max(254).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: t.newsletter.invalid };
  const supabase = await createClient();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: parsed.data });
  // A duplicate means they're already subscribed; treat it as success without revealing anything.
  if (error && error.code !== "23505") return { ok: false, error: t.newsletter.error };
  return { ok: true, message: t.newsletter.success };
}
