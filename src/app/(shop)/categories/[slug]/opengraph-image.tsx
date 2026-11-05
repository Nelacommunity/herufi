import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";
import { getCategoryBySlug } from "@/lib/queries/catalog";

export const alt = "Category on Herufi, delivered to Tanzania";
export const size = OG_SIZE;
export const contentType = "image/jpeg";
export const revalidate = 3600;

export default async function CategoryOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug).catch(() => null);
  if (!cat) return ogCard({ title: "Factory prices.", subtitle: "Delivered to Tanzania." });
  const count = cat.product_count ?? 0;
  return ogCard({
    eyebrow: count > 0 ? `${count} products` : "Shop",
    title: cat.name,
    subtitle: "Factory prices, delivered to Tanzania.",
    photo: await ogPhoto(cat.image_url),
  });
}
