import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.resetTitle, robots: { index: false } };
}

export default async function Page() {
  await requireUser("/reset-password");
  return <ResetPasswordForm />;
}
