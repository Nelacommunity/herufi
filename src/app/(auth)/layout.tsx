import Image from "next/image";
import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getI18n } from "@/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between"><Logo /><LanguageSwitcher compact /></div>
        <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12 animate-fade-up">{children}</main>
        <p className="text-center text-xs text-muted">© {new Date().getFullYear()} Herufi · {t.auth.secured}</p>
      </div>
      <div className="relative hidden overflow-hidden bg-surface-2 lg:block">
        <Image src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <blockquote className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-display text-4xl leading-tight">{t.auth.quote}</p>
          <footer className="mt-4 text-sm text-white/75">{t.auth.quoteBy}</footer>
        </blockquote>
      </div>
    </div>
  );
}
