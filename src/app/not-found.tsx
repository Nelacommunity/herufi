import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-20 items-center"><Logo /></header>
      <main id="main" className="container-page flex flex-1 flex-col items-center justify-center pb-24 text-center animate-fade-up">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-surface-2"><Compass className="h-8 w-8 stroke-[1.5]" /></div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-muted">{t.errors.notFoundEyebrow}</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-7xl">{t.errors.notFoundTitle}</h1>
        <p className="mt-4 max-w-md text-lg text-muted">{t.errors.notFoundDesc}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ size: "lg" })}>{t.common.backToHome}</Link>
          <Link href="/products" className={buttonVariants({ size: "lg", variant: "secondary" })}>{t.common.browseProducts}</Link>
        </div>
      </main>
    </div>
  );
}
