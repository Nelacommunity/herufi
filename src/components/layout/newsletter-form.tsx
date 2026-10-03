"use client";

import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { subscribeNewsletter } from "@/actions/newsletter";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function NewsletterForm({ tone = "default" }: { tone?: "default" | "inverse" }) {
  const [state, action, pending] = useActionState(subscribeNewsletter, null);
  const { t } = useI18n();
  if (state?.ok) {
    return <p className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {state.message}</p>;
  }
  return (
    <form action={action} className="w-full">
      <div className={cn("flex h-12 items-center rounded-full border pl-5 pr-1.5 transition-colors focus-within:border-current", tone === "inverse" ? "border-white/25 bg-white/5" : "border-border-strong bg-surface")}>
        <label htmlFor={`newsletter-${tone}`} className="sr-only">{t.newsletter.placeholder}</label>
        <input id={`newsletter-${tone}`} name="email" type="email" required placeholder={t.newsletter.placeholder} autoComplete="email" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-current placeholder:opacity-50" />
        <button disabled={pending} className={cn("grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-95", tone === "inverse" ? "bg-white text-neutral-950" : "bg-foreground text-background")} aria-label={t.newsletter.subscribe}>
          {pending ? <Spinner /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
      {state && !state.ok && <p className="mt-2 text-sm text-sale">{state.error}</p>}
    </form>
  );
}
