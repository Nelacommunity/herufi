/**
 * Keyword strategy and category landing copy (SEO / AEO / GEO), in English and Kiswahili.
 *
 * How the keywords are chosen:
 * - Head terms: what Tanzanians type when they want to shop online or import from China
 *   ("online shopping Tanzania", "shipping from China to Tanzania", "kuagiza mzigo kutoka China").
 * - Category terms: product type + place + intent ("electronics online Tanzania",
 *   "viatu bei nafuu Dar es Salaam").
 * - Long-tail questions: written as FAQ answers so Google, ChatGPT, Perplexity, Gemini and
 *   Copilot can quote them directly (answer-first, one fact per sentence, numbers from live data).
 *
 * Google ignores <meta name="keywords">; these lists matter because the same phrases are used in
 * titles, H1s, descriptions, visible intro copy and FAQ questions, which is what ranks and gets cited.
 */
import type { Locale } from "@/i18n/config";
import type { ShippingFacts } from "@/lib/seo-content";

type QA = { q: string; a: string };

/** Site-wide head terms, most important first. */
export const CORE_KEYWORDS: Record<Locale, string[]> = {
  en: [
    "online shopping Tanzania",
    "buy from China Tanzania",
    "shipping from China to Tanzania",
    "cargo from China to Tanzania",
    "China to Tanzania shipping cost",
    "import from China to Tanzania",
    "sea freight China to Dar es Salaam",
    "air cargo China to Tanzania",
    "online store Dar es Salaam",
    "home delivery Dar es Salaam",
    "pay with M-Pesa online",
    "factory prices Tanzania",
    "Herufi",
  ],
  sw: [
    "duka la mtandaoni Tanzania",
    "manunuzi mtandaoni Tanzania",
    "kuagiza mzigo kutoka China",
    "kununua bidhaa kutoka China",
    "usafirishaji wa mizigo kutoka China hadi Tanzania",
    "bei ya cargo China hadi Tanzania",
    "mzigo kwa meli kutoka China",
    "cargo ya ndege China Dar es Salaam",
    "bidhaa bei ya kiwandani",
    "kuletewa mlangoni Dar es Salaam",
    "lipa kwa M-Pesa",
    "Herufi",
  ],
};

type CategoryCopy = {
  /** Page title (the layout appends " · Herufi"). Keep under ~52 characters. */
  title: string;
  /** Meta description, ~140–160 characters. */
  description: string;
  keywords: string[];
  /** Visible intro shown under the catalog: the paragraph answer engines quote. */
  intro: string;
  faq: (f: ShippingFacts) => QA[];
};

type CategoryEntry = Record<Locale, CategoryCopy>;

