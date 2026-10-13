import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AiImport } from "@/components/admin/ai-import";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";

export const metadata = { title: "AI import" };

export default async function AiImportPage() {
  await requirePermission("products.create");
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name").order("sort_order");
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <AdminPageHeader title="AI import"
        description="Upload screenshots from Pinduoduo (or another Chinese shop). AI reads the product, converts ¥ to TSh at today's rate × 3, and prepares a draft for you to check." />
      <AiImport categories={data ?? []} configured={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}
