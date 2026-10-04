import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getCategories, getFreeShippingPromo } from "@/lib/queries/catalog";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { formatPrice } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { jsonLd } from "@/lib/seo";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [categories, promo, { t }] = await Promise.all([getCategories(), getFreeShippingPromo(), getI18n()]);
  const headline = !promo ? t.announcement.direct : promo.freeOver > 0 ? fmt(t.announcement.freeSeaOver, { amount: formatPrice(promo.freeOver) }) : t.announcement.freeSea;
  // The business as an entity: helps search and AI engines identify, describe and cite Herufi consistently.
  const organization = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    alternateName: "Herufi Tanzania",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png`, width: 512, height: 512 },
    image: `${SITE_URL}/opengraph-image`,
    description: SITE.description,
    slogan: "Factory prices. Delivered to Tanzania.",
    email: SITE.email,
    telephone: SITE.phone,
    address: { "@type": "PostalAddress", streetAddress: "Mikocheni B", addressLocality: "Dar es Salaam", addressRegion: "Dar es Salaam", addressCountry: "TZ" },
    areaServed: { "@type": "Country", name: "Tanzania" },
    knowsLanguage: ["en", "sw"],
    currenciesAccepted: "TZS",
    paymentAccepted: "M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa, Mastercard",
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer service", telephone: SITE.phone, email: SITE.email, areaServed: "TZ", availableLanguage: ["English", "Swahili"] }],
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "TZ",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnInStore",
      returnFees: "https://schema.org/FreeReturn",
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-background">{t.common.skipToContent}</a>
      <div className="bg-foreground text-background">
        <p className="container-page py-2 text-center text-xs font-medium tracking-wide">
          <span className="font-semibold">{headline}</span>
          {promo && <span className="hidden sm:inline"><span className="mx-2 opacity-40">·</span>{t.announcement.direct}</span>}
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
