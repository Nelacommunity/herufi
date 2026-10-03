"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/actions/locale";
import { useI18n } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Segmented EN | SW switch. `compact` shows codes only (header). */
export function LanguageSwitcher({ compact, className }: { compact?: boolean; className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    start(async () => {
      await setLocale(next);
      document.documentElement.lang = next;
      router.refresh();
    });
  }

  return (
    <div role="radiogroup" aria-label={t.common.language} className={cn("inline-flex items-center rounded-full border border-border p-0.5 text-xs font-semibold", pending && "opacity-60", className)}>
      {!compact && <Languages className="ml-2 mr-1 h-3.5 w-3.5 text-muted" aria-hidden />}
      {LOCALES.map((l) => (
        <button key={l} role="radio" aria-checked={locale === l} disabled={pending} onClick={() => choose(l)} title={LOCALE_NAMES[l]}
          className={cn("rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors", locale === l ? "bg-foreground text-background" : "text-muted hover:text-foreground")}>
          {compact ? l : LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
