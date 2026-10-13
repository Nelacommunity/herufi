import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requirePermission("products.create");
  const supabase = await createClient();
  const [{ data }, probe] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("group_price").limit(1), // group deals need 0013_engagement.sql
  ]);
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <AdminPageHeader title="New product" />
      <ProductForm product={null} categories={data ?? []} groupDeal={probe.error ? undefined : { price: null, size: 2 }} />
    </>
  );
}
