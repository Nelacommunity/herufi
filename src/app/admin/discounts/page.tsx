import { AdminPageHeader } from "@/components/admin/page-header";
import { CouponManager, type Coupon, type CouponStats, type StaffOption } from "@/components/admin/coupon-manager";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { can, isSuperAdmin } from "@/lib/permissions";

export const metadata = { title: "Discounts" };

export default async function AdminDiscounts() {
  const { profile } = await requireAdmin();
  const manage = can(profile, "discounts.manage");
  const superAdmin = isSuperAdmin(profile);
  const supabase = await createClient();
  const [{ data: coupons }, { data: report }, staff] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.rpc("admin_coupon_report"),
    superAdmin
      ? supabase.from("profiles").select("user_id, full_name, email, role").in("role", ["admin", "super_admin"]).order("full_name")
      : Promise.resolve({ data: [] }),
  ]);
  const stats = new Map(((report ?? []) as CouponStats[]).map((r) => [r.id, r]));
  return (
    <>
      <AdminPageHeader title="Discounts"
        description={manage
          ? "Coupon codes, each assigned to a staff member so you can see the orders and revenue every code brings in."
          : "Your discount codes and the orders customers placed with them."} />
      <CouponManager
        coupons={((coupons ?? []) as Coupon[]).map((c) => ({ ...c, stats: stats.get(c.id) }))}
        canManage={manage}
        isSuper={superAdmin}
        me={{ user_id: profile.user_id, name: profile.full_name ?? profile.email ?? "Me" }}
        staff={(staff.data ?? []) as StaffOption[]}
      />
    </>
  );
}
