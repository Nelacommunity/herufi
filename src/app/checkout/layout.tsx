import Link from "next/link";
import { Lock } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { getI18n } from "@/i18n/server";

export default async function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  const { t } = await getI18n();
  return (
    <>
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
          <Logo />
          <p className="hidden items-center gap-2 text-sm text-muted sm:flex"><Lock className="h-4 w-4" /> {t.checkout.secure}</p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher compact />
            <Link href="/cart" className="hidden text-sm font-medium underline-offset-4 hover:underline sm:block">{t.checkout.backToBag}</Link>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <div className="container-page flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/help/returns" className="hover:text-foreground">{t.footer.returns}</Link>
          <Link href="/help/shipping" className="hover:text-foreground">{t.footer.shipping}</Link>
          <Link href="/help/privacy" className="hover:text-foreground">{t.footer.privacy}</Link>
          <Link href="/help/contact" className="hover:text-foreground">{t.footer.contact}</Link>
        </div>
      </footer>
      <CartDrawer />
    </>
  );
}
