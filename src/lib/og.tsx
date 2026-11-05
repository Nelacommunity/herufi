import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/layout/logo-path";
import { SITE_URL } from "@/lib/env";

/**
 * Branded link-preview cards (WhatsApp, Facebook, Instagram DMs, X, LinkedIn, Telegram, Slack…).
 * 1200×630 is the size every platform crops cleanly; WhatsApp also shows it as a square
 * thumbnail, so the photo sits on the right and the key text stays on the left.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#121212";
const MUTED = "#6b6a66";
const PAPER = "#fafaf8";
const LINE = "#d3d0c9";
const GREEN = "#2f7a4b";
const SALE = "#c2410c";

const DOMAIN = (() => {
  try { return new URL(SITE_URL).host.replace(/^www\./, ""); } catch { return "herufi.co.tz"; }
})();

/**
 * Fetch a photo and convert it to JPEG. The renderer can't read WebP/AVIF (common for
 * uploads), and a resized JPEG keeps the card small enough for WhatsApp (< 300 KB).
 */
export async function ogPhoto(url: string | null | undefined, width = 560, height = 630): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Accept: "image/jpeg,image/png,image/*" }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(width, height, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

type Card = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  price?: string;
  comparePrice?: string;
  discount?: number;
  photo?: string | null;
  chips?: string[];
};

const shorten = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);

export async function ogCard({ eyebrow, title, subtitle, price, comparePrice, discount, photo, chips = ["Delivered to Tanzania", "Pay with M-Pesa"] }: Card) {
  const text = shorten(title, 80);
  const titleSize = text.length > 55 ? 52 : text.length > 32 ? 62 : 74;
  const png = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, color: INK }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 56px 48px", width: photo ? 640 : 1200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox={LOGO_VIEWBOX} width={40} height={52}><path fill={INK} fillRule="evenodd" d={LOGO_PATH} /></svg>
            <div style={{ fontSize: 40, fontFamily: "serif" }}>herufi</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {eyebrow && <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: MUTED, marginBottom: 14 }}>{shorten(eyebrow, 40)}</div>}
            <div style={{ fontSize: titleSize, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{text}</div>
            {subtitle && <div style={{ fontSize: 30, fontStyle: "italic", fontFamily: "serif", color: MUTED, marginTop: 14, lineHeight: 1.2 }}>{shorten(subtitle, 70)}</div>}
            {price && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
                <div style={{ fontSize: 48, fontWeight: 700, whiteSpace: "nowrap" }}>{price}</div>
                {comparePrice && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <div style={{ fontSize: 26, color: MUTED, textDecoration: "line-through", whiteSpace: "nowrap" }}>{comparePrice}</div>
                    {discount ? <div style={{ display: "flex", background: SALE, color: "#fff", fontSize: 22, fontWeight: 700, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>−{discount}%</div> : null}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, fontSize: 21 }}>
              {chips.map((c, i) => (
                <div key={c} style={i === 0
                  ? { display: "flex", background: GREEN, color: "#fff", padding: "7px 15px", borderRadius: 999 }
                  : { display: "flex", border: `2px solid ${LINE}`, padding: "5px 15px", borderRadius: 999 }}>{c}</div>
              ))}
            </div>
            {!photo && <div style={{ fontSize: 24, color: MUTED }}>{DOMAIN}</div>}
          </div>
        </div>

        {photo && (
          <div style={{ display: "flex", position: "relative", flex: 1, background: "#fff" }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element */}
            <img src={photo} width={560} height={630} style={{ objectFit: "cover" }} />
            <div style={{ display: "flex", position: "absolute", right: 24, bottom: 24, background: "rgba(18,18,18,0.78)", color: "#fff", fontSize: 21, padding: "7px 15px", borderRadius: 999 }}>{DOMAIN}</div>
          </div>
        )}
      </div>
    ),
    OG_SIZE,
  );
  // PNG with a photo is ~0.6–1 MB; WhatsApp skips previews much over 300 KB, so send a JPEG.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
