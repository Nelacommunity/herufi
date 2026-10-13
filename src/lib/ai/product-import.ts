import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import sharp, { type Metadata } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MULTIPLIER, DEFAULT_ROUNDING, tzsFromCny, type PricingRule } from "@/lib/ai/pricing";
import { getCnyToTzs } from "@/lib/ai/fx";
import { slugify } from "@/lib/utils";
import { OPTION_SEP } from "@/lib/variant-options";

/**
 * AI product import: shop screenshots (e.g. Pinduoduo) → product drafts priced in TSh.
 *
 * 1. Gemini reads the screenshots and returns structured JSON (titles, ¥ prices, colours/sizes, photo positions).
 * 2. Prices are converted at the live CNY→TZS rate and multiplied by the markup.
 * 3. The product photos are cropped out of the screenshots (never the whole screenshot, so addresses and
 *    other personal details in the app's UI are not uploaded) and stored in the product-images bucket.
 * The result is a draft for an admin to review; nothing is published by this module.
 */

// ---- What Gemini returns ----------------------------------------------------------------------------------------

type Box = { image: number; box: number[] }; // box = [ymin, xmin, ymax, xmax], each 0–1000
type AiProduct = {
  screenshots: number[];
  title: string;
  description: string;
  highlights: string[];
  specifications: { label: string; value: string }[];
  category_slug: string;
  price_cny: number;
  original_price_cny: number | null;
  colours: { name: string; photo: Box | null }[];
  sizes: { name: string }[];
  combinations: { colour: string; size: string; price_cny: number }[];
  photos: Box[];
  weight_kg: number;
  box_cm: { length: number; width: number; height: number };
  brand_risk: { flagged: boolean; reason: string };
  notes: string;
};
type AiResult = { products: AiProduct[] };

const BOX = {
  type: "object",
  properties: {
    image: { type: "integer", description: "0-based index of the screenshot" },
    box: { type: "array", items: { type: "integer" }, minItems: 4, maxItems: 4, description: "[ymin, xmin, ymax, xmax] normalised to 0-1000" },
  },
  required: ["image", "box"],
};

const SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          screenshots: { type: "array", items: { type: "integer" }, description: "Indexes of the screenshots that show this product" },
          title: { type: "string", description: "Clean English product name, max 80 characters, no third-party brand names" },
          description: { type: "string", description: "2-4 sentence English description for Tanzanian shoppers" },
          highlights: { type: "array", items: { type: "string" }, description: "3-6 short bullet points" },
          specifications: { type: "array", items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } }, required: ["label", "value"] } },
          category_slug: { type: "string", description: "One of the given category slugs, or empty string" },
          price_cny: { type: "number", description: "Lowest price actually charged, in yuan" },
          original_price_cny: { type: ["number", "null"], description: "Struck-through original price in yuan, if shown" },
          colours: { type: "array", items: { type: "object", properties: { name: { type: "string" }, photo: { anyOf: [BOX, { type: "null" }] } }, required: ["name", "photo"] } },
          sizes: { type: "array", items: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
          combinations: {
            type: "array",
            description: "Every colour/size combination that is listed, with its price in yuan. Use empty string for colour or size when the product has only one of them.",
            items: { type: "object", properties: { colour: { type: "string" }, size: { type: "string" }, price_cny: { type: "number" } }, required: ["colour", "size", "price_cny"] },
          },
          photos: { type: "array", items: BOX, description: "Clean product photos (main image first)" },
          weight_kg: { type: "number", description: "Estimated packed weight in kg" },
          box_cm: { type: "object", properties: { length: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["length", "width", "height"] },
          brand_risk: { type: "object", properties: { flagged: { type: "boolean" }, reason: { type: "string" } }, required: ["flagged", "reason"] },
          notes: { type: "string", description: "Anything the admin should double-check, or empty string" },
        },
        required: ["screenshots", "title", "description", "highlights", "specifications", "category_slug", "price_cny", "original_price_cny", "colours", "sizes", "combinations", "photos", "weight_kg", "box_cm", "brand_risk", "notes"],
      },
    },
  },
  required: ["products"],
};

