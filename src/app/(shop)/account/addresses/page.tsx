import { AddressManager } from "@/components/account/address-manager";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.addresses.title };
}

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return <AddressManager addresses={data ?? []} />;
}
