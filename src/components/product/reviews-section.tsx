"use client";

import { BadgeCheck } from "lucide-react";
import { Stars } from "@/components/product/rating";
import { ReviewForm } from "@/components/product/review-form";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import type { Review } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

export function ReviewsSection({ reviews, rating, count, productId, slug }: { reviews: Review[]; rating: number; count: number; productId: string; slug: string }) {
  const { t, locale } = useI18n();
  const p = t.product;
  const histogram = [5, 4, 3, 2, 1].map((star) => ({ star, n: reviews.filter((r) => r.rating === star).length }));
  const total = reviews.length || 1;

  return (
    <section id="reviews" className="scroll-mt-28">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.reviewsTitle}</h2>
      <div className="mt-8 grid gap-10 lg:grid-cols-[300px_1fr] lg:gap-16">
        <div>
          <div className="flex items-end gap-3">
            <span className="text-6xl font-semibold tracking-tight tabular-nums">{rating.toFixed(1)}</span>
            <div className="pb-2"><Stars value={rating} size={18} /><p className="mt-1 text-sm text-muted">{fmt(p.reviewsCount, { n: count })}</p></div>
          </div>
          <ul className="mt-6 space-y-2">
            {histogram.map(({ star, n }) => (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="w-3 tabular-nums">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-foreground" style={{ width: `${(n / total) * 100}%` }} /></span>
                <span className="w-6 text-right tabular-nums text-muted">{n}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8"><ReviewForm productId={productId} slug={slug} /></div>
        </div>

        {reviews.length ? (
          <ul className="divide-y divide-border">
            {reviews.map((r) => (
              <li key={r.id} className="py-6 first:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <Stars value={r.rating} size={14} />
                  <time className="text-sm text-muted" dateTime={r.created_at} suppressHydrationWarning>{formatRelative(r.created_at, locale)}</time>
                </div>
                <h3 className="mt-3 font-semibold">{r.title}</h3>
                <p className="mt-2 text-pretty leading-relaxed text-muted">{r.content}</p>
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm"><span className="font-medium">{r.author_name}</span><span className="flex items-center gap-1 text-success"><BadgeCheck className="h-4 w-4" /> {p.verifiedBuyer}</span></p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-surface-2 p-8 text-center"><p className="font-medium">{p.noReviewsTitle}</p><p className="mt-1 text-sm text-muted">{p.noReviewsDesc}</p></div>
        )}
      </div>
    </section>
  );
}
