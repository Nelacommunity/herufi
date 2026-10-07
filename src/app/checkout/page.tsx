import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Address } from "@/lib/types";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const [user, { t }] = await Promise.all([getUser(), getI18n()]);
  let addresses: Address[] = [];
  if (user) {
    const supabase = await createClient();
    const a = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
    addresses = a.data ?? [];
  }
  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">{t.checkout.title}</h1>
      <CheckoutClient email={user?.email ?? null} addresses={addresses} signedIn={Boolean(user)} />
    </div>
  );
}
