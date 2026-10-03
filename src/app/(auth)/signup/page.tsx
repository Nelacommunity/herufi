import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.createAccount, robots: { index: false } };
}

export default function SignupPage() {
  return <Suspense><AuthForm mode="signup" /></Suspense>;
}
