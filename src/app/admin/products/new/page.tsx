import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <AdminPageHeader title="New product" />
      <ProductForm product={null} categories={data ?? []} />
    </>
  );
}
