import { AdminPageHeader } from "@/components/admin/page-header";
import { ShippingRateForm } from "@/components/admin/shipping-rates-form";
import { createClient } from "@/lib/supabase/server";
import type { ShippingRate } from "@/lib/types";

export const metadata = { title: "Shipping" };

export default async function AdminShipping() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("shipping_rates").select("*").order("sort_order");
  const rates = ((data ?? []) as ShippingRate[]).map((r) => ({
    ...r,
    rate_per_kg: r.rate_per_kg == null ? null : Number(r.rate_per_kg),
    rate_per_cbm: r.rate_per_cbm == null ? null : Number(r.rate_per_cbm),
  }));
  return (
    <>
      <AdminPageHeader title="Shipping" description="Cargo rates from China to Tanzania. Air is charged on chargeable weight (actual or volumetric, whichever is higher); sea on packed volume. Each product's weight, size and allowed methods are set on the product." />
      {error ? (
        <p className="rounded-2xl bg-sale-soft p-6 text-sale">Shipping rates aren&apos;t set up yet. Apply supabase/migrations/0006_shipping.sql.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{rates.map((r) => <ShippingRateForm key={r.method} rate={r} />)}</div>
      )}
    </>
  );
}
