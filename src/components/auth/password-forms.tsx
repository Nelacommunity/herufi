"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const a = t.auth;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Always show the same confirmation so the form can't be used to discover accounts.
    if (error && /rate limit/i.test(error.message)) setError(a.errors.rate);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent"><MailCheck className="h-7 w-7" /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{a.checkEmail}</h1>
        <p className="mt-3 text-muted">{fmt(a.ifExists, { email })}</p>
        <Link href="/login" className="mt-8 inline-block text-sm font-medium underline underline-offset-4">{a.backToSignIn}</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">{a.forgotTitle}</h1>
      <p className="mt-2 text-muted">{a.forgotDesc}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label={a.email} htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {error && <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>{a.sendLink}</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">{a.remembered} <Link href="/login" className="font-medium text-foreground underline underline-offset-4">{a.signIn}</Link></p>
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const a = t.auth;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(a.errors.short);
    if (password !== confirm) return setError(a.errors.mismatch);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(/session/i.test(error.message) ? a.errors.expired : error.message);
    router.push("/account?password=updated");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">{a.resetTitle}</h1>
      <p className="mt-2 text-muted">{a.resetDesc}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label={a.newPassword} htmlFor="password"><Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label={a.confirmPassword} htmlFor="confirm"><Input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {error && <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>{a.updatePassword}</Button>
      </form>
    </div>
  );
}
