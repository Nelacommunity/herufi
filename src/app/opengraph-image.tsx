import { OG_SIZE, ogCard, ogPhoto } from "@/lib/og";
import { SITE } from "@/lib/constants";

export const alt = `${SITE.name}: buy from China, delivered to Tanzania. Free sea shipping, pay with M-Pesa.`;
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function OpengraphImage() {
  const photo = await ogPhoto("https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1200&q=80");
  return ogCard({ title: "Factory prices.", subtitle: "Delivered to Tanzania.", photo, chips: ["Free sea shipping", "Pay with M-Pesa"] });
}
