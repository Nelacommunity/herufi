"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { GOOGLE_AUTH_ENABLED } from "@/lib/env";
import { safeNext } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function friendly(message: string, e: Dictionary["auth"]["errors"]) {
  if (/invalid login credentials/i.test(message)) return e.credentials;
  if (/email not confirmed/i.test(message)) return e.unconfirmed;
  if (/already registered/i.test(message)) return e.exists;
  if (/rate limit|too many/i.test(message)) return e.rate;
  if (/password should be|at least 8/i.test(message)) return e.short;
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/account");
  const { t } = useI18n();
  const a = t.auth;
  const [method, setMethod] = useState<"password" | "magic">("password");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [sent, setSent] = useState<string | null>(null);
  const supabase = createClient();
  const callback = (n: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(n)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error(a.errors.short);
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: callback(next) } });
        if (error) throw error;
        if (data.session) { router.push(next); router.refresh(); }
        else setSent(fmt(a.sentConfirm, { email }));
      } else if (method === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback(next), shouldCreateUser: true } });
        if (error) throw error;
        setSent(fmt(a.sentMagic, { email }));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(friendly((err as Error).message, a.errors));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback(next) } });
    if (error) setError(friendly(error.message, a.errors));
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent"><Mail className="h-7 w-7" /></div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{a.checkInbox}</h1>
        <p className="mt-3 text-muted">{sent}</p>
        <Button variant="ghost" className="mt-6" onClick={() => setSent(null)}>{a.useDifferent}</Button>
      </div>
    );
  }

  const isLogin = mode === "login";
  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">{isLogin ? a.welcomeBack : a.createTitle}</h1>
      <p className="mt-2 text-muted">{isLogin ? a.signInDesc : a.createDesc}</p>

      {GOOGLE_AUTH_ENABLED && (
        <>
          <Button variant="secondary" size="lg" className="mt-8 w-full" onClick={google}><GoogleIcon /> {a.google}</Button>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-subtle"><span className="h-px flex-1 bg-border" />{a.or}<span className="h-px flex-1 bg-border" /></div>
        </>
      )}

      {isLogin && (
        <div className={`${GOOGLE_AUTH_ENABLED ? "" : "mt-8"} mb-6 grid grid-cols-2 rounded-full bg-surface-2 p-1 text-sm font-medium`} role="tablist">
          {(["password", "magic"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={method === m} onClick={() => { setMethod(m); setError(null); }} className={`rounded-full py-2 transition-all ${method === m ? "bg-surface shadow-sm" : "text-muted"}`}>
              {m === "password" ? a.password : a.emailLink}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className={`space-y-4 ${!isLogin && !GOOGLE_AUTH_ENABLED ? "mt-8" : ""}`}>
        {!isLogin && (
          <Field label={a.fullName} htmlFor="name"><Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        )}
        <Field label={a.email} htmlFor="email"><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {(!isLogin || method === "password") && (
          <Field label={a.password} htmlFor="password" hint={!isLogin ? a.passwordHint : undefined}>
            <div className="relative">
              <Input id="password" type={show ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? undefined : 8} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-12" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={show ? a.hidePassword : a.showPassword}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        )}
        {isLogin && method === "password" && (
          <div className="text-right"><Link href="/forgot-password" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">{a.forgot}</Link></div>
        )}
        {error && <p className="rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {isLogin ? (method === "magic" ? a.emailMeLink : a.signIn) : a.createAccount}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {isLogin ? a.newHere : a.haveAccount}{" "}
        <Link href={`${isLogin ? "/signup" : "/login"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-foreground underline underline-offset-4">
          {isLogin ? a.createLink : a.signIn}
        </Link>
      </p>
      {!isLogin && <p className="mt-4 text-center text-xs text-subtle">{a.agree.split("{terms}")[0]}<Link href="/help/terms" className="underline">{a.terms}</Link>{a.agree.split("{terms}")[1]?.split("{privacy}")[0]}<Link href="/help/privacy" className="underline">{a.privacy}</Link>{a.agree.split("{privacy}")[1]}</p>}
    </div>
  );
}
