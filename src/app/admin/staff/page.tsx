import { AdminPageHeader } from "@/components/admin/page-header";
import { StaffManager, type StaffMember } from "@/components/admin/staff-manager";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";

export const metadata = { title: "Staff" };

export default async function AdminStaff() {
  const { profile } = await requireSuperAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id, full_name, email, role, status, permissions, created_at")
    .in("role", ["admin", "super_admin"]).order("role", { ascending: false }).order("created_at");
  return (
    <>
      <AdminPageHeader title="Staff" description="Give people access to the admin. Super admins can do everything, including managing staff; admins can only do what you allow." />
      <StaffManager staff={(data ?? []) as StaffMember[]} me={profile.user_id} />
    </>
  );
}
