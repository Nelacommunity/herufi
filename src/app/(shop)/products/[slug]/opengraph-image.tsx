import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";
import { getProductBySlug } from "@/lib/queries/catalog";
import { formatPrice } from "@/lib/utils";

export const alt = "Product on Herufi, delivered to Tanzania";
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const revalidate = 3600;

/** The preview card shown when someone shares a product link (WhatsApp, Facebook, X…). */
export default async function ProductOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return ogCard({ title: "Factory prices.", subtitle: "Delivered to Tanzania." });
  const onSale = product.compare_at_price != null && product.compare_at_price > product.price;
  return ogCard({
    eyebrow: product.brand,
    title: product.name,
    price: formatPrice(product.price),
    comparePrice: onSale ? formatPrice(product.compare_at_price) : undefined,
    discount: onSale ? product.discount_percent : undefined,
    photo: await ogPhoto(product.images[0]?.image_url),
  });
}
