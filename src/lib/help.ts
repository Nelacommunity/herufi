import type { Locale } from "@/i18n/config";
import { POLICY_TOPICS } from "@/lib/policies";

type Section = { id?: string; heading: string; body: string[] };
type Content = { title: string; summary: string; sections: Section[] };
/** `kind: "policy"` topics are legal pages (shown under Policies, with a last-updated date). */
export type HelpTopic = { slug: string; kind?: "help" | "policy"; updated?: string } & Record<Locale, Content>;

const GUIDES: HelpTopic[] = [
  {
    slug: "shipping",
    en: {
      title: "Shipping from China", summary: "How your order travels from the factory to your door in Tanzania.",
      sections: [
        { heading: "Delivery options", body: [
          "Sea freight: 35–45 days. FREE on every order: we calculate the usual price (TSh 1,000,000 per cubic metre) and take it off automatically at checkout, so you can see exactly how much you save.",
          "Air cargo: 10–14 days, TSh 28,000 per kg (minimum TSh 14,000).",
          "Express air: 5–7 days, TSh 55,000 per kg (minimum TSh 55,000). Best when you need it fast.",
        ] },
        { heading: "How the price is calculated", body: [
          "Air prices use the chargeable weight: the actual weight or the volumetric weight (length × width × height in cm ÷ 6,000), whichever is higher, rounded up to the next 0.5 kg. Sea prices use the packed volume of your order.",
          "Not every item can travel every way: large furniture ships by sea only, and liquids can't go by express courier. The product page shows the price and availability of each method for the quantity you choose, and checkout only offers methods that suit everything in your bag.",
        ] },
        { heading: "How it works", body: [
          "We buy from the factory, inspect your items at our warehouse in Guangzhou, then consolidate and ship them to Dar es Salaam. Our team clears customs and hands your parcel to a local courier for door delivery.",
        ] },
        { heading: "Where we deliver", body: [
          "Door delivery to Dar es Salaam, Arusha, Mwanza and Dodoma. Other towns are served through our partner pickup points; the courier will call you to arrange collection.",
        ] },
        { heading: "Tracking", body: ["You'll get an SMS and email at every stage: shipped from China, arrived in Tanzania, cleared customs and out for delivery. You can also follow it under Orders in your account."] },
      ],
    },
    sw: {
      title: "Usafirishaji kutoka China", summary: "Jinsi oda yako inavyosafiri kutoka kiwandani hadi mlangoni kwako Tanzania.",
      sections: [
        { heading: "Njia za usafirishaji", body: [
          "Meli: siku 35–45. BURE kwa kila oda: tunahesabu bei ya kawaida (TSh 1,000,000 kwa mita moja ya ujazo) na kuiondoa wenyewe wakati wa malipo, ili uone hasa kiasi unachookoa.",
          "Ndege (cargo): siku 10–14, TSh 28,000 kwa kilo (kiwango cha chini TSh 14,000).",
          "Ndege ya haraka: siku 5–7, TSh 55,000 kwa kilo (kiwango cha chini TSh 55,000). Inafaa unapohitaji haraka.",
        ] },
        { heading: "Bei inavyohesabiwa", body: [
          "Bei ya ndege inatumia uzito unaotozwa: uzito halisi au uzito wa ujazo (urefu × upana × kimo kwa sentimita ÷ 6,000), upi mkubwa zaidi, ukizungushwa juu hadi kg 0.5 inayofuata. Bei ya meli inatumia ujazo wa mzigo wako.",
          "Si kila bidhaa inaweza kusafiri kwa kila njia: samani kubwa husafirishwa kwa meli tu, na vimiminika haviwezi kwenda kwa ndege ya haraka. Ukurasa wa bidhaa unaonyesha bei na upatikanaji wa kila njia kwa idadi unayochagua, na wakati wa malipo tunaonyesha njia zinazofaa kwa kila kitu kikapuni.",
        ] },
        { heading: "Inavyofanya kazi", body: [
          "Tunanunua kutoka kiwandani, tunakagua bidhaa zako kwenye ghala letu la Guangzhou, kisha tunaziunganisha na kuzisafirisha hadi Dar es Salaam. Timu yetu inatoa mzigo forodhani na kumkabidhi msafirishaji wa ndani akuletee mlangoni.",
        ] },
        { heading: "Tunafikisha wapi", body: [
          "Tunafikisha mlangoni Dar es Salaam, Arusha, Mwanza and Dodoma. Miji mingine inahudumiwa kupitia vituo vya washirika wetu; msafirishaji atakupigia kupanga uchukuaji.",
        ] },
        { heading: "Ufuatiliaji", body: ["Utapokea SMS na barua pepe kila hatua: imesafirishwa kutoka China, imefika Tanzania, imetoka forodhani na iko njiani kwako. Unaweza pia kuifuatilia kwenye Oda ndani ya akaunti yako."] },
      ],
    },
  },
  {
    slug: "returns",
    en: {
      title: "Returns & exchanges", summary: "14-day returns from anywhere in Tanzania, free if something's wrong.",
      sections: [
        { heading: "Our policy", body: [
          "You can return unused items in their original packaging within 14 days of delivery. Damaged, faulty or wrong items are refunded in full, including shipping, and you don't pay to send them back.",
          "For hygiene reasons, opened beauty and personal-care products can only be returned if faulty. The full rules, including cancellations and late orders, are in our Refund policy.",
        ] },
        { heading: "How to return", body: [
          "Contact us with your order number and we'll send you a return reference. Drop the item at our Dar es Salaam collection point (Mikocheni B) or book a courier pickup in other towns.",
          "Refunds go back to your M-Pesa, Tigo Pesa, Airtel Money, HaloPesa or card within 5 business days of approving your return.",
        ] },
        { heading: "Exchanges", body: ["Want a different size or colour? Return the item for a refund and place a new order, which is the fastest way to get the right one shipped from China. If the item was faulty or wrong, we'll send the replacement at no cost."] },
        { heading: "Damaged or wrong item?", body: ["Send us a photo within 48 hours of delivery and we'll send a replacement or refund you in full, including shipping."] },
      ],
    },
    sw: {
      title: "Kurudisha na kubadilisha", summary: "Kurudisha ndani ya siku 14 ukiwa popote Tanzania, bure kama kuna tatizo.",
      sections: [
        { heading: "Sera yetu", body: [
          "Unaweza kurudisha bidhaa ambazo hazijatumika zikiwa kwenye kifungashio chake ndani ya siku 14 tangu kufika. Bidhaa iliyoharibika, yenye kasoro au isiyo sahihi inarudishiwa pesa zote, pamoja na usafirishaji, na hulipi kuirudisha.",
          "Kwa sababu za usafi, bidhaa za urembo na usafi wa mwili zilizofunguliwa zinarudishwa tu zikiwa na kasoro. Masharti kamili, pamoja na kughairi na oda zilizochelewa, yako kwenye Sera ya kurejesha pesa.",
        ] },
        { heading: "Jinsi ya kurudisha", body: [
          "Wasiliana nasi ukiwa na namba ya oda nasi tutakutumia namba ya marejesho. Leta bidhaa kwenye kituo chetu cha Dar es Salaam (Mikocheni B) au omba msafirishaji aichukue ukiwa mikoani.",
          "Pesa zinarudishwa kwa M-Pesa, Tigo Pesa, Airtel Money, HaloPesa au kadi yako ndani ya siku 5 za kazi tangu kuidhinisha marejesho.",
        ] },
        { heading: "Kubadilisha", body: ["Unataka saizi au rangi nyingine? Rudisha bidhaa urudishiwe pesa kisha weka oda mpya, ambayo ndiyo njia ya haraka zaidi kupata sahihi kutoka China. Bidhaa ikiwa na kasoro au si sahihi, tutakutumia nyingine bila gharama."] },
        { heading: "Bidhaa imeharibika au si sahihi?", body: ["Tutumie picha ndani ya saa 48 tangu kufika nasi tutakutumia nyingine au kukurudishia pesa zote, pamoja na gharama za usafirishaji."] },
      ],
    },
  },
  {
    slug: "faq",
    en: {
      title: "FAQ", summary: "Quick answers to common questions.",
      sections: [
        { heading: "Do I pay customs or import duty?", body: ["No. Import duty and clearing are included in our prices. VAT (18%) is shown at checkout, so you pay nothing extra on delivery."] },
        { id: "sizing", heading: "How do I find my size?", body: ["Many factories use Asian sizing, which runs about one size small. Each product page notes fit differences; if you're between sizes, size up."] },
        { heading: "How do I pay?", body: ["Pay with M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa or Mastercard. You'll receive a prompt on your phone to confirm mobile money payments with your PIN."] },
        { heading: "Are the products original?", body: ["We buy directly from verified manufacturers in Guangzhou, Shenzhen, Yiwu and Foshan, and every order is quality-checked in our warehouse before it ships."] },
        { heading: "Can I change or cancel my order?", body: ["You can cancel within 12 hours of ordering, before we buy from the factory. Contact us on WhatsApp or email with your order number."] },
      ],
    },
    sw: {
      title: "Maswali ya mara kwa mara", summary: "Majibu ya haraka kwa maswali ya kawaida.",
      sections: [
        { heading: "Je, nitalipa ushuru wa forodha?", body: ["Hapana. Ushuru na gharama za kutoa mzigo zimejumuishwa kwenye bei zetu. VAT (18%) inaonyeshwa wakati wa malipo, hivyo hulipi chochote cha ziada mzigo ukifika."] },
        { id: "sizing", heading: "Nitajuaje saizi yangu?", body: ["Viwanda vingi hutumia saizi za Asia, ambazo ni ndogo kwa takriban saizi moja. Kila ukurasa wa bidhaa unaeleza tofauti za saizi; ukiwa katikati ya saizi mbili, chagua kubwa."] },
        { heading: "Nalipaje?", body: ["Lipa kwa M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa au Mastercard. Utapokea ombi kwenye simu yako kuthibitisha malipo kwa PIN yako."] },
        { heading: "Je, bidhaa ni halisi?", body: ["Tunanunua moja kwa moja kutoka kwa watengenezaji waliothibitishwa Guangzhou, Shenzhen, Yiwu na Foshan, na kila oda inakaguliwa ubora kwenye ghala letu kabla ya kusafirishwa."] },
        { heading: "Naweza kubadilisha au kughairi oda?", body: ["Unaweza kughairi ndani ya saa 12 tangu kuagiza, kabla hatujanunua kiwandani. Wasiliana nasi kwa WhatsApp au barua pepe ukiwa na namba ya oda."] },
      ],
    },
  },
  {
    slug: "contact",
    en: {
      title: "Contact us", summary: "Our team in Dar es Salaam is here every day, 8am to 8pm.",
      sections: [
        { heading: "WhatsApp & phone", body: ["+255 754 000 123, every day from 8am to 8pm EAT."] },
        { heading: "Email", body: ["hello@herufi.co.tz. We reply within one business day."] },
        { heading: "Visit us", body: ["Collection point: Mikocheni B, Dar es Salaam. Monday to Saturday, 9am to 6pm."] },
      ],
    },
    sw: {
      title: "Wasiliana nasi", summary: "Timu yetu ya Dar es Salaam ipo kila siku, saa 2 asubuhi hadi saa 2 usiku.",
      sections: [
        { heading: "WhatsApp na simu", body: ["+255 754 000 123, kila siku saa 2 asubuhi hadi saa 2 usiku."] },
        { heading: "Barua pepe", body: ["hello@herufi.co.tz. Tunajibu ndani ya siku moja ya kazi."] },
        { heading: "Tutembelee", body: ["Kituo cha kuchukulia mizigo: Mikocheni B, Dar es Salaam. Jumatatu hadi Jumamosi, saa 3 asubuhi hadi saa 12 jioni."] },
      ],
    },
  },
  {
    slug: "about",
    en: {
      title: "About Herufi", summary: "Factory prices for Tanzania, without the hassle of importing.",
      sections: [
        { heading: "Our story", body: ["Importing from China used to mean finding an agent, sending money abroad and hoping for the best at the port. Herufi makes it as easy as shopping at a local store: browse in shillings, pay with M-Pesa, and we handle the factory, freight and customs."] },
        { heading: "How we choose suppliers", body: ["We work only with manufacturers we've visited and verified. Every order is inspected in our Guangzhou warehouse before it ships, and anything that doesn't pass is replaced at our cost."] },
      ],
    },
    sw: {
      title: "Kuhusu Herufi", summary: "Bei za kiwandani kwa Tanzania, bila usumbufu wa kuagiza mwenyewe.",
      sections: [
        { heading: "Historia yetu", body: ["Kuagiza kutoka China kulimaanisha kutafuta wakala, kutuma pesa nje ya nchi na kubahatisha bandarini. Herufi inafanya iwe rahisi kama kununua dukani: angalia bei kwa shilingi, lipa kwa M-Pesa, nasi tunashughulikia kiwanda, usafirishaji na ushuru."] },
        { heading: "Tunavyochagua wasambazaji", body: ["Tunafanya kazi na watengenezaji tuliowatembelea na kuwathibitisha pekee. Kila oda inakaguliwa kwenye ghala letu la Guangzhou kabla ya kusafirishwa, na bidhaa isiyokidhi viwango inabadilishwa kwa gharama zetu."] },
      ],
    },
  },
];

export const HELP_TOPICS: HelpTopic[] = [...GUIDES, ...POLICY_TOPICS];
