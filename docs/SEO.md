# Herufi: SEO, AEO and GEO plan

Herufi sells factory-direct products from China, delivered to Tanzania, in English and Kiswahili.
The goal is to be **the answer** when Tanzanians search for (or ask an AI about) buying from China.

- **SEO** (search engine optimization): rank in Google and Bing.
- **AEO** (answer engine optimization): be the snippet, the "People also ask" answer and the voice answer.
- **GEO** (generative engine optimization): be cited by ChatGPT, Claude, Perplexity, Gemini and Copilot.

## 1. Positioning in one sentence

Use this sentence everywhere (site, Google Business Profile, social bios, PR) so search and AI engines learn one consistent fact about the brand:

> **EN:** Herufi is a Tanzanian online store that buys directly from verified factories in China and delivers to your door, with free sea shipping, customs handled and payment by M-Pesa or card.
>
> **SW:** Herufi ni duka la mtandaoni la Tanzania linalonunua moja kwa moja kutoka viwanda vilivyothibitishwa China na kukuletea mlangoni, kwa usafirishaji wa meli bure, ushuru tunashughulikia na malipo kwa M-Pesa au kadi.

## 2. Keyword targets

| Intent | English | Kiswahili | Target page |
|---|---|---|---|
| Brand / head | buy from China Tanzania, online shopping Tanzania | nunua kutoka China, manunuzi mtandaoni Tanzania | Home |
| Shipping cost | shipping from China to Tanzania cost, cargo China to Dar es Salaam price | gharama za usafirishaji China hadi Tanzania, bei ya cargo China | Guide, /help/shipping |
| Shipping time | how long shipping from China to Tanzania | mzigo kutoka China unachukua muda gani | Guide, home FAQ |
| How-to | how to import from China to Tanzania, how to order from China | jinsi ya kuagiza mzigo kutoka China | Guide |
| Customs | customs duty Tanzania imports from China, TRA import tax | ushuru wa forodha Tanzania | Guide, FAQ |
| Payment | pay with M-Pesa online shopping | lipa kwa M-Pesa | Home FAQ, /help/faq |
| Category | electronics / fashion / furniture from China Tanzania | elektroniki / mitindo / samani kutoka China | /categories/* |
| Product | "[product] price in Tanzania" | "bei ya [product] Tanzania" | /products/* |

Product titles follow `[Product]: Price in Tanzania`. That's the exact way people search ("iPhone price in Tanzania"), and it's what's implemented.

## 3. What is implemented in the code

**Technical SEO**
- Unique titles and descriptions for every page type, in both languages (`src/lib/seo-content.ts`).
- Crawlable Kiswahili: any URL with `?lang=sw` renders in Kiswahili without cookies, and each page declares `hreflang` alternates (`en-TZ`, `sw-TZ`, `x-default`) plus a self-referencing canonical (`src/lib/seo.ts`).
- Filtered, sorted and search result pages consolidate to the clean listing via canonical; search results are `noindex`.
- `sitemap.xml` lists every public page in both languages, with product and category images.
- `robots.txt` keeps account, checkout and admin pages out of the index.
- Server-rendered HTML, fast CDN images, a web manifest, Open Graph images and local geo meta (Dar es Salaam).

**Structured data (schema.org JSON-LD)**
- `OnlineStore` organization on every page: logo, contact, address, area served (TZ), languages, currency (TZS), payment methods and return policy.
- `WebSite` with a sitelinks `SearchAction`.
- `Product` with `Offer` (price in TZS, availability), `shippingDetails` per available method (real price and transit days) and `hasMerchantReturnPolicy` (14 days, free), plus `aggregateRating`, `review`, weight and country of origin. This is what Google's free merchant listings and shopping rich results use.
- `BreadcrumbList` on navigable pages, `ItemList` on category and listing pages.
- `FAQPage` on the homepage FAQ, the buying guide and /help/faq; `Article` and `HowTo` on the guide.

**AEO (answer-first content)**
- A homepage FAQ, "Questions Tanzanian shoppers ask", in both languages. Each answer starts with a one-sentence direct answer, then the detail.
- The buying guide (`/guides/buy-from-china-to-tanzania`) opens with "The short answer" box, then numbered steps, a cost table, worked examples, a customs explanation and a comparison table: formats answer engines lift directly.
- Prices and delivery times in all of that copy come from the live `shipping_rates` table, so answers never contradict checkout.

**GEO (being cited by AI assistants)**
- `/llms.txt`: a plain-language fact sheet (business, policies, live shipping prices, categories, best sellers, FAQ) following the llms.txt convention, regenerated hourly from the database.
- `robots.txt` explicitly allows AI search and answer crawlers (OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bingbot).
- Quotable, specific facts (numbers, days, prices, place names), a comparison table and a clear entity description: the things generative engines prefer to cite.
- Consistent entity data (name, logo, address, phone, email, languages) across the schema, the footer, the help pages and llms.txt.

## 4. What only you can do (off-site)

These matter as much as the code. Do them in this order:

1. **Domain & Search Console.** Put the site on its final domain (set `NEXT_PUBLIC_SITE_URL`), verify it in Google Search Console and Bing Webmaster Tools, and submit `/sitemap.xml`. Bing also feeds ChatGPT and Copilot search.
2. **Google Business Profile** for the Dar es Salaam collection point, using the exact name, address and phone that appear on the site. Collect reviews there.
3. **Real contact details.** Replace the placeholder phone, email and address in `src/lib/constants.ts` and the help pages with your real ones before launch. Search and AI engines cross-check them.
4. **Social profiles** (Instagram, TikTok, Facebook, X, LinkedIn) using the positioning sentence above. Then add their URLs as `sameAs` in the `OnlineStore` schema in `src/app/(shop)/layout.tsx`.
5. **Mentions and links** from Tanzanian sources: tech and business blogs, JamiiForums threads, YouTube unboxings, local news ("new way to import from China"). AI engines weigh third-party mentions heavily.
6. **Reviews.** Ask every delivered customer for a product review. Reviews feed `aggregateRating`, Google stars and AI answers about trust.
7. **Google Merchant Center.** Register the store. The Product schema with shipping and returns is already in place, so products can appear in free Shopping listings.

## 5. Content plan (next 3 months)

Publish one guide every two weeks, in both languages, using the existing guide as the template (short answer box, steps, table, FAQ):

1. Air cargo vs sea freight from China: which is cheaper for you? (with worked examples)
2. How Tanzanian customs and VAT work when you buy from China
3. Furniture from China to Tanzania: what it really costs to ship a sofa
4. Is it safe to buy from China? How factory verification works
5. Best phones/electronics from China under TSh 500,000 (category roundup)
6. Wholesale for shop owners: buying in bulk from China (if you add B2B)

Refresh the date and numbers in each guide whenever rates change. The guide already pulls live prices.

## 6. Measure

- Search Console: impressions and clicks for the section 2 keywords, rich result reports (Products, FAQ, Merchant listings).
- Ask ChatGPT, Perplexity, Claude and Gemini monthly, in both languages: *"How do I buy from China and ship to Tanzania?"*, *"Shipping cost China to Dar es Salaam"*, *"Nunua kutoka China"*. Note whether Herufi is cited, then fix the gaps.
- Validate structured data with Google's Rich Results Test after any template change.
