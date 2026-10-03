import type { Metadata } from "next";
import { WishlistPage } from "@/components/product/wishlist-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.wishlist.title, robots: { index: false } };
}

export default async function Page() {
  const { t } = await getI18n();
  return (
    <div className="container-page pt-8 sm:pt-12">
      <h1 className="mb-2 text-4xl font-semibold tracking-tight sm:text-5xl">{t.wishlist.title}</h1>
      <WishlistPage />
    </div>
  );
}
