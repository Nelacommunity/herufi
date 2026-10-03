"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { askQuestion } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useStore } from "@/providers/store-provider";
import type { ProductQuestion } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function QuestionsSection({ questions, productId, slug }: { questions: ProductQuestion[]; productId: string; slug: string }) {
  const { user } = useStore();
  const { t, locale } = useI18n();
  const p = t.product;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(askQuestion, null);

  return (
    <section id="questions" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.qaTitle}</h2>
          <p className="mt-2 text-muted">{p.qaDesc}</p>
        </div>
        {user ? (
          !open && !state?.ok && <Button variant="secondary" onClick={() => setOpen(true)}><MessageCircleQuestion className="h-4 w-4" /> {p.askQuestion}</Button>
        ) : (
          <Link href={`/login?next=/products/${slug}%23questions`} className="text-sm font-medium underline underline-offset-4">{p.signInToAsk}</Link>
        )}
      </div>

      {state?.ok && <p className="mt-6 rounded-xl bg-accent-soft p-4 text-sm text-accent">{state.message}</p>}
      {open && !state?.ok && (
        <form action={action} className="mt-6 space-y-3 animate-fade-up">
          <input type="hidden" name="productId" value={productId} />
          <label htmlFor="question" className="sr-only">{p.yourQuestion}</label>
          <Textarea id="question" name="question" required minLength={5} maxLength={1000} placeholder={p.questionPlaceholder} />
          {state && !state.ok && <p className="text-sm text-sale">{state.error}</p>}
          <div className="flex gap-2"><Button type="submit" loading={pending}>{p.submitQuestion}</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button></div>
        </form>
      )}

      {questions.length ? (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {questions.map((q) => (
            <li key={q.id} className="grid gap-3 py-6 sm:grid-cols-[120px_1fr]">
              <p className="text-sm text-muted" suppressHydrationWarning>{q.author_name} · {formatRelative(q.created_at, locale)}</p>
              <div>
                <p className="font-medium"><span className="mr-2 font-semibold text-muted">Q</span>{q.question}</p>
                {q.answer ? (
                  <p className="mt-2 text-pretty leading-relaxed text-muted"><span className="mr-2 font-semibold text-foreground">A</span>{q.answer}<span className="mt-1 block text-xs text-subtle">{p.answeredBy}</span></p>
                ) : (
                  <p className="mt-2 text-sm italic text-subtle">{p.awaitingAnswer}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">{p.noQuestions}</p>
      )}
    </section>
  );
}
