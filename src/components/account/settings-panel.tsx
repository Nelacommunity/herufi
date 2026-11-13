"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteMyAccount, updatePreferences } from "@/actions/account";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/providers/store-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function SettingsPanel({ marketing, email }: { marketing: boolean; email: string }) {
  const router = useRouter();
  const { signOut } = useStore();
  const [optIn, setOptIn] = useState(marketing);
  const [password, setPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pending, start] = useTransition();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, startDelete] = useTransition();
  const { t } = useI18n();
  const s = t.account.settings;

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error(t.auth.errors.short);
    setSavingPw(true);
    const { error } = await createClient().auth.updateUser({ password });
    setSavingPw(false);
    if (error) return toast.error(s.passwordError, { description: error.message });
    setPassword("");
    toast.success(s.passwordUpdated);
  }

  const section = "rounded-[1.5rem] border border-border p-6 sm:p-8";
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">{s.title}</h2>
      <section className={section}>
        <h3 className="font-semibold">{s.communication}</h3>
        <p className="mt-1 text-sm text-muted">{s.communicationDesc}</p>
        <Checkbox className="mt-5" checked={optIn} disabled={pending} label={s.optIn}
          onChange={(e) => { const v = e.target.checked; setOptIn(v); start(async () => { const r = await updatePreferences(v); if (r.ok) toast.success(r.message); else toast.error(r.error); }); }} />
      </section>
      <section className={section}>
        <h3 className="font-semibold">{s.password}</h3>
        <form onSubmit={changePassword} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field className="flex-1" label={s.newPassword} htmlFor="new-password" hint={t.auth.passwordHint}><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" loading={savingPw} className="sm:mb-6">{s.updatePassword}</Button>
        </form>
      </section>
      <section className={section}>
        <h3 className="font-semibold">{s.appearance}</h3>
        <p className="mt-1 text-sm text-muted">{s.appearanceDesc}</p>
        <ThemeToggle withLabel className="mt-4 border border-border" />
      </section>
      <section className={section}>
        <h3 className="font-semibold">{s.language}</h3>
        <p className="mt-1 text-sm text-muted">{s.languageDesc}</p>
        <LanguageSwitcher className="mt-4 text-sm" />
      </section>
      <section className={section}>
        <h3 className="font-semibold">{s.session}</h3>
        <p className="mt-1 text-sm text-muted">{s.sessionDesc}</p>
        <Button variant="secondary" className="mt-4" onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}>{t.common.signOut}</Button>
      </section>
      <section className={section}>
        <h3 className="font-semibold">{s.yourData}</h3>
        <p className="mt-1 text-sm text-muted">{s.yourDataDesc}</p>
        {/* A plain link: the browser downloads the JSON file the route returns. */}
        <a href="/account/export" className="mt-4 inline-flex h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium hover:border-foreground">{s.download}</a>
      </section>
      <section className="rounded-[1.5rem] border border-sale/40 p-6 sm:p-8">
        <h3 className="font-semibold text-sale">{s.delete.title}</h3>
        <p className="mt-1 text-pretty text-sm text-muted">{s.delete.desc}</p>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            startDelete(async () => {
              // On success the action signs out and redirects, so only errors come back.
              const r = await deleteMyAccount(confirmEmail);
              if (r && !r.ok) toast.error(r.error);
            });
          }}
        >
          <Field className="flex-1" label={fmt(s.delete.confirmLabel, { email })} htmlFor="confirm-delete">
            <Input id="confirm-delete" type="email" autoComplete="off" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="danger" loading={deleting} disabled={confirmEmail.trim().toLowerCase() !== email.toLowerCase()} className="sm:mb-6">{s.delete.button}</Button>
        </form>
      </section>
    </div>
  );
}
