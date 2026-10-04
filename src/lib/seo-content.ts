/**
 * Search (SEO), answer-engine (AEO) and generative-engine (GEO) copy, in English and Kiswahili.
 * Facts that can change (shipping prices, delivery times) are filled in from the live
 * shipping_rates table, so the copy never contradicts checkout.
 */
import type { Locale } from "@/i18n/config";
import type { ShippingRate } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type QA = { q: string; a: string };

export type ShippingFacts = {
  seaDays: string; airDays: string; expressDays: string;
  seaFree: boolean; seaFreeOver: number | null; seaRate: string;
  airRate: string; airMin: string; expressRate: string; expressMin: string;
};

/** Pull the numbers the copy needs from the live rates, with sensible fallbacks. */
export function shippingFacts(rates: ShippingRate[]): ShippingFacts {
  const by = (m: string) => rates.find((r) => r.method === m);
  const sea = by("sea"), air = by("standard"), exp = by("express");
  const days = (r: ShippingRate | undefined, fallback: string) => (r ? `${r.eta_min_days}–${r.eta_max_days}` : fallback);
  return {
    seaDays: days(sea, "35–45"), airDays: days(air, "10–14"), expressDays: days(exp, "5–7"),
    seaFree: sea?.free_over != null, seaFreeOver: sea?.free_over ?? null,
    seaRate: formatPrice(sea?.rate_per_cbm ?? 1_000_000),
    airRate: formatPrice(air?.rate_per_kg ?? 28_000), airMin: formatPrice(air?.min_charge ?? 14_000),
    expressRate: formatPrice(exp?.rate_per_kg ?? 55_000), expressMin: formatPrice(exp?.min_charge ?? 55_000),
  };
}

const seaFreeText = (f: ShippingFacts, locale: Locale) => {
  if (!f.seaFree) return locale === "sw" ? `${f.seaRate} kwa m³` : `${f.seaRate} per m³`;
  if (f.seaFreeOver && f.seaFreeOver > 0) return locale === "sw" ? `bure kwa oda zaidi ya ${formatPrice(f.seaFreeOver)}` : `free on orders over ${formatPrice(f.seaFreeOver)}`;
  return locale === "sw" ? "bure kwa kila oda" : "free on every order";
};

// ---------------------------------------------------------------------------------
// Page titles & descriptions
// ---------------------------------------------------------------------------------
export const SEO_COPY = {
  en: {
    homeTitle: "Herufi | Buy from China, Delivered to Tanzania · Free Sea Shipping",
    homeDescription: "Shop factory-direct from verified suppliers in China and get it delivered to your door in Dar es Salaam, Arusha, Mwanza and across Tanzania. Free sea shipping, customs cleared for you, prices in TZS, pay with M-Pesa or card.",
    productsTitle: "Shop Electronics, Fashion & Home from China | Prices in TZS",
    productsDescription: "Browse 50+ factory-direct products from China with prices in Tanzanian shillings. Free sea shipping to Tanzania, customs handled, pay with M-Pesa, Tigo Pesa, Airtel Money or card.",
    categoryTitle: (name: string) => `${name} from China, Delivered to Tanzania`,
    categoryDescription: (name: string, n: number) => `Buy ${name.toLowerCase()} direct from Chinese factories at factory prices. ${n} products, free sea shipping to Tanzania, customs handled and M-Pesa accepted.`,
    productTitle: (name: string) => `${name}: Price in Tanzania`,
    productDescription: (name: string, brand: string, price: string, lead: string) =>
      `Buy ${name} by ${brand} for ${price} in Tanzania. ${lead} Shipped from China with free sea shipping, customs handled, pay with M-Pesa or card.`,
    keywords: ["buy from China Tanzania", "shipping from China to Tanzania", "online shopping Tanzania", "import from China Tanzania", "cargo from China to Dar es Salaam", "M-Pesa online shopping", "free shipping Tanzania", "Herufi"],
  },
  sw: {
    homeTitle: "Herufi | Nunua kutoka China, Tunafikisha Tanzania · Usafirishaji wa Meli Bure",
    homeDescription: "Nunua moja kwa moja kutoka viwanda vilivyothibitishwa China na tukuletee mlangoni Dar es Salaam, Arusha, Mwanza na Tanzania nzima. Usafirishaji wa meli bure, ushuru tunashughulikia, bei kwa shilingi, lipa kwa M-Pesa au kadi.",
    productsTitle: "Nunua Elektroniki, Mitindo na Vya Nyumbani kutoka China | Bei kwa TSh",
    productsDescription: "Tazama bidhaa 50+ kutoka viwandani China kwa bei za shilingi za Tanzania. Usafirishaji wa meli bure hadi Tanzania, ushuru tunashughulikia, lipa kwa M-Pesa, Tigo Pesa, Airtel Money au kadi.",
    categoryTitle: (name: string) => `${name} kutoka China, Tunafikisha Tanzania`,
    categoryDescription: (name: string, n: number) => `Nunua ${name.toLowerCase()} moja kwa moja kutoka viwanda vya China kwa bei ya kiwandani. Bidhaa ${n}, usafirishaji wa meli bure hadi Tanzania, ushuru tunashughulikia na M-Pesa inakubalika.`,
    productTitle: (name: string) => `${name}: Bei Tanzania`,
    productDescription: (name: string, brand: string, price: string, lead: string) =>
      `Nunua ${name} ya ${brand} kwa ${price} Tanzania. ${lead} Inasafirishwa kutoka China kwa meli bure, ushuru tunashughulikia, lipa kwa M-Pesa au kadi.`,
    keywords: ["nunua kutoka China", "usafirishaji kutoka China hadi Tanzania", "manunuzi mtandaoni Tanzania", "kuagiza mzigo China", "cargo China Dar es Salaam", "lipa kwa M-Pesa", "usafirishaji bure Tanzania", "Herufi"],
  },
} as const;

