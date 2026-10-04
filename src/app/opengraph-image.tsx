import { ImageResponse } from "next/og";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/layout/logo-path";
import { SITE } from "@/lib/constants";

export const alt = `${SITE.name}: buy from China, delivered to Tanzania. Free sea shipping.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const tile = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=630&q=70`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fafaf8", color: "#121212" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: 660 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg viewBox={LOGO_VIEWBOX} width={52} height={68}><path fill="#121212" fillRule="evenodd" d={LOGO_PATH} /></svg>
            <div style={{ fontSize: 48, fontFamily: "serif" }}>herufi</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Factory prices.</div>
            <div style={{ fontSize: 64, fontStyle: "italic", fontFamily: "serif", color: "#6b6a66", lineHeight: 1.15 }}>Delivered to Tanzania.</div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 24 }}>
            <div style={{ display: "flex", background: "#2f7a4b", color: "#fff", padding: "8px 16px", borderRadius: 999 }}>Free sea shipping</div>
            <div style={{ display: "flex", border: "2px solid #d3d0c9", padding: "6px 16px", borderRadius: 999 }}>Pay with M-Pesa</div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={tile("1539533018447-63fcce2678e3")} width={540} height={630} style={{ objectFit: "cover" }} />
        </div>
      </div>
    ),
    size,
  );
}
