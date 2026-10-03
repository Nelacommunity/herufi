"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useStore } from "@/providers/store-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { plural } from "@/i18n/config";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { user, authReady } = useStore();
  const { t } = useI18n();
  const p = t.product;
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, action, pending] = useActionState(submitReview, null);

  if (!authReady) return null;
  if (!user) {
    return <Link href={`/login?next=/products/${slug}%23reviews`} className="text-sm font-medium underline underline-offset-4">{p.signInToReview}</Link>;
  }
  if (state?.ok) return <p className="rounded-xl bg-accent-soft p-4 text-sm text-accent">{state.message}</p>;
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>{p.writeReview}</Button>;

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="w-full space-y-5 rounded-2xl border border-border p-5 animate-fade-up sm:p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <p className="mb-2 text-sm font-medium">{p.yourRating}</p>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={p.yourRating}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={plural(p.stars, n)} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-0.5 transition-transform active:scale-90">
              <Star className={cn("h-7 w-7 transition-colors", (hover || rating) >= n ? "fill-star text-star" : "text-border-strong")} />
            </button>
          ))}
        </div>
        {errors?.rating && <p className="mt-1.5 text-sm text-sale">{errors.rating[0]}</p>}
      </div>
      <Field label={p.reviewTitle} htmlFor="review-title" error={errors?.title?.[0]}>
        <Input id="review-title" name="title" maxLength={120} placeholder={p.reviewTitlePlaceholder} required />
      </Field>
      <Field label={p.reviewBody} htmlFor="review-content" error={errors?.content?.[0]}>
        <Textarea id="review-content" name="content" maxLength={4000} placeholder={p.reviewBodyPlaceholder} required />
      </Field>
      {state && !state.ok && !errors && <p className="text-sm text-sale">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>{p.postReview}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
      </div>
    </form>
  );
}
