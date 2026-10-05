import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";
import { getProfile, requireUser } from "@/lib/auth";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: { default: t.account.myAccount, template: `%s · ${t.account.myAccount} · Herufi` }, robots: { index: false } };
}

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireUser("/account");
  const [profile, { t }] = await Promise.all([getProfile(), getI18n()]);
  const first = (profile?.full_name ?? user.user_metadata?.full_name ?? "").split(" ")[0];

  return (
    <div className="container-page pt-8 sm:pt-12">
      <p className="text-sm text-muted">{t.account.myAccount}</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">{first ? fmt(t.account.hello, { name: first }) : t.account.welcomeBack}</h1>
      <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[220px_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start"><AccountNav isAdmin={profile?.role === "admin" || profile?.role === "super_admin"} /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
