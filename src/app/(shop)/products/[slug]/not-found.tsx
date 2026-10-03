import Link from "next/link";
import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";

export default async function ProductNotFound() {
  const { t } = await getI18n();
  return (
    <EmptyState
      className="py-24"
      icon={<PackageX />}
      title={t.product.unavailableTitle}
      description={t.product.unavailableDesc}
      action={<><Link href="/products?sort=newest" className={buttonVariants({ size: "lg" })}>{t.product.shopNew}</Link><Link href="/" className={buttonVariants({ size: "lg", variant: "secondary" })}>{t.common.backToHome}</Link></>}
    />
  );
}