const CATEGORIES: Record<string, CategoryEntry> = {
  electronics: {
    en: {
      title: "Electronics Online in Tanzania: Earbuds, Smartwatches & Tech",
      description: "Buy electronics online in Tanzania at factory prices: wireless earbuds, headphones, smartwatches and phone accessories from Shenzhen. Pay with M-Pesa.",
      keywords: ["electronics online Tanzania", "electronics shop Dar es Salaam", "wireless earbuds price in Tanzania", "smartwatch price in Tanzania", "headphones Tanzania", "bluetooth speaker Tanzania", "phone accessories Tanzania", "electronics from China"],
      intro: "Herufi sells consumer electronics bought directly from manufacturers in Shenzhen, China's electronics capital, and delivers them across Tanzania. Every price is in Tanzanian shillings with import duty included, small gadgets ship quickly by air cargo, and you can pay with M-Pesa, Tigo Pesa, Airtel Money or card.",
      faq: (f) => [
        { q: "Where can I buy electronics online in Tanzania?", a: "You can order electronics on Herufi and have them delivered to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, or to a partner pickup point anywhere else in Tanzania. Prices are in shillings and include import duty." },
        { q: "How long does electronics delivery from China to Tanzania take?", a: `Express air takes ${f.expressDays} days, air cargo ${f.airDays} days and sea freight ${f.seaDays} days, including customs clearance. Small, light items like earbuds and smartwatches are cheapest to send by air.` },
        { q: "Are the electronics new and original?", a: "Yes. Every item is new, bought from a verified manufacturer and checked at our Guangzhou warehouse before it ships. Unused items can be returned within 14 days of delivery." },
      ],
    },
    sw: {
      title: "Elektroniki Mtandaoni Tanzania: Earbuds, Saa Janja na Zaidi",
      description: "Nunua elektroniki mtandaoni Tanzania kwa bei ya kiwandani: earbuds, headphones, saa janja na vifaa vya simu kutoka Shenzhen. Lipa kwa M-Pesa.",
      keywords: ["elektroniki mtandaoni Tanzania", "duka la elektroniki Dar es Salaam", "bei ya earbuds Tanzania", "bei ya smartwatch Tanzania", "headphones bei nafuu", "spika za bluetooth", "vifaa vya simu Tanzania", "elektroniki kutoka China"],
      intro: "Herufi inauza elektroniki zinazonunuliwa moja kwa moja kutoka kwa watengenezaji wa Shenzhen, mji mkuu wa elektroniki China, na kuzifikisha Tanzania nzima. Bei zote ziko kwa shilingi zikiwa na ushuru wa forodha, vifaa vidogo husafirishwa haraka kwa ndege, na unalipa kwa M-Pesa, Tigo Pesa, Airtel Money au kadi.",
      faq: (f) => [
        { q: "Ninaweza kununua wapi elektroniki mtandaoni Tanzania?", a: "Unaweza kuagiza elektroniki kwenye Herufi na kuletewa mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, au kwenye kituo cha washirika popote Tanzania. Bei ziko kwa shilingi na zinajumuisha ushuru." },
        { q: "Elektroniki kutoka China huchukua muda gani kufika Tanzania?", a: `Ndege ya haraka ni siku ${f.expressDays}, ndege (cargo) siku ${f.airDays} na meli siku ${f.seaDays}, ikijumuisha kutoa mzigo forodhani. Vifaa vidogo kama earbuds na saa janja ni nafuu zaidi kwa ndege.` },
        { q: "Je, elektroniki ni mpya na halisi?", a: "Ndiyo. Kila bidhaa ni mpya, imenunuliwa kutoka kwa mtengenezaji aliyethibitishwa na kukaguliwa kwenye ghala letu la Guangzhou kabla ya kusafirishwa. Bidhaa ambayo haijatumika inaweza kurudishwa ndani ya siku 14." },
      ],
    },
  },
  fashion: {
    en: {
      title: "Fashion Online in Tanzania: Men's & Women's Clothing",
      description: "Shop men's and women's clothing online in Tanzania: shirts, dresses, jackets and basics from Guangzhou garment makers. Prices in TZS, pay with M-Pesa.",
      keywords: ["clothes online Tanzania", "fashion store Dar es Salaam", "women's clothing Tanzania", "men's clothing Tanzania", "dresses online Tanzania", "jackets Tanzania", "clothes from China", "affordable fashion Tanzania"],
      intro: "Herufi brings clothing straight from the garment makers of Guangzhou to Tanzania: everyday shirts, knitwear, dresses, jackets and basics for men and women. Each product page lists sizes and materials, prices are in shillings with import duty included, and clothes are light enough to ship economically by air.",
      faq: (f) => [
        { q: "Where can I buy clothes online in Tanzania?", a: "Herufi delivers men's and women's clothing to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, and to pickup points across Tanzania. You pay in shillings with M-Pesa, Tigo Pesa, Airtel Money or card." },
        { q: "What if the size doesn't fit?", a: "Check the size and material details on the product page before you order. If an item is unused and in its original packaging, you can return it within 14 days of delivery." },
        { q: "How long does clothing take to arrive from China?", a: `Air cargo takes ${f.airDays} days and express air ${f.expressDays} days. Sea freight takes ${f.seaDays} days and is the cheapest way to send larger orders.` },
      ],
    },
    sw: {
      title: "Nguo Mtandaoni Tanzania: Mitindo ya Kike na Kiume",
      description: "Nunua nguo za kike na za kiume mtandaoni Tanzania: mashati, magauni, jaketi na zaidi kutoka viwanda vya Guangzhou. Bei kwa shilingi, lipa kwa M-Pesa.",
      keywords: ["nguo mtandaoni Tanzania", "duka la nguo Dar es Salaam", "nguo za kike", "nguo za kiume", "magauni Tanzania", "jaketi Tanzania", "nguo kutoka China", "mitindo bei nafuu"],
      intro: "Herufi inaleta nguo moja kwa moja kutoka viwanda vya nguo vya Guangzhou hadi Tanzania: mashati, sweta, magauni, jaketi na nguo za kila siku za kike na za kiume. Kila ukurasa wa bidhaa unaonyesha saizi na aina ya kitambaa, bei ziko kwa shilingi zikiwa na ushuru, na nguo ni nyepesi hivyo husafirishwa kwa ndege kwa gharama nafuu.",
      faq: (f) => [
        { q: "Ninaweza kununua wapi nguo mtandaoni Tanzania?", a: "Herufi inaleta nguo za kike na za kiume mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, na kwenye vituo vya washirika Tanzania nzima. Unalipa kwa shilingi kupitia M-Pesa, Tigo Pesa, Airtel Money au kadi." },
        { q: "Itakuwaje saizi isiponitosha?", a: "Angalia saizi na kitambaa kwenye ukurasa wa bidhaa kabla ya kuagiza. Ikiwa nguo haijatumika na iko kwenye kifungashio chake, unaweza kuirudisha ndani ya siku 14 tangu kufika." },
        { q: "Nguo kutoka China huchukua muda gani kufika?", a: `Ndege (cargo) ni siku ${f.airDays} na ndege ya haraka siku ${f.expressDays}. Meli ni siku ${f.seaDays} na ndiyo njia nafuu zaidi kwa oda kubwa.` },
      ],
    },
  },
  footwear: {
    en: {
      title: "Shoes Online in Tanzania: Sneakers, Boots & Leather Shoes",
      description: "Buy shoes online in Tanzania: running shoes, sneakers, boots and leather shoes made by factories in China. Prices in shillings, delivery across Tanzania.",
      keywords: ["shoes online Tanzania", "sneakers Tanzania", "running shoes price in Tanzania", "boots Tanzania", "leather shoes Dar es Salaam", "men's shoes Tanzania", "women's shoes Tanzania", "shoes from China"],
      intro: "Herufi stocks running shoes, sneakers, boots and leather classics made by footwear factories in China, delivered anywhere in Tanzania. Sizes are listed on every product page, prices are in shillings with import duty included, and you can pay with mobile money or card.",
      faq: (f) => [
        { q: "Where can I buy shoes online in Tanzania?", a: "Order on Herufi for delivery to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, or to a partner pickup point in other towns. Every price is in Tanzanian shillings." },
        { q: "Can I return shoes that don't fit?", a: "Yes. Unworn shoes in their original box can be returned within 14 days of delivery, and refunds go back to your mobile money or card within 5 business days." },
        { q: "What is the cheapest way to ship shoes from China?", a: `Sea freight is the cheapest at ${f.seaFree ? "no charge on eligible orders" : `${f.seaRate} per m³`} and takes ${f.seaDays} days. Air cargo is faster at ${f.airDays} days.` },
      ],
    },
    sw: {
      title: "Viatu Mtandaoni Tanzania: Raba, Buti na Viatu vya Ngozi",
      description: "Nunua viatu mtandaoni Tanzania: viatu vya kukimbia, raba, buti na viatu vya ngozi kutoka viwanda vya China. Bei kwa shilingi, tunafikisha Tanzania nzima.",
      keywords: ["viatu mtandaoni Tanzania", "raba Tanzania", "bei ya viatu vya kukimbia", "buti Tanzania", "viatu vya ngozi Dar es Salaam", "viatu vya kiume", "viatu vya kike", "viatu kutoka China"],
      intro: "Herufi ina viatu vya kukimbia, raba, buti na viatu vya ngozi vinavyotengenezwa na viwanda vya viatu China, na tunavifikisha popote Tanzania. Saizi zinaonyeshwa kwenye kila ukurasa wa bidhaa, bei ziko kwa shilingi zikiwa na ushuru, na unalipa kwa pesa ya simu au kadi.",
      faq: (f) => [
        { q: "Ninaweza kununua wapi viatu mtandaoni Tanzania?", a: "Agiza kwenye Herufi uletewe mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, au kwenye kituo cha washirika kwa miji mingine. Bei zote ziko kwa shilingi za Tanzania." },
        { q: "Naweza kurudisha viatu visivyonitosha?", a: "Ndiyo. Viatu ambavyo havijavaliwa na viko kwenye boksi lake vinaweza kurudishwa ndani ya siku 14, na pesa inarudishwa kwenye pesa ya simu au kadi ndani ya siku 5 za kazi." },
        { q: "Njia nafuu zaidi ya kusafirisha viatu kutoka China ni ipi?", a: `Meli ndiyo nafuu zaidi (${f.seaFree ? "bure kwa oda zinazostahili" : `${f.seaRate} kwa m³`}) na huchukua siku ${f.seaDays}. Ndege (cargo) ni ya haraka zaidi, siku ${f.airDays}.` },
      ],
    },
  },
  beauty: {
    en: {
      title: "Skincare & Beauty Products Online in Tanzania",
      description: "Shop skincare, serums, makeup and beauty essentials online in Tanzania at factory prices. Delivered to Dar es Salaam and across Tanzania, pay with M-Pesa.",
      keywords: ["skincare Tanzania", "beauty products online Tanzania", "makeup Dar es Salaam", "vitamin C serum Tanzania", "cosmetics shop Tanzania", "face cream price in Tanzania", "beauty products from China"],
      intro: "Herufi's beauty range covers everyday skincare, serums, makeup and personal care, sourced directly from verified cosmetics manufacturers and delivered across Tanzania. Ingredients and usage are listed on each product page, and prices are in shillings with import duty included.",
      faq: () => [
        { q: "Where can I buy skincare products online in Tanzania?", a: "Herufi delivers skincare and makeup to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, and to pickup points across Tanzania, with payment by M-Pesa, Tigo Pesa, Airtel Money or card." },
        { q: "Can I return beauty products?", a: "Unopened beauty products in their original sealed packaging can be returned within 14 days of delivery. For hygiene reasons, opened items can only be returned if they are faulty." },
      ],
    },
    sw: {
      title: "Vipodozi na Bidhaa za Ngozi Mtandaoni Tanzania",
      description: "Nunua bidhaa za kutunza ngozi, serum, vipodozi na bidhaa za urembo mtandaoni Tanzania kwa bei ya kiwandani. Tunafikisha Tanzania nzima, lipa kwa M-Pesa.",
      keywords: ["vipodozi Tanzania", "bidhaa za urembo mtandaoni", "vipodozi Dar es Salaam", "serum ya vitamin C Tanzania", "duka la vipodozi", "bei ya krimu ya uso", "vipodozi kutoka China"],
      intro: "Bidhaa za urembo za Herufi zinajumuisha za kutunza ngozi, serum, vipodozi na usafi binafsi, zinazonunuliwa moja kwa moja kutoka kwa watengenezaji waliothibitishwa na kufikishwa Tanzania nzima. Viambato na jinsi ya kutumia vimeorodheshwa kwenye kila ukurasa, na bei ziko kwa shilingi zikiwa na ushuru.",
      faq: () => [
        { q: "Ninaweza kununua wapi vipodozi mtandaoni Tanzania?", a: "Herufi inaleta bidhaa za ngozi na vipodozi mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, na kwenye vituo vya washirika Tanzania nzima, kwa malipo ya M-Pesa, Tigo Pesa, Airtel Money au kadi." },
        { q: "Naweza kurudisha vipodozi?", a: "Vipodozi ambavyo havijafunguliwa na viko kwenye kifungashio chake vinaweza kurudishwa ndani ya siku 14. Kwa sababu za usafi, vilivyofunguliwa hurudishwa tu vikiwa na kasoro." },
      ],
    },
  },
  home: {
    en: {
      title: "Furniture & Home Decor Online in Tanzania",
      description: "Buy furniture, sofas, lighting and home decor online in Tanzania, made in Foshan, China's furniture capital. Sea freight to Dar es Salaam, customs handled.",
      keywords: ["furniture online Tanzania", "furniture shop Dar es Salaam", "sofa price in Tanzania", "home decor Tanzania", "lighting Tanzania", "furniture from China to Tanzania", "Foshan furniture Tanzania"],
      intro: "Herufi sources sofas, tables, lighting and home decor from the furniture workshops of Foshan, China's furniture capital, and ships them to Tanzania with customs cleared for you. Large furniture travels by sea freight, which is priced by volume, and each product page shows the packed size and the exact shipping cost before you pay.",
      faq: (f) => [
        { q: "How much does it cost to ship furniture from China to Tanzania?", a: `Furniture ships by sea freight, which is ${f.seaFree ? "free on eligible orders" : `${f.seaRate} per cubic metre`} and takes ${f.seaDays} days to Dar es Salaam including customs. The exact cost for your item is shown on its product page.` },
        { q: "Can furniture be shipped by air?", a: "Large furniture ships by sea only, because air freight is charged by volumetric weight and would cost more than the item. Small decor and lighting can usually go by air." },
        { q: "Do you deliver furniture outside Dar es Salaam?", a: "Yes. We deliver to the door in Dar es Salaam, Arusha, Mwanza and Dodoma, and arrange collection from partner pickup points in other towns." },
      ],
    },
    sw: {
      title: "Samani na Mapambo ya Nyumbani Mtandaoni Tanzania",
      description: "Nunua samani, sofa, taa na mapambo ya nyumbani mtandaoni Tanzania kutoka Foshan, China. Usafirishaji kwa meli hadi Dar es Salaam, ushuru tunashughulikia.",
      keywords: ["samani mtandaoni Tanzania", "duka la samani Dar es Salaam", "bei ya sofa Tanzania", "mapambo ya nyumbani", "taa za nyumbani Tanzania", "samani kutoka China hadi Tanzania", "fenicha za China"],
      intro: "Herufi inanunua sofa, meza, taa na mapambo ya nyumbani kutoka karakana za samani za Foshan, mji mkuu wa samani China, na kuzisafirisha hadi Tanzania huku tukishughulikia forodha. Samani kubwa husafirishwa kwa meli, ambayo bei yake ni kwa ujazo, na kila ukurasa wa bidhaa unaonyesha ukubwa wa mzigo na gharama kamili ya usafirishaji kabla ya kulipa.",
      faq: (f) => [
        { q: "Kusafirisha samani kutoka China hadi Tanzania kunagharimu kiasi gani?", a: `Samani husafirishwa kwa meli, ambayo ni ${f.seaFree ? "bure kwa oda zinazostahili" : `${f.seaRate} kwa mita ya ujazo`} na huchukua siku ${f.seaDays} hadi Dar es Salaam ikijumuisha forodha. Gharama kamili inaonyeshwa kwenye ukurasa wa bidhaa.` },
        { q: "Je, samani zinaweza kusafirishwa kwa ndege?", a: "Samani kubwa husafirishwa kwa meli tu, kwa sababu ndege hutoza kwa uzito wa ujazo na gharama ingezidi bei ya bidhaa. Mapambo madogo na taa kwa kawaida yanaweza kwenda kwa ndege." },
        { q: "Mnafikisha samani nje ya Dar es Salaam?", a: "Ndiyo. Tunafikisha mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, na tunapanga uchukuaji kwenye vituo vya washirika kwa miji mingine." },
      ],
    },
  },
  accessories: {
    en: {
      title: "Watches, Bags & Jewellery Online in Tanzania",
      description: "Buy watches, leather bags, wallets, sunglasses and jewellery online in Tanzania at factory prices. Delivered across Tanzania, pay with M-Pesa or card.",
      keywords: ["watches price in Tanzania", "bags online Tanzania", "leather bags Dar es Salaam", "jewellery Tanzania", "wallets Tanzania", "sunglasses Tanzania", "accessories from China"],
      intro: "Herufi's accessories cover watches, leather bags, wallets, sunglasses and jewellery from workshops in Guangzhou and Yiwu, delivered anywhere in Tanzania. Accessories are small and light, so they ship affordably by air, and every price is in shillings with import duty included.",
      faq: (f) => [
        { q: "Where can I buy watches and bags online in Tanzania?", a: "Herufi delivers watches, bags and jewellery to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, and to pickup points in other towns, with payment by mobile money or card." },
        { q: "How fast can accessories arrive from China?", a: `Express air takes ${f.expressDays} days and air cargo ${f.airDays} days, including customs clearance.` },
      ],
    },
    sw: {
      title: "Saa, Mikoba na Vito Mtandaoni Tanzania",
      description: "Nunua saa, mikoba ya ngozi, pochi, miwani ya jua na vito mtandaoni Tanzania kwa bei ya kiwandani. Tunafikisha Tanzania nzima, lipa kwa M-Pesa au kadi.",
      keywords: ["bei ya saa Tanzania", "mikoba mtandaoni Tanzania", "mikoba ya ngozi Dar es Salaam", "vito Tanzania", "pochi Tanzania", "miwani ya jua", "vifaa vya mitindo kutoka China"],
      intro: "Vifaa vya Herufi vinajumuisha saa, mikoba ya ngozi, pochi, miwani ya jua na vito kutoka karakana za Guangzhou na Yiwu, na tunavifikisha popote Tanzania. Ni vidogo na vyepesi, hivyo husafirishwa kwa ndege kwa gharama nafuu, na bei zote ziko kwa shilingi zikiwa na ushuru.",
      faq: (f) => [
        { q: "Ninaweza kununua wapi saa na mikoba mtandaoni Tanzania?", a: "Herufi inaleta saa, mikoba na vito mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, na kwenye vituo vya washirika kwa miji mingine, kwa malipo ya pesa ya simu au kadi." },
        { q: "Vifaa hivi hufika kwa haraka kiasi gani kutoka China?", a: `Ndege ya haraka ni siku ${f.expressDays} na ndege (cargo) siku ${f.airDays}, ikijumuisha kutoa mzigo forodhani.` },
      ],
    },
  },
  sports: {
    en: {
      title: "Sports & Fitness Equipment Online in Tanzania",
      description: "Shop gym and fitness equipment, yoga mats, training gear and outdoor equipment online in Tanzania at factory prices. Delivered across Tanzania.",
      keywords: ["fitness equipment Tanzania", "gym equipment Dar es Salaam", "yoga mat Tanzania", "sports gear Tanzania", "outdoor gear Tanzania", "camping equipment Tanzania", "sports equipment from China"],
      intro: "Herufi sells training, fitness and outdoor gear made by sports manufacturers in China and delivered across Tanzania. Each product page shows the weight and packed size, so you can compare sea, air and express shipping costs before you order.",
      faq: (f) => [
        { q: "Where can I buy gym and fitness equipment in Tanzania?", a: "Order fitness and outdoor equipment on Herufi for delivery to Dar es Salaam, Arusha, Mwanza, Dodoma and pickup points across Tanzania. Prices are in shillings with import duty included." },
        { q: "What is the cheapest way to ship heavy equipment from China?", a: `Sea freight takes ${f.seaDays} days and is priced by volume (usually ${f.seaRate} per m³), so it is the cheapest choice for heavy or bulky items.` },
      ],
    },
    sw: {
      title: "Vifaa vya Michezo na Mazoezi Mtandaoni Tanzania",
      description: "Nunua vifaa vya gym na mazoezi, mikeka ya yoga, vifaa vya michezo na vya nje mtandaoni Tanzania kwa bei ya kiwandani. Tunafikisha Tanzania nzima.",
      keywords: ["vifaa vya mazoezi Tanzania", "vifaa vya gym Dar es Salaam", "mkeka wa yoga", "vifaa vya michezo Tanzania", "vifaa vya kambi", "vifaa vya michezo kutoka China"],
      intro: "Herufi inauza vifaa vya mazoezi, michezo na vya nje vinavyotengenezwa na viwanda vya michezo China na kufikishwa Tanzania nzima. Kila ukurasa wa bidhaa unaonyesha uzito na ukubwa wa mzigo, hivyo unaweza kulinganisha gharama za meli, ndege na ndege ya haraka kabla ya kuagiza.",
      faq: (f) => [
        { q: "Ninaweza kununua wapi vifaa vya gym na mazoezi Tanzania?", a: "Agiza vifaa vya mazoezi kwenye Herufi uletewe Dar es Salaam, Arusha, Mwanza, Dodoma na vituo vya washirika Tanzania nzima. Bei ziko kwa shilingi zikiwa na ushuru." },
        { q: "Njia nafuu zaidi ya kusafirisha vifaa vizito kutoka China ni ipi?", a: `Meli huchukua siku ${f.seaDays} na bei yake ni kwa ujazo (kwa kawaida ${f.seaRate} kwa m³), hivyo ndiyo nafuu zaidi kwa vitu vizito au vikubwa.` },
      ],
    },
  },
  kitchen: {
    en: {
      title: "Kitchenware & Dinnerware Online in Tanzania",
      description: "Buy kitchenware, cookware, ceramic plates, mugs and kitchen tools online in Tanzania at factory prices. Delivered across Tanzania, pay with M-Pesa.",
      keywords: ["kitchenware Tanzania", "cookware online Tanzania", "dinner set price in Tanzania", "ceramic plates Tanzania", "kitchen utensils Dar es Salaam", "kitchenware from China"],
      intro: "Herufi's kitchen range includes cookware, ceramic dinnerware, mugs and kitchen tools from factories in China, packed for safe shipping and delivered across Tanzania. Prices are in shillings with import duty included, and every order is inspected before it leaves our Guangzhou warehouse.",
      faq: () => [
        { q: "Where can I buy kitchenware online in Tanzania?", a: "Herufi delivers cookware, dinnerware and kitchen tools to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, and to pickup points across Tanzania." },
        { q: "What if a ceramic item arrives broken?", a: "Send us a photo within 48 hours of delivery and we will send a replacement or refund you in full, including shipping. Every order is inspected and packed at our Guangzhou warehouse before shipping." },
      ],
    },
    sw: {
      title: "Vyombo vya Jikoni na vya Chakula Mtandaoni Tanzania",
      description: "Nunua sufuria, sahani za kauri, vikombe na vifaa vya jikoni mtandaoni Tanzania kwa bei ya kiwandani. Tunafikisha Tanzania nzima, lipa kwa M-Pesa.",
      keywords: ["vyombo vya jikoni Tanzania", "sufuria mtandaoni", "bei ya seti ya vyombo", "sahani za kauri", "vifaa vya jikoni Dar es Salaam", "vyombo kutoka China"],
      intro: "Vyombo vya jikoni vya Herufi vinajumuisha sufuria, sahani za kauri, vikombe na vifaa vya jikoni kutoka viwanda vya China, vimefungwa vizuri kwa usafirishaji salama na kufikishwa Tanzania nzima. Bei ziko kwa shilingi zikiwa na ushuru, na kila oda hukaguliwa kabla ya kutoka ghala letu la Guangzhou.",
      faq: () => [
        { q: "Ninaweza kununua wapi vyombo vya jikoni mtandaoni Tanzania?", a: "Herufi inaleta sufuria, vyombo vya chakula na vifaa vya jikoni mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, na kwenye vituo vya washirika Tanzania nzima." },
        { q: "Itakuwaje chombo cha kauri kikifika kimevunjika?", a: "Tutumie picha ndani ya saa 48 tangu kufika, nasi tutakutumia nyingine au kurudisha pesa yote, ikijumuisha usafirishaji. Kila oda hukaguliwa na kufungwa kwenye ghala letu la Guangzhou kabla ya kusafirishwa." },
      ],
    },
  },
  computers: {
    en: {
      title: "Laptops & Gaming PCs in Tanzania: Prices & Delivery",
      description: "Buy laptops, gaming PCs, monitors, keyboards, mice and headsets online in Tanzania. Prices in TZS, duty included, delivered nationwide, pay with M-Pesa.",
      keywords: [
        "gaming pc price in Tanzania", "gaming pc Tanzania", "gaming pc Dar es Salaam", "laptop price in Tanzania",
        "gaming laptop price in Tanzania", "computer shop Dar es Salaam", "buy laptop online Tanzania", "desktop computer price in Tanzania",
        "gaming monitor Tanzania", "mechanical keyboard Tanzania", "gaming mouse Tanzania", "gaming headset Tanzania",
        "RTX graphics card Tanzania", "computers from China to Tanzania",
      ],
      intro: "Herufi sells laptops, gaming PCs, monitors and gaming peripherals (mechanical keyboards, mice, headsets and controllers) bought from manufacturers in Shenzhen and delivered across Tanzania. Each product page lists the full specifications, such as processor, graphics card, RAM and storage, and every price is in shillings with import duty included. You can pay with M-Pesa, Tigo Pesa, Airtel Money, HaloPesa or card.",
      faq: (f) => [
        { q: "How much is a gaming PC in Tanzania?", a: "Gaming PC prices on Herufi are shown in Tanzanian shillings with import duty included, and depend mainly on the graphics card, processor, RAM and storage. Each product page lists the full specifications, and 18% VAT and the shipping cost are shown before you pay." },
        { q: "Where can I buy a laptop or gaming PC online in Tanzania?", a: "You can order laptops and gaming PCs on Herufi for delivery to your door in Dar es Salaam, Arusha, Mwanza and Dodoma, or to a partner pickup point anywhere else in Tanzania, and pay with M-Pesa or card." },
        { q: "How long does a laptop or PC take to arrive from China?", a: `Express air takes ${f.expressDays} days, air cargo ${f.airDays} days and sea freight ${f.seaDays} days, including customs clearance. Laptops are light enough to send by air; full desktop towers are often cheaper by sea because air freight is charged by volumetric weight.` },
        { q: "Are the computers new, and what if one arrives faulty?", a: "Every computer is new and checked at our Guangzhou warehouse before it ships. If it arrives damaged or faulty, send us a photo within 48 hours of delivery and we will send a replacement or refund you in full, including shipping." },
      ],
    },
    sw: {
      title: "Laptop na Kompyuta za Gaming Tanzania: Bei na Usafirishaji",
      description: "Nunua laptop, kompyuta za gaming, skrini, keyboard, mouse na headset mtandaoni Tanzania. Bei kwa shilingi na ushuru, tunafikisha kote, lipa kwa M-Pesa.",
      keywords: [
        "bei ya gaming pc Tanzania", "kompyuta ya gaming Tanzania", "gaming pc Dar es Salaam", "bei ya laptop Tanzania",
        "bei ya gaming laptop Tanzania", "duka la kompyuta Dar es Salaam", "kununua laptop mtandaoni", "bei ya kompyuta Tanzania",
        "skrini ya gaming", "keyboard ya gaming", "mouse ya gaming", "kompyuta kutoka China",
      ],
      intro: "Herufi inauza laptop, kompyuta za gaming, skrini na vifaa vya gaming (keyboard, mouse, headset na controller) kutoka kwa watengenezaji wa Shenzhen na kuzifikisha Tanzania nzima. Kila ukurasa wa bidhaa unaonyesha sifa kamili kama processor, kadi ya grafiki (graphics card), RAM na hifadhi, na bei zote ziko kwa shilingi zikiwa na ushuru. Unalipa kwa M-Pesa, Tigo Pesa, Airtel Money, HaloPesa au kadi.",
      faq: (f) => [
        { q: "Bei ya gaming PC Tanzania ni kiasi gani?", a: "Bei za kompyuta za gaming kwenye Herufi zinaonyeshwa kwa shilingi zikiwa na ushuru, na zinategemea zaidi kadi ya grafiki, processor, RAM na hifadhi. Kila ukurasa unaonyesha sifa kamili, na VAT ya 18% pamoja na gharama ya usafirishaji zinaonyeshwa kabla ya kulipa." },
        { q: "Ninaweza kununua wapi laptop au gaming PC mtandaoni Tanzania?", a: "Unaweza kuagiza laptop na kompyuta za gaming kwenye Herufi uletewe mlangoni Dar es Salaam, Arusha, Mwanza na Dodoma, au kwenye kituo cha washirika popote Tanzania, na kulipa kwa M-Pesa au kadi." },
        { q: "Laptop au kompyuta huchukua muda gani kufika kutoka China?", a: `Ndege ya haraka ni siku ${f.expressDays}, ndege (cargo) siku ${f.airDays} na meli siku ${f.seaDays}, ikijumuisha forodha. Laptop ni nyepesi kwa ndege; kompyuta kubwa za mezani mara nyingi ni nafuu zaidi kwa meli kwa sababu ndege hutoza kwa uzito wa ujazo.` },
        { q: "Je, kompyuta ni mpya, na itakuwaje ikifika na kasoro?", a: "Kila kompyuta ni mpya na hukaguliwa kwenye ghala letu la Guangzhou kabla ya kusafirishwa. Ikifika imeharibika au ina kasoro, tutumie picha ndani ya saa 48 nasi tutakutumia nyingine au kurudisha pesa yote, ikijumuisha usafirishaji." },
      ],
    },
  },
};

