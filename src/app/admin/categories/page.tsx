import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoryManager } from "@/components/admin/category-manager";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/permissions";

export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  const { profile } = await requirePermission("categories.manage");
  const supabase = await createClient();
  const [{ data }, { data: counts }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.rpc("category_counts"),
  ]);
  const map = new Map(((counts ?? []) as { category_id: string; product_count: number }[]).map((c) => [c.category_id, Number(c.product_count)]));
  return (
    <>
      <AdminPageHeader title="Categories" description="Order here sets the order in navigation and on the homepage." />
      <CategoryManager canBulk={isSuperAdmin(profile)} categories={(data ?? []).map((c) => ({ ...c, product_count: map.get(c.id) ?? 0 }))} />
    </>
  );
}
