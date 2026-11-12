import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import type { Address } from "@/lib/types";
import { safeNext } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.onboarding.title, robots: { index: false } };
}

/** Shown once after sign-up or first sign-in: phone number and where the customer lives. */
export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const [{ next }, user] = await Promise.all([searchParams, getUser()]);
  const requested = safeNext(typeof next === "string" ? next : null, "/");
  const nextPath = requested.startsWith("/welcome") ? "/" : requested;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/welcome?next=${nextPath}`)}`);

  // Existing customers see what we already have, so confirming takes one click.
  const supabase = await createClient();
  const [{ data: profile }, { data: address }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at").limit(1).maybeSingle(),
  ]);
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;

  return (
    <WelcomeForm
      next={nextPath}
      email={user.email ?? ""}
      defaults={{
        full_name: profile?.full_name || address?.full_name || meta?.full_name || meta?.name || "",
        phone: profile?.phone || address?.phone || "",
        address: (address as Address | null) ?? null,
      }}
    />
  );
}
