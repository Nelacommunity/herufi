import { ImageResponse } from "next/og";
import { SITE } from "@/lib/constants";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const tile = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=630&q=70`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fafaf8", color: "#121212" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, width: 640 }}>
          <div style={{ fontSize: 44, fontFamily: "serif" }}>Herufi.</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Factory prices.</div>
            <div style={{ fontSize: 68, fontStyle: "italic", fontFamily: "serif", color: "#6b6a66", lineHeight: 1.1 }}>Delivered to Tanzania.</div>
          </div>
          <div style={{ fontSize: 24, color: "#6b6a66" }}>Direct from China · Pay with M-Pesa</div>
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={tile("1539533018447-63fcce2678e3")} width={560} height={630} style={{ objectFit: "cover" }} />
        </div>
      </div>
    ),
    size,
  );
}