function prompt(categories: { slug: string; name: string }[]) {
  return `You are a product-listing assistant for Herufi, an online shop that imports products from China and sells them in Tanzania.
The images are screenshots from a Chinese shopping app (usually Pinduoduo). Read them and describe the product(s) as JSON.

Rules:
- Several screenshots can show the same product (main page, option picker, checkout). Group them; return one product per distinct item.
- Prices: use yuan (¥) numbers exactly as shown. price_cny is the lowest price a buyer actually pays (discount / "shipping included" / "Buy now" price), not the crossed-out one. original_price_cny is the crossed-out or "Original Price" value, else null.
- Options: split option labels into a colour and a size when both are present (e.g. "Large size pink [Crystal pendant included]" → colour "Pink", size "Large"). Use short names ("Pink", "Black", "Large", "Medium", "M", "XL"). Drop marketing text like "[Shop owner's recommendation]". Never use "/" in names.
- List every combination you can see in combinations with its own yuan price. If only one price is visible for a size, use it for every colour in that size. If the product has no options, return empty colours, sizes and combinations.
- Photos: give bounding boxes of the clean product photo areas only. Exclude the phone status bar, buttons, prices, text banners, video overlays and the app's UI. For each colour, if a thumbnail or photo of that colour is visible, give its box.
- Write the title and description in clear English for shoppers. Translate Chinese. Do not copy shop hype ("#1 best seller", "36K sold").
- Never put another company's brand name in the title, description or highlights (for example do not write Chanel, Gucci, Louis Vuitton, Nike, Apple). Describe the style instead ("quilted chain shoulder bag").
- brand_risk.flagged must be true if the product shows a famous brand's logo or name, or the listing says it is in the style of a famous brand; explain in reason. Otherwise false with empty reason.
- IGNORE personal information completely: names, phone numbers, delivery addresses, chats, reviews and buyer avatars. Never include them anywhere in the output.
- category_slug must be one of: ${categories.map((c) => `${c.slug} (${c.name})`).join(", ") || "none available"}; empty string if none fits.
- weight_kg and box_cm are your best estimate of the packed parcel for shipping; mention in notes that they are estimates if unsure.
- Use notes for anything an admin should check (unclear prices, missing sizes, low-quality photos).`;
}

// ---- Public types --------------------------------------------------------------------------------------------------

export type ImportImage = { data: Buffer; mimeType: string };

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  details: string[];
  specifications: Record<string, string>;
  category_id: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  images: { image_url: string; alt_text: string }[];
  variants: { name: string; value: string; additional_price: number; stock_quantity: number; image_url: string | null }[];
  source: { price_cny: number; original_price_cny: number | null; screenshots: number[] };
  warnings: string[];
};

export type ImportResult = {
  products: ProductDraft[];
  pricing: { rate: number; rateSource: "live" | "fallback"; rateUpdatedAt: string | null; multiplier: number; rounding: number };
  model: string;
};

export class ImportError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

// ---- Main entry point ----------------------------------------------------------------------------------------------

export async function importFromScreenshots(images: ImportImage[], db: SupabaseClient): Promise<ImportResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ImportError("AI import isn't set up yet: add GEMINI_API_KEY to the server environment.", 503);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const [{ data: categories }, fx] = await Promise.all([
    db.from("categories").select("id, slug, name").order("sort_order"),
    getCnyToTzs(),
  ]);
  const cats = (categories ?? []) as { id: string; slug: string; name: string }[];
  const rule: PricingRule = {
    rate: fx.rate,
    multiplier: Number(process.env.AI_PRICE_MULTIPLIER) > 0 ? Number(process.env.AI_PRICE_MULTIPLIER) : DEFAULT_MULTIPLIER,
    rounding: Number(process.env.AI_PRICE_ROUNDING) > 0 ? Number(process.env.AI_PRICE_ROUNDING) : DEFAULT_ROUNDING,
  };

  const ai = new GoogleGenAI({ apiKey });
  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") } })),
          { text: prompt(cats) },
        ],
      }],
      config: { responseMimeType: "application/json", responseJsonSchema: SCHEMA, temperature: 0.2 },
    });
    text = response.text;
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 429) throw new ImportError("The AI is busy (rate limit). Wait a minute and try again.", 429);
      if (e.status === 401 || e.status === 403) throw new ImportError("The Gemini API key was rejected. Check GEMINI_API_KEY.", 502);
      throw new ImportError(`The AI service returned an error (${e.status}). Try again.`, 502);
    }
    throw e;
  }
  let parsed: AiResult;
  try {
    parsed = JSON.parse(text ?? "") as AiResult;
  } catch {
    throw new ImportError("The AI didn't return a readable answer. Try again, or use clearer screenshots.", 502);
  }
  if (!parsed.products?.length) throw new ImportError("No product found in these screenshots. Include the product page with its price.");

  const decoded = await Promise.all(images.map(async (img) => ({ ...img, meta: await sharp(img.data).metadata() })));
  const products: ProductDraft[] = [];
  for (const p of parsed.products) products.push(await toDraft(p, decoded, cats, rule, db));

  return { products, pricing: { rate: rule.rate, rateSource: fx.source, rateUpdatedAt: fx.updatedAt, multiplier: rule.multiplier, rounding: rule.rounding }, model };
}

