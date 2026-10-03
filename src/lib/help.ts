import type { Locale } from "@/i18n/config";

type Section = { id?: string; heading: string; body: string[] };
type Content = { title: string; summary: string; sections: Section[] };
export type HelpTopic = { slug: string } & Record<Locale, Content>;

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: "shipping",
    en: {
      title: "Shipping from China", summary: "How your order travels from the factory to your door in Tanzania.",
      sections: [
        { heading: "Delivery options", body: [
          "Air cargo: 10–14 days. Free on orders over TSh 250,000, otherwise TSh 15,000.",
          "Express air: 5–7 days, TSh 45,000. Best when you need it fast.",
          "Sea freight: 30–45 days, TSh 8,000. The cheapest way to ship bulky items like furniture.",
        ] },
        { heading: "How it works", body: [
          "We buy from the factory, inspect your items at our warehouse in Guangzhou, then consolidate and ship them to Dar es Salaam. Our team clears customs and hands your parcel to a local courier for door delivery.",
        ] },
        { heading: "Where we deliver", body: [
          "Door delivery to Dar es Salaam, Arusha, Mwanza, Dodoma, Mbeya, Morogoro, Tanga, Moshi and Zanzibar. Other towns are served through our partner pickup points; the courier will call you to arrange collection.",
        ] },
        { heading: "Tracking", body: ["You'll get an SMS and email at every stage: shipped from China, arrived in Tanzania, cleared customs and out for delivery. You can also follow it under Orders in your account."] },
      ],
    },
    sw: {
      title: "Usafirishaji kutoka China", summary: "Jinsi oda yako inavyosafiri kutoka kiwandani hadi mlangoni kwako Tanzania.",
      sections: [
        { heading: "Njia za usafirishaji", body: [
          "Ndege (cargo): siku 10–14. Bure kwa oda zaidi ya TSh 250,000, vinginevyo TSh 15,000.",
          "Ndege ya haraka: siku 5–7, TSh 45,000. Inafaa unapohitaji haraka.",
          "Meli: siku 30–45, TSh 8,000. Njia nafuu zaidi kwa mizigo mikubwa kama samani.",
        ] },
        { heading: "Inavyofanya kazi", body: [
          "Tunanunua kutoka kiwandani, tunakagua bidhaa zako kwenye ghala letu la Guangzhou, kisha tunaziunganisha na kuzisafirisha hadi Dar es Salaam. Timu yetu inatoa mzigo forodhani na kumkabidhi msafirishaji wa ndani akuletee mlangoni.",
        ] },
        { heading: "Tunafikisha wapi", body: [
          "Tunafikisha mlangoni Dar es Salaam, Arusha, Mwanza, Dodoma, Mbeya, Morogoro, Tanga, Moshi na Zanzibar. Miji mingine inahudumiwa kupitia vituo vya washirika wetu; msafirishaji atakupigia kupanga uchukuaji.",
        ] },
        { heading: "Ufuatiliaji", body: ["Utapokea SMS na barua pepe kila hatua: imesafirishwa kutoka China, imefika Tanzania, imetoka forodhani na iko njiani kwako. Unaweza pia kuifuatilia kwenye Oda ndani ya akaunti yako."] },
      ],
    },
  },
  {
    slug: "returns",
    en: {
      title: "Returns & exchanges", summary: "14-day returns from anywhere in Tanzania.",
      sections: [
        { heading: "Our policy", body: [
          "You can return unused items in their original packaging within 14 days of delivery for a full refund.",
          "For hygiene reasons, opened beauty products can only be returned if faulty.",
        ] },
        { heading: "How to return", body: [
          "Contact us with your order number. Drop the item at our Dar es Salaam collection point (Mikocheni) or book a courier pickup in other towns.",
          "Refunds go back to your M-Pesa, Tigo Pesa, Airtel Money or card within 5 business days of the item reaching us.",
        ] },
        { heading: "Damaged or wrong item?", body: ["Send us a photo within 48 hours of delivery and we'll send a replacement or refund you in full, including shipping."] },
      ],
    },
    sw: {
      title: "Kurudisha na kubadilisha", summary: "Kurudisha ndani ya siku 14 ukiwa popote Tanzania.",
      sections: [
        { heading: "Sera yetu", body: [
          "Unaweza kurudisha bidhaa ambazo hazijatumika zikiwa kwenye kifungashio chake ndani ya siku 14 tangu kufika, na kurudishiwa pesa zote.",
          "Kwa sababu za usafi, bidhaa za urembo zilizofunguliwa zinarudishwa tu zikiwa na kasoro.",
        ] },
        { heading: "Jinsi ya kurudisha", body: [
          "Wasiliana nasi ukiwa na namba ya oda. Leta bidhaa kwenye kituo chetu cha Dar es Salaam (Mikocheni) au omba msafirishaji aichukue ukiwa mikoani.",
          "Pesa zinarudishwa kwa M-Pesa, Tigo Pesa, Airtel Money au kadi yako ndani ya siku 5 za kazi tangu bidhaa itufikie.",
        ] },
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
  {
    slug: "privacy",
    en: {
      title: "Privacy policy", summary: "How we collect, use and protect your data.",
      sections: [
        { heading: "What we collect", body: ["The details you give us when you create an account or order: name, email, phone number, delivery address and order history. We never store full card numbers or mobile money PINs."] },
        { heading: "How we use it", body: ["To process and deliver your orders, clear customs on your behalf, provide support, personalise recommendations and, only if you opt in, send you offers."] },
        { heading: "Your choices", body: ["Update your details and preferences any time in account settings, or contact us to request a copy or deletion of your data."] },
      ],
    },
    sw: {
      title: "Sera ya faragha", summary: "Jinsi tunavyokusanya, kutumia na kulinda taarifa zako.",
      sections: [
        { heading: "Tunachokusanya", body: ["Taarifa unazotupa unapofungua akaunti au kuagiza: jina, barua pepe, namba ya simu, anwani ya kufikishia na historia ya oda. Hatuhifadhi namba kamili za kadi wala PIN za pesa kwa simu."] },
        { heading: "Tunavyozitumia", body: ["Kushughulikia na kufikisha oda zako, kutoa mizigo forodhani kwa niaba yako, kutoa huduma kwa wateja, kupendekeza bidhaa na, ukikubali tu, kukutumia ofa."] },
        { heading: "Uchaguzi wako", body: ["Badilisha taarifa na mapendeleo yako wakati wowote kwenye mipangilio ya akaunti, au wasiliana nasi kuomba nakala au kufutwa kwa taarifa zako."] },
      ],
    },
  },
  {
    slug: "terms",
    en: {
      title: "Terms of service", summary: "The terms that apply when you shop with us.",
      sections: [
        { heading: "Orders", body: ["Placing an order is an offer to buy. We confirm it once payment is received and we've reserved stock with the factory."] },
        { heading: "Pricing", body: ["All prices are in Tanzanian shillings and include import duty. VAT (18%) and shipping are added at checkout."] },
        { heading: "Demo notice", body: ["This store is a demonstration. No real payments are processed and no goods will be shipped."] },
      ],
    },
    sw: {
      title: "Masharti ya huduma", summary: "Masharti yanayotumika unaponunua kwetu.",
      sections: [
        { heading: "Oda", body: ["Kuweka oda ni ombi la kununua. Tunaithibitisha baada ya kupokea malipo na kuhifadhi bidhaa kiwandani."] },
        { heading: "Bei", body: ["Bei zote ni kwa shilingi za Tanzania na zinajumuisha ushuru wa forodha. VAT (18%) na usafirishaji huongezwa wakati wa malipo."] },
        { heading: "Tangazo la majaribio", body: ["Duka hili ni la majaribio. Hakuna malipo halisi yanayofanyika na hakuna bidhaa zitakazosafirishwa."] },
      ],
    },
  },
];
