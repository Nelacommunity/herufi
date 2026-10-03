import { PaymentManager } from "@/components/account/payment-manager";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.payments.title };
}

export default async function PaymentMethodsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_methods").select("*").order("is_default", { ascending: false }).order("created_at");
  return <PaymentManager methods={data ?? []} />;
}