// ---- Conversion ----------------------------------------------------------------------------------------------------

const clean = (s: string, max = 80) => s.replace(/\//g, "-").replace(/\s+/g, " ").trim().slice(0, max);
const DEFAULT_STOCK = () => (Number(process.env.AI_DEFAULT_STOCK) >= 0 && process.env.AI_DEFAULT_STOCK ? Number(process.env.AI_DEFAULT_STOCK) : 10);

export async function toDraft(
  p: AiProduct,
  images: (ImportImage & { meta: Metadata })[],
  cats: { id: string; slug: string }[],
  rule: PricingRule,
  db: SupabaseClient,
): Promise<ProductDraft> {
  const warnings: string[] = [];
  if (p.brand_risk?.flagged) warnings.push(`Possible counterfeit / brand risk: ${p.brand_risk.reason || "a famous brand's logo or name appears"}. Check you're allowed to sell it, and use photos without the logo.`);
  if (p.notes?.trim()) warnings.push(p.notes.trim());

  const small: string[] = [];
  const crop = cropper(images, db, clean(p.title), small);
  // Photos: main photos first, then each colour's photo (deduplicated by position).
  const gallery: { image_url: string; alt_text: string }[] = [];
  for (const b of p.photos ?? []) { const url = await crop(b); if (url && !gallery.some((g) => g.image_url === url)) gallery.push({ image_url: url, alt_text: clean(p.title) }); }
  const colourPhoto = new Map<string, string | null>();
  for (const c of p.colours ?? []) {
    const url = c.photo ? await crop(c.photo) : null;
    colourPhoto.set(clean(c.name, 40), url);
    if (url && !gallery.some((g) => g.image_url === url)) gallery.push({ image_url: url, alt_text: `${clean(p.title)} – ${clean(c.name, 40)}` });
  }
  if (!gallery.length) warnings.push("No product photo could be cut out of the screenshots. Add photos before publishing.");
  else if (small.length) warnings.push(`${small.length} photo${small.length === 1 ? " is" : "s are"} small and may look blurry. Replace with a full-screen screenshot of the photo for best quality.`);

  // Prices: base = cheapest combination (or the listed price); each combination pays the difference.
  const combos = (p.combinations ?? []).filter((c) => c.price_cny > 0 && (c.colour.trim() || c.size.trim()));
  // With options, the base is the cheapest option a shopper can actually buy. A lower listing price usually belongs
  // to an option that wasn't in the screenshots, so it's reported instead of being used.
  const baseCny = combos.length ? Math.min(...combos.map((c) => c.price_cny)) : p.price_cny > 0 ? p.price_cny : Infinity;
  if (combos.length && p.price_cny > 0 && p.price_cny < baseCny - 0.001) {
    warnings.push(`The listing also shows ¥${p.price_cny} (about TSh ${tzsFromCny(p.price_cny, rule).toLocaleString("en-US")}), cheaper than any option in the screenshots. It's probably another size or option; add it if you want to sell it.`);
  }
  if (!Number.isFinite(baseCny)) warnings.push("No price could be read. Set the price manually.");
  const price = Number.isFinite(baseCny) ? tzsFromCny(baseCny, rule) : 0;
  const original = p.original_price_cny && p.original_price_cny > baseCny ? tzsFromCny(p.original_price_cny, rule) : null;

  const stock = DEFAULT_STOCK();
  const hasColour = combos.some((c) => c.colour.trim()), hasSize = combos.some((c) => c.size.trim());
  const name = hasColour && hasSize ? `Color${OPTION_SEP}Size` : hasColour ? "Color" : "Size";
  const seen = new Set<string>();
  const variants: ProductDraft["variants"] = [];
  for (const c of combos) {
    const colour = clean(c.colour, 40), size = clean(c.size, 40);
    const value = hasColour && hasSize ? `${colour}${OPTION_SEP}${size}` : colour || size;
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    variants.push({ name, value, additional_price: Math.max(0, tzsFromCny(c.price_cny, rule) - price), stock_quantity: stock, image_url: colourPhoto.get(colour) ?? null });
    if (variants.length >= 50) { warnings.push("Only the first 50 combinations were imported."); break; }
  }
  if (combos.length && (!hasColour || !hasSize) && (p.colours?.length ?? 0) > 0 && (p.sizes?.length ?? 0) > 0) {
    warnings.push("Some colour/size combinations weren't visible; check the stock grid.");
  }

  const box = p.box_cm ?? { length: 20, width: 15, height: 10 };
  const within = (n: number, min: number, max: number, d: number) => (Number.isFinite(n) && n >= min && n <= max ? n : d);
  return {
    name: clean(p.title) || "Imported product",
    slug: slugify(clean(p.title) || "imported-product"),
    description: p.description?.trim().slice(0, 2000) ?? "",
    details: (p.highlights ?? []).map((h) => h.trim()).filter(Boolean).slice(0, 8),
    specifications: Object.fromEntries((p.specifications ?? []).filter((s) => s.label.trim() && s.value.trim()).slice(0, 12).map((s) => [s.label.trim(), s.value.trim()])),
    category_id: cats.find((c) => c.slug === p.category_slug)?.id ?? null,
    price,
    compare_at_price: original,
    stock_quantity: variants.length ? variants.reduce((n, v) => n + v.stock_quantity, 0) : stock,
    weight_kg: within(p.weight_kg, 0.05, 100, 0.5),
    length_cm: within(box.length, 1, 300, 20),
    width_cm: within(box.width, 1, 300, 15),
    height_cm: within(box.height, 1, 300, 10),
    images: gallery.slice(0, 12),
    variants,
    source: { price_cny: Number.isFinite(baseCny) ? baseCny : 0, original_price_cny: p.original_price_cny ?? null, screenshots: p.screenshots ?? [] },
    warnings,
  };
}

/** Crops a box out of a screenshot, uploads it, and returns its public URL (cached per box). */
function cropper(images: (ImportImage & { meta: Metadata })[], db: SupabaseClient, title: string, small: string[]) {
  const done = new Map<string, string | null>();
  return async (b: Box): Promise<string | null> => {
    const img = images[b.image];
    if (!img || b.box?.length !== 4 || !img.meta.width || !img.meta.height) return null;
    const key = `${b.image}:${b.box.join(",")}`;
    if (done.has(key)) return done.get(key)!;
    const [ymin, xmin, ymax, xmax] = b.box.map((n) => Math.min(1000, Math.max(0, n)));
    const W = img.meta.width, H = img.meta.height;
    const left = Math.round((xmin / 1000) * W), top = Math.round((ymin / 1000) * H);
    const width = Math.round(((xmax - xmin) / 1000) * W), height = Math.round(((ymax - ymin) / 1000) * H);
    // Skip slivers and anything that is basically the whole screenshot (that would include the app's UI).
    if (width < 60 || height < 60 || (width * height) / (W * H) > 0.85) { done.set(key, null); return null; }
    const jpeg = await sharp(img.data).extract({ left, top, width: Math.min(width, W - left), height: Math.min(height, H - top) })
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
    const path = `products/ai-${slugify(title).slice(0, 40) || "item"}-${crypto.randomUUID()}.jpeg`;
    const { error } = await db.storage.from("product-images").upload(path, jpeg, { contentType: "image/jpeg", cacheControl: "31536000" });
    const url = error ? null : db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    if (url && Math.max(width, height) < 300) small.push(url);
    done.set(key, url);
    return url;
  };
}