// ---------------------------------------------------------------------------------
// FAQ (answer-first, for answer engines and the FAQPage schema)
// ---------------------------------------------------------------------------------
export function homeFaq(locale: Locale, f: ShippingFacts): QA[] {
  if (locale === "sw") {
    return [
      { q: "Nanunuaje bidhaa kutoka China na kuletewa Tanzania?", a: `Agiza kwenye Herufi na ulipe kwa shilingi; sisi tunanunua kiwandani China, tunakagua ubora, tunasafirisha, tunatoa mzigo forodhani na kukuletea mlangoni. Huhitaji wakala, kutuma pesa nje ya nchi wala kwenda bandarini.` },
      { q: "Usafirishaji kutoka China hadi Tanzania unagharimu kiasi gani?", a: `Usafirishaji wa meli ni ${seaFreeText(f, "sw")}. Ndege (cargo) ni ${f.airRate} kwa kilo (kiwango cha chini ${f.airMin}) na ndege ya haraka ni ${f.expressRate} kwa kilo (kiwango cha chini ${f.expressMin}). Bei kamili inaonyeshwa kwenye ukurasa wa bidhaa na wakati wa malipo.` },
      { q: "Mzigo kutoka China unachukua muda gani kufika Tanzania?", a: `Kwa meli ni siku ${f.seaDays}, kwa ndege (cargo) siku ${f.airDays} na kwa ndege ya haraka siku ${f.expressDays}, ikijumuisha kutoa mzigo forodhani.` },
      { q: "Je, nitalipa ushuru au VAT mzigo ukifika?", a: "Hapana. Ushuru wa forodha umejumuishwa kwenye bei, na VAT ya 18% inaonyeshwa wakati wa malipo. Hulipi chochote cha ziada mzigo ukifika." },
      { q: "Naweza kulipa kwa M-Pesa?", a: "Ndiyo. Tunapokea M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa na Mastercard, na bei zote ziko kwa shilingi za Tanzania (TZS)." },
      { q: "Mnafikisha wapi Tanzania?", a: "Tunafikisha mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma. Miji mingine inahudumiwa kupitia vituo vya washirika ambapo msafirishaji atakupigia kupanga uchukuaji." },
      { q: "Nina uhakika gani kuhusu ubora wa bidhaa?", a: "Tunanunua kutoka kwa watengenezaji tuliowathibitisha Guangzhou, Shenzhen, Yiwu na Foshan, tunakagua kila oda kabla ya kusafirisha, na unaweza kurudisha bidhaa ndani ya siku 14 tangu kufika." },
    ];
  }
  return [
    { q: "How do I buy from China and get it delivered to Tanzania?", a: "Order on Herufi and pay in Tanzanian shillings; we buy from the factory in China, inspect it, ship it, clear customs and deliver it to your door. You don't need an agent, a foreign bank transfer or a trip to the port." },
    { q: "How much does shipping from China to Tanzania cost?", a: `Sea freight is ${seaFreeText(f, "en")}. Air cargo costs ${f.airRate} per kg (minimum ${f.airMin}) and express air ${f.expressRate} per kg (minimum ${f.expressMin}). The exact price for your items is shown on every product page and at checkout.` },
    { q: "How long does shipping from China to Tanzania take?", a: `Sea freight takes ${f.seaDays} days, air cargo ${f.airDays} days and express air ${f.expressDays} days, including customs clearance.` },
    { q: "Do I pay customs duty or VAT on delivery?", a: "No. Import duty is included in our prices and 18% VAT is shown at checkout, so there is nothing extra to pay when your order arrives." },
    { q: "Can I pay with M-Pesa?", a: "Yes. We accept M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa and Mastercard, and every price is in Tanzanian shillings (TZS)." },
    { q: "Where in Tanzania do you deliver?", a: "We deliver to your door in Dar es Salaam, Arusha, Mwanza and Dodoma. Other towns are served through partner pickup points, and the courier calls you to arrange collection." },
    { q: "How do I know the products are good quality?", a: "We buy from manufacturers we have verified in Guangzhou, Shenzhen, Yiwu and Foshan, inspect every order before it ships, and you can return items within 14 days of delivery." },
  ];
}