/** Generic copy for categories created later in the admin. */
function fallback(name: string, locale: Locale): CategoryCopy {
  const lower = name.toLowerCase();
  if (locale === "sw") {
    return {
      title: `${name} Mtandaoni Tanzania: Bei ya Kiwandani`,
      description: `Nunua ${lower} mtandaoni Tanzania moja kwa moja kutoka viwanda vya China. Bei kwa shilingi zikiwa na ushuru, tunafikisha Tanzania nzima, lipa kwa M-Pesa au kadi.`,
      keywords: [`${lower} Tanzania`, `${lower} mtandaoni`, `bei ya ${lower} Tanzania`, `${lower} kutoka China`, `${lower} Dar es Salaam`],
      intro: `Herufi inanunua ${lower} moja kwa moja kutoka kwa watengenezaji waliothibitishwa China na kuzifikisha Tanzania nzima. Bei ziko kwa shilingi zikiwa na ushuru wa forodha, na unalipa kwa M-Pesa, Tigo Pesa, Airtel Money au kadi.`,
      faq: (f) => [{ q: `${name} kutoka China huchukua muda gani kufika Tanzania?`, a: `Ndege ya haraka ni siku ${f.expressDays}, ndege (cargo) siku ${f.airDays} na meli siku ${f.seaDays}, ikijumuisha kutoa mzigo forodhani.` }],
    };
  }
  return {
    title: `${name} Online in Tanzania at Factory Prices`,
    description: `Buy ${lower} online in Tanzania direct from factories in China. Prices in shillings with import duty included, delivered across Tanzania, pay with M-Pesa or card.`,
    keywords: [`${lower} Tanzania`, `${lower} online Tanzania`, `${lower} price in Tanzania`, `${lower} from China`, `${lower} Dar es Salaam`],
    intro: `Herufi buys ${lower} directly from verified manufacturers in China and delivers across Tanzania. Prices are in shillings with import duty included, and you can pay with M-Pesa, Tigo Pesa, Airtel Money or card.`,
    faq: (f) => [{ q: `How long does ${lower} take to arrive from China to Tanzania?`, a: `Express air takes ${f.expressDays} days, air cargo ${f.airDays} days and sea freight ${f.seaDays} days, including customs clearance.` }],
  };
}

export function categorySeo(slug: string, name: string, locale: Locale) {
  return CATEGORIES[slug]?.[locale] ?? fallback(name, locale);
}

/** Search phrases for a single product page (name + brand + place + intent, both languages). */
export function productKeywords(name: string, brand: string, category: string | undefined) {
  return [
    `${name} price in Tanzania`,
    `buy ${name} online Tanzania`,
    `${name} Dar es Salaam`,
    `${name} bei Tanzania`,
    `${brand} Tanzania`,
    category ? `${category.toLowerCase()} online Tanzania` : "",
    name,
    brand,
    "buy from China Tanzania",
  ].filter(Boolean);
}

/** Trim to a word boundary for meta descriptions (Google shows ~155–160 characters). */
export function clampDescription(text: string, max = 158) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:\s]+$/, "")}…`;
}
