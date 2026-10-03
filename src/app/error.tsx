"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const { t } = useI18n();
  const e = t.errors;
  const notConfigured = /Supabase is not configured/.test(error.message);
  return (
    <main id="main" className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center animate-fade-up">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{e.errorEyebrow}</p>
      <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">{notConfigured ? e.notConfiguredTitle : e.errorTitle}</h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        {notConfigured ? e.notConfiguredDesc : e.errorDesc}
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-subtle">{fmt(e.reference, { digest: error.digest })}</p>}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}><RefreshCw className="h-4 w-4" /> {t.common.tryAgain}</Button>
        <Link href="/" className={buttonVariants({ size: "lg", variant: "secondary" })}>{t.common.goHome}</Link>
      </div>
    </main>
  );
}
