"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

export function ProductGallery({ images, name, badge }: { images: ProductImage[]; name: string; badge?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const { locale } = useI18n();
  const sw = locale === "sw";
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const list = images.length ? images : [{ id: "none", image_url: "", alt_text: name, sort_order: 0 }];

  function goTo(i: number) {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="lg:grid lg:grid-cols-[76px_1fr] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <div className="hidden flex-col gap-3 lg:flex" role="tablist" aria-label={sw ? "Picha za bidhaa" : "Product images"}>
        {list.map((img, i) => (
          <button key={img.id} role="tab" aria-selected={active === i} aria-label={`${sw ? "Onyesha picha" : "Show image"} ${i + 1}`} onClick={() => setActive(i)}
            className={cn("relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-2 transition-all duration-300", active === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100")}>
            {img.image_url && <Image src={img.image_url} alt="" fill sizes="76px" className="object-cover" />}
          </button>
        ))}
      </div>

      {/* Main image with hover zoom (desktop) */}
      <div
        className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[1.5rem] bg-surface-2 lg:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        {list.map((img, i) => img.image_url && (
          <Image key={img.id} src={img.image_url} alt={img.alt_text || name} fill priority={i === 0} sizes="(min-width: 1280px) 46vw, 50vw"
            className={cn("object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)]", active === i ? "opacity-100" : "opacity-0")}
            style={active === i && zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%`, transitionProperty: "opacity" } : undefined} />
        ))}
        {badge && <div className="absolute left-4 top-4">{badge}</div>}
      </div>

      {/* Swipeable carousel (mobile & tablet) */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        <div ref={scroller} className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
          onScroll={(e) => { const el = e.currentTarget; setActive(Math.round(el.scrollLeft / el.clientWidth)); }}>
          {list.map((img, i) => (
            <div key={img.id} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-surface-2 sm:aspect-[5/4]">
              {img.image_url && <Image src={img.image_url} alt={img.alt_text || name} fill priority={i === 0} sizes="100vw" className="object-cover" />}
            </div>
          ))}
        </div>
        {badge && <div className="absolute left-4 top-4">{badge}</div>}
        {list.length > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur">
              {list.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} aria-label={`${sw ? "Nenda picha" : "Go to image"} ${i + 1}`} className={cn("h-1.5 rounded-full bg-white transition-all duration-300", active === i ? "w-5" : "w-1.5 opacity-60")} />
              ))}
            </div>
            <span className="absolute bottom-4 right-4 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{active + 1} / {list.length}</span>
          </>
        )}
      </div>
    </div>
  );
}
