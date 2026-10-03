import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getCategories } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [categories, { t }] = await Promise.all([getCategories(), getI18n()]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">{t.common.skipToContent}</a>
      <div className="bg-foreground text-background">
        <p className="container-page py-2 text-center text-xs font-medium tracking-wide">
          {fmt(t.announcement.shipping, { amount: formatPrice(FREE_SHIPPING_THRESHOLD) })}
          <span className="hidden sm:inline"><span className="mx-2 opacity-40">·</span>{t.announcement.direct}</span>
          <span className="hidden lg:inline"><span className="mx-2 opacity-40">·</span>{fmt(t.announcement.code, { code: "KARIBU10" })}</span>
        </p>
      </div>
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer categories={categories} />
      <MobileTabBar />
      <SearchOverlay categories={categories} />
      <MobileMenu categories={categories} />
      <CartDrawer />
    </>
  );
}
