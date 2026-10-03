import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductRail } from "@/components/product/product-grid";
import { getSection } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.cart.yourBag, robots: { index: false } };
}

export default async function Page() {
  const [recommended, { t }] = await Promise.all([getSection("bestsellers", 8), getI18n()]);
  return (
    <div className="container-page pt-8 sm:pt-12">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight sm:text-5xl">{t.cart.yourBag}</h1>
      <CartPage />
      <section className="mt-24">
        <SectionHeading eyebrow={t.cart.alsoLikeEyebrow} title={t.cart.alsoLikeTitle} href="/products?sort=popular" linkLabel={t.common.viewAll} />
        <ProductRail products={recommended} />
      </section>
    </div>
  );
}
