"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/supabase/public";
import type { ActionResult } from "@/lib/types";
import { getI18n } from "@/i18n/server";

const reviewSchema = z.object({
  productId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  content: z.string().trim().min(10).max(4000),
});

export async function submitReview(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const [user, { t }] = await Promise.all([getUser(), getI18n()]);
  const f = t.forms;
  if (!user) return { ok: false, error: f.reviewSignIn };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    return { ok: false, error: t.errors.checkFields, fieldErrors: {
      rating: bad.has("rating") ? [f.ratingRequired] : undefined,
      title: bad.has("title") ? [f.titleRequired] : undefined,
      content: bad.has("content") ? [f.contentShort] : undefined,
    } };
  }

  const profile = await getProfile();
  const name = profile?.full_name?.trim();
  const author = name ? `${name.split(/\s+/)[0]} ${name.split(/\s+/).slice(1).map((n) => `${n[0]}.`).join(" ")}`.trim() : t.product.verifiedBuyer;

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    product_id: parsed.data.productId, user_id: user.id, author_name: author,
    rating: parsed.data.rating, title: parsed.data.title, content: parsed.data.content,
  });
  if (error) return { ok: false, error: error.code === "23505" ? f.reviewDuplicate : f.reviewError };
  updateTag(CATALOG_TAG);
  return { ok: true, message: f.reviewThanks };
}

const questionSchema = z.object({ productId: z.uuid(), question: z.string().trim().min(5).max(1000) });

export async function askQuestion(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const [user, { t }] = await Promise.all([getUser(), getI18n()]);
  const f = t.forms;
  if (!user) return { ok: false, error: f.questionSignIn };
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: f.questionShort };
  const profile = await getProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("product_questions").insert({
    product_id: parsed.data.productId, user_id: user.id, question: parsed.data.question,
    author_name: profile?.full_name?.split(/\s+/)[0] ?? "Customer",
  });
  if (error) return { ok: false, error: f.questionError };
  updateTag(CATALOG_TAG);
  return { ok: true, message: f.questionThanks };
}