// ---------------------------------------------------------------------------------
// Guide: "How to buy from China and ship to Tanzania"
// ---------------------------------------------------------------------------------
export const GUIDE_SLUG = "buy-from-china-to-tanzania";
export const GUIDE_UPDATED = "2026-10-04";

export function guideContent(locale: Locale, f: ShippingFacts) {
  if (locale === "sw") {
    return {
      title: "Jinsi ya Kununua kutoka China na Kusafirisha hadi Tanzania (Mwongozo 2026)",
      metaTitle: "Jinsi ya Kununua kutoka China hadi Tanzania: Gharama, Muda na Ushuru",
      description: "Mwongozo kamili wa kuagiza bidhaa kutoka China hadi Tanzania: gharama za usafirishaji kwa meli na ndege, muda wa kufika, ushuru na VAT, njia za malipo na jinsi ya kuepuka matatizo.",
      eyebrow: "Mwongozo",
      summaryTitle: "Jibu fupi",
      summary: `Njia rahisi zaidi ni kuagiza kupitia duka linaloshughulikia kila kitu kwa ajili yako. Kwenye Herufi unalipa kwa shilingi (M-Pesa au kadi), nasi tunanunua kiwandani, tunakagua ubora, tunasafirisha, tunatoa mzigo forodhani na kukuletea. Meli huchukua siku ${f.seaDays} na ni ${seaFreeText(f, "sw")}; ndege huchukua siku ${f.airDays} kwa ${f.airRate} kwa kilo.`,
      stepsTitle: "Hatua 6 za kuagiza kutoka China",
      steps: [
        ["Chagua bidhaa", "Tafuta bidhaa na uone bei kwa shilingi, ikiwa tayari na ushuru wa forodha."],
        ["Linganisha njia za usafirishaji", "Ukurasa wa bidhaa unaonyesha bei na muda kwa meli, ndege (cargo) na ndege ya haraka kwa idadi unayochagua."],
        ["Lipa kwa shilingi", "Lipa kwa M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa au Mastercard. Hakuna kubadilisha fedha wala kutuma pesa nje."],
        ["Tunanunua na kukagua", "Tunanunua kutoka kiwandani na kukagua bidhaa kwenye ghala letu la Guangzhou kabla ya kusafirisha."],
        ["Usafirishaji na forodha", "Mzigo unasafirishwa hadi Dar es Salaam na timu yetu inautoa forodhani. Unapata taarifa kwa SMS kila hatua."],
        ["Unaletewa mlangoni", "Msafirishaji wa ndani anakuletea, au anakupigia kupanga uchukuaji ukiwa nje ya miji tunayofikisha mlangoni."],
      ],
      costTitle: "Gharama za usafirishaji kutoka China hadi Tanzania",
      costIntro: "Bei hizi zinatoka moja kwa moja kwenye mfumo wetu wa malipo na zinajumuisha kutoa mzigo forodhani.",
      costHeaders: ["Njia", "Muda", "Bei"],
      costRows: [
        ["Meli", `Siku ${f.seaDays}`, f.seaFree ? `Bure (${seaFreeText(f, "sw")})` : seaFreeText(f, "sw")],
        ["Ndege (cargo)", `Siku ${f.airDays}`, `${f.airRate}/kg, chini kabisa ${f.airMin}`],
        ["Ndege ya haraka", `Siku ${f.expressDays}`, `${f.expressRate}/kg, chini kabisa ${f.expressMin}`],
      ],
      examplesTitle: "Mifano halisi",
      chargeableTitle: "Uzito unaotozwa ni nini?",
      chargeable: "Kwa ndege, tunatoza uzito halisi au uzito wa ujazo (urefu × upana × kimo kwa sentimita ÷ 6,000), upi mkubwa zaidi, ukizungushwa juu hadi kg 0.5. Kwa meli tunatumia ujazo wa mzigo kwa mita za ujazo (m³). Ndiyo maana samani kubwa husafirishwa kwa meli tu.",
      customsTitle: "Ushuru wa forodha na VAT",
      customs: "Ukiagiza mwenyewe, unalipa ushuru wa forodha na VAT bandarini, pamoja na gharama za wakala wa forodha. Kwenye Herufi, ushuru umejumuishwa kwenye bei ya bidhaa na VAT ya 18% inaonyeshwa wazi wakati wa malipo, hivyo unajua gharama yote kabla ya kulipa.",
      compareTitle: "Herufi ukilinganisha na njia nyingine",
      compareHeaders: ["", "Herufi", "Wakala", "Kuagiza mwenyewe"],
      compareRows: [
        ["Malipo", "Shilingi, M-Pesa au kadi", "Mara nyingi USD", "Uhamisho wa benki wa kimataifa"],
        ["Ushuru na forodha", "Umejumuishwa", "Hutofautiana", "Unashughulikia mwenyewe"],
        ["Ukaguzi wa ubora", "Kila oda", "Wakati mwingine", "Hakuna"],
        ["Kurudisha bidhaa", "Siku 14 Tanzania", "Mara chache", "Ni vigumu"],
        ["Bei inajulikana mapema", "Ndiyo, wakati wa malipo", "Si mara zote", "Hapana"],
      ],
      faqTitle: "Maswali ya mara kwa mara",
      ctaTitle: "Tayari kuagiza?",
      ctaBody: "Tazama bidhaa kwa bei za shilingi na uone gharama ya usafirishaji kabla ya kulipa.",
      cta: "Anza kununua",
      updated: "Imesasishwa",
    };
  }
  return {
    title: "How to Buy from China and Ship to Tanzania (2026 Guide)",
    metaTitle: "How to Buy from China to Tanzania: Shipping Cost, Time & Customs",
    description: "A complete guide to importing from China to Tanzania: sea and air shipping costs, delivery times, customs duty and VAT, payment options and how to avoid common problems.",
    eyebrow: "Guide",
    summaryTitle: "The short answer",
    summary: `The easiest way is to order through a store that handles everything for you. On Herufi you pay in shillings (M-Pesa or card), and we buy from the factory, inspect it, ship it, clear customs and deliver it. Sea freight takes ${f.seaDays} days and is ${seaFreeText(f, "en")}; air cargo takes ${f.airDays} days at ${f.airRate} per kg.`,
    stepsTitle: "6 steps to buying from China",
    steps: [
      ["Choose your products", "Find what you want and see the price in shillings, with import duty already included."],
      ["Compare shipping options", "Every product page prices sea freight, air cargo and express air for the quantity you choose."],
      ["Pay in shillings", "Pay with M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa or Mastercard. No currency exchange or foreign transfer."],
      ["We buy and inspect", "We buy from the factory and quality-check your items at our Guangzhou warehouse before they ship."],
      ["Shipping and customs", "Your order travels to Dar es Salaam and our team clears customs. You get an SMS at every stage."],
      ["Delivered to your door", "A local courier delivers it, or calls to arrange collection if you're outside our door-delivery cities."],
    ],
    costTitle: "Shipping costs from China to Tanzania",
    costIntro: "These prices come straight from our checkout and include customs clearance.",
    costHeaders: ["Method", "Delivery time", "Price"],
    costRows: [
      ["Sea freight", `${f.seaDays} days`, f.seaFree ? `Free (${seaFreeText(f, "en")})` : seaFreeText(f, "en")],
      ["Air cargo", `${f.airDays} days`, `${f.airRate}/kg, minimum ${f.airMin}`],
      ["Express air", `${f.expressDays} days`, `${f.expressRate}/kg, minimum ${f.expressMin}`],
    ],
    examplesTitle: "Real examples",
    chargeableTitle: "What is chargeable weight?",
    chargeable: "For air shipping we charge the actual weight or the volumetric weight (length × width × height in cm ÷ 6,000), whichever is higher, rounded up to the next 0.5 kg. For sea freight we use the packed volume in cubic metres (m³). That's why large furniture ships by sea only.",
    customsTitle: "Customs duty and VAT",
    customs: "If you import on your own, you pay customs duty and VAT at the port, plus clearing-agent fees. On Herufi, import duty is included in the product price and 18% VAT is shown clearly at checkout, so you know the full cost before you pay.",
    compareTitle: "Herufi compared with the alternatives",
    compareHeaders: ["", "Herufi", "Shipping agent", "Import yourself"],
    compareRows: [
      ["Payment", "Shillings, M-Pesa or card", "Often USD", "International bank transfer"],
      ["Duty & customs", "Included", "Varies", "You handle it"],
      ["Quality inspection", "Every order", "Sometimes", "None"],
      ["Returns", "14 days in Tanzania", "Rarely", "Difficult"],
      ["Price known upfront", "Yes, at checkout", "Not always", "No"],
    ],
    faqTitle: "Frequently asked questions",
    ctaTitle: "Ready to order?",
    ctaBody: "Browse products priced in shillings and see the shipping cost before you pay.",
    cta: "Start shopping",
    updated: "Updated",
  };
}
