import type { HelpTopic } from "@/lib/help";

/**
 * Business policies (refunds, terms, privacy, cookies, payments, quality guarantee).
 *
 * Written for a Tanzanian online retailer importing from China. They are a solid starting point, not legal advice:
 * have a Tanzanian advocate review them before launch, and keep them in line with how the business really operates.
 * Tokens like {brand}, {legal}, {email}, {phone}, {address} and {hours} are filled from src/lib/business.ts.
 * Lines starting with "- " render as bullet lists.
 */
export const POLICY_UPDATED = "2026-10-05";

export const POLICY_TOPICS: HelpTopic[] = [
  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "refunds",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Refund policy",
      summary: "When you can get your money back, how much, and how fast.",
      sections: [
        { heading: "Our promise", body: [
          "If something goes wrong with your order, we put it right. You get a full refund, including any shipping you paid, when an item arrives damaged, faulty, wrong or incomplete, or doesn't arrive at all. If you simply change your mind, you can return unused items within 14 days of delivery.",
          "This policy is in addition to your rights under Tanzanian consumer protection law, including the Fair Competition Act, 2003. Nothing here takes those rights away.",
        ] },
        { id: "cancel", heading: "Cancelling an order", body: [
          "- Within 12 hours of ordering, before we buy from the factory: cancel for a full refund, including shipping. Message us on WhatsApp or email with your order number.",
          "- After we've bought from the factory but before it ships from China: we'll ask the factory to cancel. If they accept, you get a full refund. If not, the order continues and you can return it under the change-of-mind rules below.",
          "- Once it has shipped from China, the order can't be cancelled, but you can still return it after delivery.",
        ] },
        { id: "faulty", heading: "Damaged, faulty, wrong or missing items", body: [
          "Tell us within 48 hours of delivery and send a photo or short video of the problem (and of the packaging, if it was damaged). Choose a replacement or a full refund, including the shipping you paid. You don't pay to return a faulty or wrong item: we collect it or pay the courier.",
          "Faults that only appear with normal use are covered by our quality guarantee: 30 days for all items and 6 months for electronics. See the Quality guarantee page.",
        ] },
        { id: "late", heading: "Late or lost orders", body: [
          "If your order hasn't arrived 30 days after the latest date in your delivery estimate, you can choose a full refund (including shipping) or wait while we find or re-ship it. If a parcel is confirmed lost, we refund you in full straight away.",
        ] },
        { id: "change-of-mind", heading: "Changed your mind?", body: [
          "You can return most items within 14 days of delivery if they are:",
          "- unused and unwashed, with all tags attached;",
          "- in their original packaging, with every accessory, manual and free gift;",
          "- for electronics, reset to factory settings with your accounts removed.",
          "We refund the price you paid for the item, including VAT. Shipping you paid for air cargo or express air isn't refunded on change-of-mind returns, and you pay to send the item back (free if you drop it at our Mikocheni collection point). Sea shipping is free, so there's nothing to deduct.",
        ] },
        { id: "exceptions", heading: "Items we can't take back unless faulty", body: [
          "- Opened beauty, cosmetics, fragrance and personal-care products.",
          "- Underwear, swimwear and earrings, unless still sealed.",
          "- Items made or altered to your order (custom sizes, printing, engraving).",
          "- Items marked “final sale”.",
          "- Items damaged by misuse, accidents or normal wear after delivery.",
        ] },
        { id: "how", heading: "How to return an item", body: [
          "1. Contact us with your order number and the item you want to return. We'll reply with a return reference within one business day.",
          "2. Pack the item securely and write the reference on the parcel.",
          "3. Drop it at our collection point in Mikocheni B, Dar es Salaam, or book a courier pickup if you're in another town.",
          "Please don't send items back without a return reference, as we may not be able to match them to your order.",
        ] },
        { id: "timing", heading: "How and when you're refunded", body: [
          "We inspect returned items within 3 business days of receiving them and email you the result. Approved refunds are sent within 5 business days, to the way you paid:",
          "- M-Pesa, Tigo Pesa, Airtel Money or HaloPesa: to the same phone number. It usually arrives the same day we send it.",
          "- Visa or Mastercard: to the same card. Banks take another 5–10 business days to show it.",
          "We pay any transaction fees on refunds. If your mobile money number has changed, tell us and we'll verify your identity before sending it elsewhere.",
        ] },
        { id: "discounts", heading: "Orders with a discount code", body: [
          "We refund what you actually paid. If you return part of an order that used a discount code, the discount is shared across the items in proportion to their prices. Discount codes themselves have no cash value.",
        ] },
        { id: "undeliverable", heading: "If we can't deliver", body: [
          "If the courier can't reach you after three attempts, or you don't collect a parcel from a pickup point within 14 days, it comes back to us. We then refund the item price minus the delivery costs, or redeliver once you've confirmed your details.",
        ] },
        { heading: "Questions or complaints", body: [
          "Contact us on {phone} (WhatsApp or call, {hours}) or {email}. If we can't resolve a complaint, you can contact the Fair Competition Commission (FCC), which handles consumer complaints in Tanzania.",
        ] },
      ],
    },
    sw: {
      title: "Sera ya kurejesha pesa",
      summary: "Lini unaweza kurudishiwa pesa zako, kiasi gani, na kwa haraka kiasi gani.",
      sections: [
        { heading: "Ahadi yetu", body: [
          "Oda yako ikipata tatizo, tunalirekebisha. Unarudishiwa pesa zote, pamoja na gharama za usafirishaji ulizolipa, bidhaa ikifika imeharibika, ina kasoro, si sahihi, haijakamilika, au isipofika kabisa. Ukibadilisha mawazo tu, unaweza kurudisha bidhaa ambazo hazijatumika ndani ya siku 14 tangu kufika.",
          "Sera hii ni nyongeza ya haki zako chini ya sheria za kumlinda mlaji Tanzania, ikiwemo Sheria ya Ushindani wa Haki ya mwaka 2003. Hakuna kilichoandikwa hapa kinachoondoa haki hizo.",
        ] },
        { id: "cancel", heading: "Kughairi oda", body: [
          "- Ndani ya saa 12 tangu kuagiza, kabla hatujanunua kiwandani: ghairi na urudishiwe pesa zote, pamoja na usafirishaji. Tutumie ujumbe WhatsApp au barua pepe ukiwa na namba ya oda.",
          "- Baada ya kununua kiwandani lakini kabla haijasafirishwa kutoka China: tutaomba kiwanda kighairi. Kikikubali, unarudishiwa pesa zote. Kisipokubali, oda inaendelea na unaweza kuirudisha kwa masharti ya kubadilisha mawazo hapo chini.",
          "- Ikishasafirishwa kutoka China, oda haiwezi kughairiwa, lakini bado unaweza kuirudisha baada ya kuipokea.",
        ] },
        { id: "faulty", heading: "Bidhaa iliyoharibika, yenye kasoro, isiyo sahihi au iliyopungua", body: [
          "Tujulishe ndani ya saa 48 tangu kufika na utume picha au video fupi ya tatizo (na ya kifungashio, kama kiliharibika). Chagua kubadilishiwa au kurudishiwa pesa zote, pamoja na usafirishaji ulioulipia. Hulipi chochote kurudisha bidhaa yenye kasoro au isiyo sahihi: tunaichukua au tunamlipa msafirishaji.",
          "Kasoro zinazojitokeza wakati wa matumizi ya kawaida zinalindwa na dhamana yetu ya ubora: siku 30 kwa bidhaa zote na miezi 6 kwa vifaa vya elektroniki. Angalia ukurasa wa Dhamana ya ubora.",
        ] },
        { id: "late", heading: "Oda iliyochelewa au kupotea", body: [
          "Oda yako isipofika siku 30 baada ya tarehe ya mwisho ya makadirio ya kufika, unaweza kuchagua kurudishiwa pesa zote (pamoja na usafirishaji) au kusubiri tunapoitafuta au kuituma upya. Mzigo ukithibitishwa kupotea, tunakurudishia pesa zote mara moja.",
        ] },
        { id: "change-of-mind", heading: "Umebadilisha mawazo?", body: [
          "Unaweza kurudisha bidhaa nyingi ndani ya siku 14 tangu kufika ikiwa:",
          "- hazijatumika wala kufuliwa, na lebo zote bado zipo;",
          "- ziko kwenye kifungashio cha awali, pamoja na vifaa vyote, maelekezo na zawadi;",
          "- kwa vifaa vya elektroniki, vimerudishwa kwenye mipangilio ya kiwandani na akaunti zako zimeondolewa.",
          "Tunakurudishia bei uliyolipia bidhaa, pamoja na VAT. Gharama za ndege au ndege ya haraka hazirudishwi kwa sababu ya kubadilisha mawazo, na unalipia kurudisha bidhaa (bure ukiileta kwenye kituo chetu cha Mikocheni). Usafirishaji wa meli ni bure, hivyo hakuna cha kukata.",
        ] },
        { id: "exceptions", heading: "Bidhaa tusizopokea isipokuwa zina kasoro", body: [
          "- Bidhaa za urembo, vipodozi, manukato na usafi wa mwili zilizofunguliwa.",
          "- Nguo za ndani, nguo za kuogelea na hereni, isipokuwa bado zimefungwa.",
          "- Bidhaa zilizotengenezwa au kubadilishwa kwa ombi lako (saizi maalum, uchapishaji, uchoraji).",
          "- Bidhaa zilizoandikwa “mauzo ya mwisho”.",
          "- Bidhaa zilizoharibika kwa matumizi mabaya, ajali au uchakavu wa kawaida baada ya kufika.",
        ] },
        { id: "how", heading: "Jinsi ya kurudisha bidhaa", body: [
          "1. Wasiliana nasi ukiwa na namba ya oda na bidhaa unayotaka kurudisha. Tutakujibu na namba ya marejesho ndani ya siku moja ya kazi.",
          "2. Funga bidhaa vizuri na uandike namba ya marejesho kwenye kifurushi.",
          "3. Ileta kwenye kituo chetu cha Mikocheni B, Dar es Salaam, au omba msafirishaji aichukue ukiwa mji mwingine.",
          "Tafadhali usirudishe bidhaa bila namba ya marejesho, kwani huenda tusiweze kuiunganisha na oda yako.",
        ] },
        { id: "timing", heading: "Jinsi na lini unarudishiwa pesa", body: [
          "Tunakagua bidhaa iliyorudishwa ndani ya siku 3 za kazi tangu kuipokea na kukutumia matokeo kwa barua pepe. Marejesho yaliyoidhinishwa yanatumwa ndani ya siku 5 za kazi, kwa njia uliyolipia:",
          "- M-Pesa, Tigo Pesa, Airtel Money au HaloPesa: kwa namba ileile ya simu. Kwa kawaida inafika siku ileile tunapoituma.",
          "- Visa au Mastercard: kwa kadi ileile. Benki huchukua siku 5–10 za kazi zaidi kuionyesha.",
          "Tunalipia ada zote za miamala ya marejesho. Kama namba yako ya pesa kwa simu imebadilika, tujulishe nasi tutathibitisha utambulisho wako kabla ya kutuma kwingine.",
        ] },
        { id: "discounts", heading: "Oda zilizotumia kodi ya punguzo", body: [
          "Tunarudisha kiasi ulicholipa kweli. Ukirudisha sehemu ya oda iliyotumia kodi ya punguzo, punguzo hugawanywa kwa bidhaa kulingana na bei zake. Kodi za punguzo zenyewe hazina thamani ya fedha taslimu.",
        ] },
        { id: "undeliverable", heading: "Tusipoweza kufikisha", body: [
          "Msafirishaji asipokupata baada ya majaribio matatu, au usipochukua mzigo kwenye kituo ndani ya siku 14, unarudi kwetu. Kisha tunakurudishia bei ya bidhaa ukiondoa gharama za kufikisha, au tunaufikisha tena ukishathibitisha taarifa zako.",
        ] },
        { heading: "Maswali au malalamiko", body: [
          "Wasiliana nasi kwa {phone} (WhatsApp au simu, {hours}) au {email}. Tusipoweza kutatua lalamiko lako, unaweza kuwasiliana na Tume ya Ushindani (FCC), inayoshughulikia malalamiko ya walaji Tanzania.",
        ] },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "warranty",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Quality guarantee",
      summary: "Every item is inspected before it ships, and covered if it turns out faulty.",
      sections: [
        { heading: "Checked before it leaves China", body: [
          "Every order is opened and checked at our Guangzhou warehouse: right item, right size and colour, no visible damage, and electronics powered on. Anything that fails is replaced before shipping, at our cost.",
        ] },
        { heading: "How long you're covered", body: [
          "- All items: 30 days from delivery against manufacturing faults.",
          "- Electronics (phone accessories, audio, wearables, small appliances): 6 months from delivery against manufacturing faults.",
          "A manufacturing fault is a problem with how the item was made or its materials, such as a seam that splits, a zip that fails, or a device that stops charging, under normal use.",
        ] },
        { heading: "What isn't covered", body: [
          "- Accidental damage, drops, liquid damage or misuse.",
          "- Normal wear and tear, fading or scuffs from use.",
          "- Repairs or changes made by someone other than us.",
          "- Batteries losing capacity gradually over time.",
        ] },
        { heading: "Making a claim", body: [
          "Send your order number, a description and a photo or video of the fault to {email} or WhatsApp {phone}. We'll repair it, replace it or refund you; if we can't do the first two, we refund in full. We pay to collect and return items under the guarantee.",
        ] },
      ],
    },
    sw: {
      title: "Dhamana ya ubora",
      summary: "Kila bidhaa inakaguliwa kabla ya kusafirishwa, na inalindwa ikigundulika kuwa na kasoro.",
      sections: [
        { heading: "Inakaguliwa kabla ya kutoka China", body: [
          "Kila oda inafunguliwa na kukaguliwa kwenye ghala letu la Guangzhou: bidhaa sahihi, saizi na rangi sahihi, haina uharibifu unaoonekana, na vifaa vya elektroniki vinawashwa. Isiyofaulu inabadilishwa kabla ya kusafirishwa, kwa gharama zetu.",
        ] },
        { heading: "Muda wa dhamana", body: [
          "- Bidhaa zote: siku 30 tangu kufika dhidi ya kasoro za utengenezaji.",
          "- Vifaa vya elektroniki (vifaa vya simu, sauti, saa janja, vifaa vidogo vya nyumbani): miezi 6 tangu kufika dhidi ya kasoro za utengenezaji.",
          "Kasoro ya utengenezaji ni tatizo la jinsi bidhaa ilivyotengenezwa au malighafi yake, kama mshono unaofumuka, zipu inayoharibika, au kifaa kinachoacha kuchaji, katika matumizi ya kawaida.",
        ] },
        { heading: "Kisicholindwa", body: [
          "- Uharibifu wa ajali, kuanguka, maji au matumizi mabaya.",
          "- Uchakavu wa kawaida, kufifia rangi au mikwaruzo ya matumizi.",
          "- Matengenezo au mabadiliko yaliyofanywa na mtu mwingine asiye sisi.",
          "- Betri kupungua uwezo taratibu kadri muda unavyopita.",
        ] },
        { heading: "Kudai dhamana", body: [
          "Tuma namba ya oda, maelezo na picha au video ya kasoro kwa {email} au WhatsApp {phone}. Tutaitengeneza, kuibadilisha au kukurudishia pesa; tusipoweza kufanya mawili ya kwanza, tunakurudishia pesa zote. Tunalipia kuchukua na kurudisha bidhaa zilizo chini ya dhamana.",
        ] },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "payments",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Payment policy",
      summary: "How you pay, when you're charged and how your payment is protected.",
      sections: [
        { heading: "Ways to pay", body: [
          "M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa and Mastercard. All prices are in Tanzanian shillings (TSh).",
        ] },
        { heading: "What you pay", body: [
          "Your total at checkout is final: item prices (including import duty and customs clearing), shipping, and VAT at 18%. There are no extra fees on delivery. If a discount code applies, it's taken off before VAT.",
        ] },
        { heading: "When you're charged", body: [
          "You pay when you place your order. For mobile money you'll get a prompt on your phone; your order is confirmed once you enter your PIN. If you don't confirm within 15 minutes, the order is cancelled and nothing is charged.",
          "If a price on our site is clearly wrong (for example an extra or missing zero), we'll contact you before processing the order, and you can pay the correct price or cancel for a full refund.",
        ] },
        { heading: "Keeping your payment safe", body: [
          "Payments are processed by licensed mobile money operators and a PCI-DSS certified card processor. We never see or store your full card number, CVV or mobile money PIN. We will never ask for your PIN by phone, SMS or WhatsApp. If someone does, it isn't us: please report it to {phone}.",
          "To prevent fraud we may check unusual orders before shipping them, for example by calling you. If we can't verify an order we cancel it and refund you in full.",
        ] },
        { heading: "Receipts", body: [
          "You'll get an order confirmation by email straight away, and a tax receipt once your payment is confirmed. You can also find every order under Orders in your account.",
        ] },
        { heading: "Payment problems", body: [
          "If money left your account but your order isn't confirmed, don't pay again. Send us the transaction ID and we'll match it or refund it within 2 business days. Refunds go back the same way you paid. See our Refund policy for details.",
        ] },
      ],
    },
    sw: {
      title: "Sera ya malipo",
      summary: "Jinsi unavyolipa, lini unatozwa na jinsi malipo yako yanavyolindwa.",
      sections: [
        { heading: "Njia za kulipa", body: [
          "M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa na Mastercard. Bei zote ni kwa shilingi za Tanzania (TSh).",
        ] },
        { heading: "Unacholipia", body: [
          "Jumla yako wakati wa malipo ndiyo ya mwisho: bei za bidhaa (pamoja na ushuru wa forodha na gharama za kutoa mzigo), usafirishaji, na VAT ya 18%. Hakuna ada za ziada mzigo ukifika. Kodi ya punguzo ikitumika, inaondolewa kabla ya VAT.",
        ] },
        { heading: "Lini unatozwa", body: [
          "Unalipa unapoweka oda. Kwa pesa kwa simu utapokea ombi kwenye simu yako; oda inathibitishwa ukiweka PIN yako. Usipothibitisha ndani ya dakika 15, oda inaghairiwa na hutozwi chochote.",
          "Bei kwenye tovuti yetu ikiwa na kosa la wazi (kwa mfano sifuri ya ziada au iliyopungua), tutawasiliana nawe kabla ya kushughulikia oda, nawe unaweza kulipa bei sahihi au kughairi na kurudishiwa pesa zote.",
        ] },
        { heading: "Usalama wa malipo yako", body: [
          "Malipo yanashughulikiwa na kampuni za pesa kwa simu zenye leseni na mchakataji wa kadi aliyethibitishwa PCI-DSS. Hatuoni wala kuhifadhi namba kamili ya kadi yako, CVV au PIN ya pesa kwa simu. Hatutakuomba PIN yako kwa simu, SMS au WhatsApp. Mtu akikuomba, si sisi: tafadhali ripoti kwa {phone}.",
          "Kuzuia udanganyifu tunaweza kukagua oda zisizo za kawaida kabla ya kuzisafirisha, kwa mfano kwa kukupigia simu. Tusipoweza kuithibitisha oda, tunaighairi na kukurudishia pesa zote.",
        ] },
        { heading: "Risiti", body: [
          "Utapokea uthibitisho wa oda kwa barua pepe mara moja, na risiti ya kodi malipo yakishathibitishwa. Unaweza pia kuona kila oda kwenye Oda ndani ya akaunti yako.",
        ] },
        { heading: "Matatizo ya malipo", body: [
          "Pesa zikitoka kwenye akaunti yako lakini oda haijathibitishwa, usilipe tena. Tutumie namba ya muamala nasi tutaiunganisha au kuirudisha ndani ya siku 2 za kazi. Marejesho yanarudi kwa njia uliyolipia. Angalia Sera ya kurejesha pesa kwa maelezo zaidi.",
        ] },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "terms",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Terms of service",
      summary: "The agreement between you and {brand} when you use our website and apps or buy from us.",
      sections: [
        { heading: "1. About us", body: [
          "{brand} is operated by {legal}, {address}. We sell products made by manufacturers in China and deliver them to customers in Tanzania. You can reach us on {phone} or {email}.",
          "By using our website or apps, or placing an order, you agree to these terms, our Refund policy, Payment policy, Privacy policy and Cookie policy.",
        ] },
        { heading: "2. Your account", body: [
          "You must be at least 18 years old, or have a parent or guardian's permission, to buy from us. Keep your password private; you're responsible for activity on your account. Tell us straight away if you think someone else has used it.",
          "We may suspend accounts used for fraud, abuse of promotions, or in breach of these terms.",
        ] },
        { heading: "3. Products and information", body: [
          "We describe products as accurately as we can, but colours vary between screens and many factories use Asian sizing, which can run small. Measurements and weights may differ slightly from those shown. Product reviews and questions are written by customers and reflect their own views.",
        ] },
        { heading: "4. Orders", body: [
          "Placing an order is an offer to buy. A contract is formed when we email you an order confirmation after your payment is received. We may decline or cancel an order, with a full refund, if an item is unavailable from the factory, a price was clearly wrong, or we suspect fraud.",
        ] },
        { heading: "5. Prices and payment", body: [
          "Prices are in Tanzanian shillings and include import duty and customs clearing. Shipping and VAT (18%) are added at checkout before you pay. Discount codes must be used before they expire, can't be exchanged for cash and are limited to one per order. See our Payment policy for how payments work.",
        ] },
        { heading: "6. Shipping and delivery", body: [
          "Delivery times are estimates that depend on factories, carriers and customs. We'll keep you updated at every stage. Ownership of the goods passes to you when you've paid; risk of loss or damage passes to you when the goods are delivered to you or your chosen pickup point.",
          "You're responsible for giving a correct address and phone number. See our Shipping page for methods, prices and coverage.",
        ] },
        { heading: "7. Cancellations, returns and refunds", body: [
          "Your rights to cancel, return items and get refunds are set out in our Refund policy and Quality guarantee, which form part of these terms.",
        ] },
        { heading: "8. Using our services fairly", body: [
          "Don't misuse our website or apps: no attempts to break security, scrape data, place fake orders, abuse discount codes, or post unlawful, offensive or misleading reviews or questions. We may remove content that breaks these rules.",
        ] },
        { heading: "9. Intellectual property", body: [
          "Our name, logo, website design, photos and text belong to {legal} or our licensors. You may not copy or reuse them for commercial purposes without our written permission. Manufacturer brand names belong to their owners.",
        ] },
        { heading: "10. Our responsibility to you", body: [
          "We're responsible for losses you suffer that are a foreseeable result of us breaking these terms or failing to use reasonable care. We're not responsible for losses that weren't foreseeable, business losses, or delays caused by events outside our control, such as port congestion, strikes, natural disasters or changes in law.",
          "Except where the law doesn't allow it, our total liability for any order is limited to the amount you paid for it. Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or your statutory rights as a consumer.",
        ] },
        { heading: "11. Changes to these terms", body: [
          "We may update these terms from time to time; the date at the top shows the latest version. The terms in force when you placed an order apply to that order.",
        ] },
        { heading: "12. Law and disputes", body: [
          "These terms are governed by the laws of the United Republic of Tanzania. If you have a complaint, contact us first. We aim to resolve it within 14 days. You can also contact the Fair Competition Commission. Any dispute we can't resolve may be taken to the courts of Tanzania.",
        ] },
      ],
    },
    sw: {
      title: "Masharti ya huduma",
      summary: "Makubaliano kati yako na {brand} unapotumia tovuti na programu zetu au kununua kwetu.",
      sections: [
        { heading: "1. Kuhusu sisi", body: [
          "{brand} inaendeshwa na {legal}, {address}. Tunauza bidhaa zinazotengenezwa na viwanda vya China na kuzifikisha kwa wateja Tanzania. Unaweza kutupata kwa {phone} au {email}.",
          "Kwa kutumia tovuti au programu zetu, au kuweka oda, unakubali masharti haya, Sera ya kurejesha pesa, Sera ya malipo, Sera ya faragha na Sera ya vidakuzi.",
        ] },
        { heading: "2. Akaunti yako", body: [
          "Lazima uwe na umri wa miaka 18 au zaidi, au uwe na ruhusa ya mzazi au mlezi, ili kununua kwetu. Weka nenosiri lako siri; unawajibika kwa yanayofanyika kwenye akaunti yako. Tujulishe mara moja ukidhani mtu mwingine ameitumia.",
          "Tunaweza kusimamisha akaunti zinazotumika kwa udanganyifu, matumizi mabaya ya ofa, au kukiuka masharti haya.",
        ] },
        { heading: "3. Bidhaa na taarifa", body: [
          "Tunaeleza bidhaa kwa usahihi kadri tuwezavyo, lakini rangi hutofautiana kati ya skrini na viwanda vingi hutumia saizi za Asia, ambazo zinaweza kuwa ndogo. Vipimo na uzito vinaweza kutofautiana kidogo na vilivyoonyeshwa. Maoni na maswali ya bidhaa yameandikwa na wateja na ni mitazamo yao.",
        ] },
        { heading: "4. Oda", body: [
          "Kuweka oda ni ombi la kununua. Mkataba unakamilika tunapokutumia barua pepe ya kuthibitisha oda baada ya kupokea malipo yako. Tunaweza kukataa au kughairi oda, na kukurudishia pesa zote, ikiwa bidhaa haipatikani kiwandani, bei ilikuwa na kosa la wazi, au tunashuku udanganyifu.",
        ] },
        { heading: "5. Bei na malipo", body: [
          "Bei ni kwa shilingi za Tanzania na zinajumuisha ushuru wa forodha na gharama za kutoa mzigo. Usafirishaji na VAT (18%) huongezwa wakati wa malipo kabla hujalipa. Kodi za punguzo lazima zitumike kabla hazijaisha muda, haziwezi kubadilishwa kuwa pesa taslimu na ni moja tu kwa oda. Angalia Sera ya malipo kujua jinsi malipo yanavyofanya kazi.",
        ] },
        { heading: "6. Usafirishaji na kufikisha", body: [
          "Muda wa kufika ni makadirio yanayotegemea viwanda, wasafirishaji na forodha. Tutakujulisha kila hatua. Umiliki wa bidhaa unahamia kwako ukishalipa; hatari ya kupotea au kuharibika inahamia kwako bidhaa zikikufikia wewe au kituo ulichochagua.",
          "Unawajibika kutoa anwani na namba ya simu sahihi. Angalia ukurasa wa Usafirishaji kwa njia, bei na maeneo tunayofikisha.",
        ] },
        { heading: "7. Kughairi, kurudisha na kurejesha pesa", body: [
          "Haki zako za kughairi, kurudisha bidhaa na kurudishiwa pesa zimeelezwa kwenye Sera ya kurejesha pesa na Dhamana ya ubora, ambazo ni sehemu ya masharti haya.",
        ] },
        { heading: "8. Kutumia huduma zetu kwa haki", body: [
          "Usitumie vibaya tovuti au programu zetu: usijaribu kuvunja usalama, kunakili data, kuweka oda za uongo, kutumia vibaya kodi za punguzo, au kuweka maoni au maswali yasiyo halali, ya matusi au ya kupotosha. Tunaweza kuondoa maudhui yanayokiuka sheria hizi.",
        ] },
        { heading: "9. Haki miliki", body: [
          "Jina letu, nembo, muundo wa tovuti, picha na maandishi ni mali ya {legal} au walioturuhusu. Huruhusiwi kuyanakili au kuyatumia kibiashara bila ruhusa yetu ya maandishi. Majina ya chapa za watengenezaji ni mali ya wamiliki wake.",
        ] },
        { heading: "10. Wajibu wetu kwako", body: [
          "Tunawajibika kwa hasara unazopata zinazotarajiwa kutokana na sisi kukiuka masharti haya au kutokuwa makini ipasavyo. Hatuwajibiki kwa hasara zisizotarajiwa, hasara za kibiashara, au ucheleweshaji unaosababishwa na mambo yaliyo nje ya uwezo wetu, kama msongamano bandarini, migomo, majanga ya asili au mabadiliko ya sheria.",
          "Isipokuwa pale sheria isiporuhusu, jumla ya wajibu wetu kwa oda yoyote ni kiasi ulicholipia oda hiyo. Hakuna kilichomo kwenye masharti haya kinachopunguza wajibu kwa kifo au majeraha yaliyosababishwa na uzembe, kwa udanganyifu, au haki zako za kisheria kama mlaji.",
        ] },
        { heading: "11. Mabadiliko ya masharti haya", body: [
          "Tunaweza kubadilisha masharti haya mara kwa mara; tarehe iliyo juu inaonyesha toleo la karibuni. Masharti yaliyokuwa yakitumika ulipoweka oda ndiyo yanayohusu oda hiyo.",
        ] },
        { heading: "12. Sheria na migogoro", body: [
          "Masharti haya yanaongozwa na sheria za Jamhuri ya Muungano wa Tanzania. Ukiwa na lalamiko, wasiliana nasi kwanza. Tunalenga kulitatua ndani ya siku 14. Unaweza pia kuwasiliana na Tume ya Ushindani (FCC). Mgogoro wowote tusioweza kuutatua unaweza kupelekwa kwenye mahakama za Tanzania.",
        ] },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "privacy",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Privacy policy",
      summary: "What personal data we collect, why, who we share it with, and your rights.",
      sections: [
        { heading: "Who we are", body: [
          "{legal} ({brand}), {address}, is responsible for your personal data. We handle it in line with the Personal Data Protection Act, 2022 of Tanzania. For any privacy question or request, contact {email}.",
        ] },
        { heading: "What we collect", body: [
          "- Account details: name, email, phone number, password (stored only in encrypted, hashed form) and, if you add one, a profile photo.",
          "- Order details: delivery addresses, items bought, order history, discount codes used and messages with our team.",
          "- Payment details: payment method type, card brand and last four digits, mobile money number and transaction IDs. We never receive your full card number, CVV or PIN.",
          "- Activity: products you view while signed in, your wishlist and bag, reviews and questions you post, and your language and marketing preferences.",
          "- Technical data: device and browser type, and the cookies described in our Cookie policy. We don't use advertising or third-party tracking cookies.",
        ] },
        { heading: "Why we use it", body: [
          "- To create your account, take payment, and buy, ship, clear and deliver your orders (performing our contract with you).",
          "- To give support, process returns and refunds, and prevent fraud (our legitimate interests and contract).",
          "- To keep tax and accounting records (legal obligation).",
          "- To recommend products based on what you've viewed or bought (legitimate interests; you can clear your recently viewed list at any time).",
          "- To send offers and newsletters, only if you opt in. You can unsubscribe at any time in Settings or from any email (consent).",
        ] },
        { heading: "Who we share it with", body: [
          "We never sell your personal data. We share only what's needed with:",
          "- delivery couriers and pickup points in Tanzania (name, phone, delivery address);",
          "- customs clearing agents, where the law requires import details;",
          "- mobile money operators and our card processor, to take and refund payments;",
          "- our technology providers, who host our database, store files and send emails on our behalf under contracts that protect your data;",
          "- authorities such as the Tanzania Revenue Authority or the police, when the law requires it.",
          "Factories in China receive product and quantity details only, not your name or address.",
        ] },
        { heading: "Storage outside Tanzania", body: [
          "Some of our technology providers store data on secure servers outside Tanzania. When this happens we make sure your data gets a level of protection that meets the requirements of the Personal Data Protection Act, through contracts and security safeguards.",
        ] },
        { heading: "How long we keep it", body: [
          "We keep your account data while your account is open. Order and payment records are kept for as long as Tanzanian tax and accounting law requires, even after you close your account. Marketing preferences are kept until you change them. When data is no longer needed we delete or anonymise it.",
        ] },
        { heading: "How we protect it", body: [
          "Encrypted connections (HTTPS), hashed passwords, strict access controls so that each team member can see only what their role needs, and row-level security in our database so customers can only ever see their own data.",
        ] },
        { heading: "Your rights", body: [
          "You can ask us to give you a copy of your data, correct it, delete it, or stop using it for marketing or recommendations. You can update most details yourself in your account. To make any other request, email {email}. We'll reply within 30 days, and may need to verify your identity first.",
          "If you're not happy with how we've handled your data, you can complain to the Personal Data Protection Commission (PDPC) of Tanzania.",
        ] },
        { heading: "Children", body: [
          "Our services are for adults. We don't knowingly collect data from children under 18 without a parent or guardian's consent.",
        ] },
        { heading: "Changes", body: [
          "We'll post any changes here and update the date at the top. If a change is significant, we'll tell you by email or in the app.",
        ] },
      ],
    },
    sw: {
      title: "Sera ya faragha",
      summary: "Taarifa binafsi tunazokusanya, kwa nini, tunawashirikisha nani, na haki zako.",
      sections: [
        { heading: "Sisi ni nani", body: [
          "{legal} ({brand}), {address}, ndiye anayehusika na taarifa zako binafsi. Tunazishughulikia kwa mujibu wa Sheria ya Ulinzi wa Taarifa Binafsi ya mwaka 2022 ya Tanzania. Kwa swali au ombi lolote kuhusu faragha, wasiliana na {email}.",
        ] },
        { heading: "Tunachokusanya", body: [
          "- Taarifa za akaunti: jina, barua pepe, namba ya simu, nenosiri (linalohifadhiwa kwa njia fiche tu) na, ukiiweka, picha ya wasifu.",
          "- Taarifa za oda: anwani za kufikishia, bidhaa ulizonunua, historia ya oda, kodi za punguzo ulizotumia na mawasiliano na timu yetu.",
          "- Taarifa za malipo: aina ya njia ya malipo, chapa ya kadi na tarakimu nne za mwisho, namba ya pesa kwa simu na namba za miamala. Hatupokei namba kamili ya kadi, CVV wala PIN.",
          "- Shughuli: bidhaa unazotazama ukiwa umeingia, orodha ya unavyopenda na kikapu, maoni na maswali unayoweka, na mapendeleo yako ya lugha na matangazo.",
          "- Taarifa za kiufundi: aina ya kifaa na kivinjari, na vidakuzi vilivyoelezwa kwenye Sera ya vidakuzi. Hatutumii vidakuzi vya matangazo wala vya kufuatilia vya watu wengine.",
        ] },
        { heading: "Kwa nini tunazitumia", body: [
          "- Kufungua akaunti yako, kupokea malipo, na kununua, kusafirisha, kutoa forodhani na kufikisha oda zako (kutekeleza mkataba wetu nawe).",
          "- Kutoa huduma kwa wateja, kushughulikia marejesho na kuzuia udanganyifu (maslahi yetu halali na mkataba).",
          "- Kutunza kumbukumbu za kodi na hesabu (wajibu wa kisheria).",
          "- Kupendekeza bidhaa kulingana na ulichotazama au kununua (maslahi halali; unaweza kufuta orodha ya ulivyotazama wakati wowote).",
          "- Kukutumia ofa na jarida, ukikubali tu. Unaweza kujiondoa wakati wowote kwenye Mipangilio au kwenye barua pepe yoyote (ridhaa).",
        ] },
        { heading: "Tunawashirikisha nani", body: [
          "Hatuuzi kamwe taarifa zako binafsi. Tunashiriki kinachohitajika tu na:",
          "- wasafirishaji na vituo vya kuchukulia mizigo Tanzania (jina, simu, anwani ya kufikishia);",
          "- mawakala wa forodha, pale sheria inapohitaji taarifa za uingizaji;",
          "- kampuni za pesa kwa simu na mchakataji wetu wa kadi, kupokea na kurejesha malipo;",
          "- watoa huduma zetu za teknolojia wanaohifadhi kanzidata, mafaili na kutuma barua pepe kwa niaba yetu chini ya mikataba inayolinda taarifa zako;",
          "- mamlaka kama Mamlaka ya Mapato Tanzania au polisi, pale sheria inapotaka.",
          "Viwanda vya China vinapokea taarifa za bidhaa na idadi tu, si jina wala anwani yako.",
        ] },
        { heading: "Kuhifadhi nje ya Tanzania", body: [
          "Baadhi ya watoa huduma zetu za teknolojia huhifadhi taarifa kwenye seva salama nje ya Tanzania. Hili linapotokea tunahakikisha taarifa zako zinapata kiwango cha ulinzi kinachokidhi Sheria ya Ulinzi wa Taarifa Binafsi, kupitia mikataba na hatua za usalama.",
        ] },
        { heading: "Tunazihifadhi kwa muda gani", body: [
          "Tunahifadhi taarifa za akaunti yako akaunti ikiwa wazi. Kumbukumbu za oda na malipo zinahifadhiwa kwa muda unaotakiwa na sheria za kodi na hesabu za Tanzania, hata baada ya kufunga akaunti. Mapendeleo ya matangazo yanahifadhiwa hadi uyabadilishe. Taarifa zisipohitajika tena tunazifuta au kuziondolea utambulisho.",
        ] },
        { heading: "Tunavyozilinda", body: [
          "Miunganisho iliyosimbwa (HTTPS), manenosiri yaliyofichwa, udhibiti mkali wa ufikiaji ili kila mfanyakazi aone kinachohitajika na nafasi yake tu, na usalama wa ngazi ya safu kwenye kanzidata yetu ili wateja waone taarifa zao pekee.",
        ] },
        { heading: "Haki zako", body: [
          "Unaweza kutuomba nakala ya taarifa zako, kuzirekebisha, kuzifuta, au kuacha kuzitumia kwa matangazo au mapendekezo. Unaweza kubadilisha taarifa nyingi mwenyewe kwenye akaunti yako. Kwa ombi lingine lolote, tuma barua pepe kwa {email}. Tutajibu ndani ya siku 30, na huenda tukahitaji kuthibitisha utambulisho wako kwanza.",
          "Usiporidhika na jinsi tulivyoshughulikia taarifa zako, unaweza kuwasilisha lalamiko kwa Tume ya Ulinzi wa Taarifa Binafsi (PDPC) ya Tanzania.",
        ] },
        { heading: "Watoto", body: [
          "Huduma zetu ni kwa watu wazima. Hatukusanyi kwa makusudi taarifa za watoto walio chini ya miaka 18 bila ridhaa ya mzazi au mlezi.",
        ] },
        { heading: "Mabadiliko", body: [
          "Tutaweka mabadiliko yoyote hapa na kubadilisha tarehe iliyo juu. Mabadiliko yakiwa makubwa, tutakujulisha kwa barua pepe au kwenye programu.",
        ] },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------------------------
  {
    slug: "cookies",
    kind: "policy",
    updated: POLICY_UPDATED,
    en: {
      title: "Cookie policy",
      summary: "The small files and browser storage we use, and why. No advertising trackers.",
      sections: [
        { heading: "What we use", body: [
          "Cookies are small files a website stores in your browser. We also use your browser's local storage, which works in a similar way. We only use what's needed to run the shop. We don't use advertising cookies, and we don't let third parties track you on our site.",
        ] },
        { heading: "Essential cookies", body: [
          "- Sign-in session (sb-…): keeps you signed in securely. Removed when you sign out.",
          "- Language (herufi-locale): remembers English or Kiswahili. Kept for one year.",
        ] },
        { heading: "Local storage on your device", body: [
          "- Your bag and wishlist, so they're still there when you come back, even before you sign in.",
          "- Recently viewed products and recent searches, to help you find things again.",
          "- Your chosen delivery method, discount code and light/dark theme.",
          "This information stays on your device. When you sign in, your bag and wishlist are saved to your account so they follow you to other devices.",
        ] },
        { heading: "Managing them", body: [
          "You can delete cookies and site data in your browser settings at any time. If you block essential cookies you won't be able to sign in or check out. Clearing local storage empties your bag and wishlist on that device (but not those saved in your account).",
        ] },
        { heading: "Changes", body: [
          "If we ever add analytics or other cookies, we'll update this page first and ask for your consent where required.",
        ] },
      ],
    },
    sw: {
      title: "Sera ya vidakuzi",
      summary: "Mafaili madogo na hifadhi ya kivinjari tunayotumia, na kwa nini. Hakuna ufuatiliaji wa matangazo.",
      sections: [
        { heading: "Tunachotumia", body: [
          "Vidakuzi (cookies) ni mafaili madogo ambayo tovuti huhifadhi kwenye kivinjari chako. Pia tunatumia hifadhi ya ndani ya kivinjari (local storage), inayofanya kazi kwa namna inayofanana. Tunatumia kinachohitajika kuendesha duka tu. Hatutumii vidakuzi vya matangazo, wala hatuwaruhusu watu wengine kukufuatilia kwenye tovuti yetu.",
        ] },
        { heading: "Vidakuzi muhimu", body: [
          "- Kipindi cha kuingia (sb-…): kinakuweka umeingia kwa usalama. Kinaondolewa ukitoka.",
          "- Lugha (herufi-locale): kinakumbuka Kiingereza au Kiswahili. Kinahifadhiwa kwa mwaka mmoja.",
        ] },
        { heading: "Hifadhi ya ndani kwenye kifaa chako", body: [
          "- Kikapu na orodha ya unavyopenda, ili viwepo ukirudi, hata kabla ya kuingia.",
          "- Bidhaa ulizotazama hivi karibuni na utafutaji wa hivi karibuni, kukusaidia kupata vitu tena.",
          "- Njia ya usafirishaji uliyochagua, kodi ya punguzo na mandhari ya mwanga/giza.",
          "Taarifa hizi zinabaki kwenye kifaa chako. Ukiingia, kikapu na orodha ya unavyopenda huhifadhiwa kwenye akaunti yako ili vikufuate kwenye vifaa vingine.",
        ] },
        { heading: "Kuvisimamia", body: [
          "Unaweza kufuta vidakuzi na data ya tovuti kwenye mipangilio ya kivinjari chako wakati wowote. Ukizuia vidakuzi muhimu hutaweza kuingia wala kulipa. Kufuta hifadhi ya ndani kunaondoa kikapu na orodha ya unavyopenda kwenye kifaa hicho (lakini si vilivyohifadhiwa kwenye akaunti yako).",
        ] },
        { heading: "Mabadiliko", body: [
          "Tukiongeza takwimu au vidakuzi vingine, tutasasisha ukurasa huu kwanza na kuomba ridhaa yako pale inapohitajika.",
        ] },
      ],
    },
  },
];
