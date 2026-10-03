"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { answerQuestion } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import type { ProductQuestion } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

export function QuestionAnswerList({ questions }: { questions: ProductQuestion[] }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:mr-[364px]">
      <h2 className="font-semibold">Customer questions</h2>
      <ul className="mt-4 divide-y divide-border">
        {questions.map((q) => (
          <li key={q.id} className="py-4">
            <p className="text-sm"><span className="font-medium">{q.question}</span> <span className="text-muted">· {q.author_name}, {formatRelative(q.created_at)}</span></p>
            {q.answer ? <p className="mt-2 text-sm text-muted">{q.answer}</p> : (
              <div className="mt-3 flex gap-2">
                <input value={drafts[q.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })} placeholder="Write an answer…" className="h-10 flex-1 rounded-full border border-border-strong bg-surface px-4 text-sm outline-none focus:border-foreground" />
                <Button size="sm" className="h-10" disabled={pending} onClick={() => start(async () => { const r = await answerQuestion(q.id, drafts[q.id] ?? ""); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); })}>Answer</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
