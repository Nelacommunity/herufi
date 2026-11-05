import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";

export const alt = "How to buy from China and ship to Tanzania: costs, delivery times and customs";
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function GuideOgImage() {
  const photo = await ogPhoto("https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80");
  return ogCard({ eyebrow: "2026 Guide", title: "How to buy from China and ship to Tanzania", subtitle: "Shipping cost, delivery time & customs", photo, chips: ["Sea & air freight", "Customs explained"] });
}
