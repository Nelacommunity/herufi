import { AdminPageHeader } from "@/components/admin/page-header";
import { CouponManager, type Coupon } from "@/components/admin/coupon-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Discounts" };

export default async function AdminDiscounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  return (
    <>
      <AdminPageHeader title="Discounts" description="Coupon codes for percentage or fixed discounts, with expiry dates and usage limits." />
      <CouponManager coupons={(data ?? []) as Coupon[]} />
    </>
  );
}
