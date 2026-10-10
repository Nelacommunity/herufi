import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { QuestionAnswerList } from "@/components/admin/question-answer-list";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PRODUCT_SELECT, toProduct, withVariantImages } from "@/lib/queries/shared";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { profile } = await requirePermission("products.edit", "products.delete", "questions.answer");
  const supabase = await createClient();
  const [{ data }, { data: categories }, { data: questions }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("product_questions").select("id, author_name, question, answer, answered_at, created_at").eq("product_id", id).order("created_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const product = await withVariantImages(supabase, toProduct(data));
  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Products</Link>
      <AdminPageHeader title={product.name} description={`${product.sales_count.toLocaleString()} sold · ${product.review_count} reviews · ${product.rating.toFixed(1)}★`} />
      <ProductForm product={product} categories={categories ?? []} canEdit={can(profile, "products.edit")} canDelete={can(profile, "products.delete")} />
      {questions && questions.length > 0 && can(profile, "questions.answer") && <QuestionAnswerList questions={questions} />}
    </>
  );
}
