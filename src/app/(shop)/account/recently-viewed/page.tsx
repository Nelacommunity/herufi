import Link from "next/link";
import { Clock } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ClearViewedButton } from "@/components/account/clear-viewed-button";
import { createClient } from "@/lib/supabase/server";
import { fetchProductsByIds } from "@/lib/queries/shared";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.account.viewed.title };
}

export default async function RecentlyViewedPage() {
  const [supabase, { t }] = await Promise.all([createClient(), getI18n()]);
  const v = t.account.viewed;
  const { data } = await supabase.from("product_views").select("product_id").order("viewed_at", { ascending: false }).limit(24);
  const products = await fetchProductsByIds(supabase, (data ?? []).map((row) => row.product_id as string));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">{v.title}</h2>
        {products.length > 0 && <ClearViewedButton label={v.clear} />}
      </div>
      {products.length ? (
        <ProductGrid products={products} columns={3} className="mt-6" />
      ) : (
        <EmptyState icon={<Clock />} title={v.empty} description={v.emptyDesc} action={<Link href="/products" className={buttonVariants({ size: "lg" })}>{t.common.browseProducts}</Link>} />
      )}
    </div>
  );
}
