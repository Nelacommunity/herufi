"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchProductsByIds } from "@/lib/queries/shared";
import { useStore } from "@/providers/store-provider";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductRail } from "@/components/product/product-grid";
import type { ProductSummary } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/**
 * Personalised picks for signed-in shoppers (from orders, wishlist and views via
 * the recommended_product_ids RPC). Guests see the server-rendered general picks.
 */
export function Recommended({ fallback }: { fallback: ProductSummary[] }) {
  const { user } = useStore();
  const { t } = useI18n();
  const [picks, setPicks] = useState<{ userId: string; items: ProductSummary[] } | null>(null);
  const personal = Boolean(user && picks?.userId === user.id);
  const items = personal ? picks!.items : fallback;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("recommended_product_ids", { max_results: 8 });
      if (error || !data?.length || cancelled) return;
      const products = await fetchProductsByIds(supabase, (data as { id: string }[]).map((r) => r.id)).catch(() => []);
      if (!cancelled && products.length >= 4) setPicks({ userId: user.id, items: products });
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow={personal ? t.home.pickedForYou : t.home.favourites}
        title={personal && user?.name ? fmt(t.home.recommendedTitleName, { name: user.name.split(" ")[0] }) : t.home.recommendedTitle}
        description={personal ? t.home.recommendedPersonal : t.home.recommendedGeneral}
        linkLabel={t.common.viewAll}
        href="/products?sort=rating"
      />
      <ProductRail products={items} />
    </section>
  );
}
