import { SITE_URL } from "@/lib/env";
import { SITE } from "@/lib/constants";
import { getCategories, getSection, getShippingRates } from "@/lib/queries/catalog";
import { HELP_TOPICS } from "@/lib/help";
import { GUIDE_SLUG, homeFaq, shippingFacts } from "@/lib/seo-content";

export const revalidate = 3600;

/**
 * llms.txt (https://llmstxt.org): a plain-language fact sheet for AI assistants and answer
 * engines, generated from live data so prices and delivery times always match checkout.
 */
export async function GET() {
  const [categories, bestsellers, rates] = await Promise.all([
    getCategories().catch(() => []),
    getSection("bestsellers", 10).catch(() => []),
    getShippingRates(),
  ]);
  const f = shippingFacts(rates);
  const faq = homeFaq("en", f);
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} is an online store in Tanzania that sells products bought directly from verified factories in China and delivers them to customers anywhere in Tanzania. Prices are in Tanzanian shillings (TZS), import duty and customs clearance are handled by ${SITE.name}, sea freight shipping is ${f.seaFree ? (f.seaFreeOver ? `free on orders over TSh ${f.seaFreeOver.toLocaleString("en-US")}` : "free on every order") : "charged by volume"}, and customers can pay with M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa or Mastercard. The site is available in English and Kiswahili.`,
    "",
    "## Key facts",
    `- Company: ${SITE.name}, based in Dar es Salaam, Tanzania (collection point: Mikocheni B).`,
    `- Contact: ${SITE.email}, ${SITE.phone} (WhatsApp and phone, 8am–8pm EAT, English and Kiswahili).`,
    "- Sourcing: verified manufacturers in Guangzhou, Shenzhen, Yiwu and Foshan; every order is quality-inspected in Guangzhou before shipping.",
    `- Sea freight: ${f.seaDays} days, ${f.seaFree ? "free" : `${f.seaRate} per m³`} (usual rate ${f.seaRate} per m³).`,
    `- Air cargo: ${f.airDays} days, ${f.airRate} per kg of chargeable weight (minimum ${f.airMin}).`,
    `- Express air: ${f.expressDays} days, ${f.expressRate} per kg of chargeable weight (minimum ${f.expressMin}).`,
    "- Chargeable weight (air): the greater of actual weight and volumetric weight (L × W × H in cm ÷ 6,000), rounded up to 0.5 kg.",
    "- Taxes: import duty is included in product prices; 18% VAT is shown at checkout. Nothing is payable on delivery.",
    "- Delivery: door delivery in Dar es Salaam, Arusha, Mwanza and Dodoma; partner pickup points elsewhere in Tanzania.",
    "- Returns: 14 days after delivery for unused items; refunds to mobile money or card within 5 business days.",
    "- Languages: English (default) and Kiswahili (add ?lang=sw to any URL).",
    "",
    "## Guides",
    `- [How to buy from China and ship to Tanzania](${SITE_URL}/guides/${GUIDE_SLUG}): costs, delivery times, customs, payment and a comparison with agents and self-importing.`,
    `- [Mwongozo kwa Kiswahili](${SITE_URL}/guides/${GUIDE_SLUG}?lang=sw)`,
    "",
    "## Shop",
    `- [All products](${SITE_URL}/products)`,
    ...categories.map((c) => `- [${c.name}](${SITE_URL}/categories/${c.slug}): ${c.description ?? ""} (${c.product_count ?? 0} products)`),
    "",
    "## Best sellers",
    ...bestsellers.map((p) => `- [${p.name}](${SITE_URL}/products/${p.slug}) by ${p.brand}: TSh ${Math.round(p.price).toLocaleString("en-US")}`),
    "",
    "## Help",
    ...HELP_TOPICS.map((t) => `- [${t.en.title}](${SITE_URL}/help/${t.slug}): ${t.en.summary}`),
    "",
    "## Frequently asked questions",
    ...faq.flatMap((q) => [`### ${q.q}`, q.a, ""]),
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
