import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.auth.forgotTitle, robots: { index: false } };
}

export default function Page() {
  return <ForgotPasswordForm />;
}
