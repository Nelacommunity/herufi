"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { useSwipe } from "@/components/product/use-swipe";
import { GalleryLightbox } from "@/components/product/gallery-lightbox";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Product image carousel: swipe or drag on any device, arrows and keyboard, a thumbnail rail
 * (vertical on desktop, horizontal on mobile), hover zoom on desktop and a full-screen viewer.
 */
export function ProductGallery({ images, name, badge }: { images: ProductImage[]; name: string; badge?: React.ReactNode }) {
  const { t } = useI18n();
  const g = t.gallery;
  const list = images.length ? images : [{ id: "none", image_url: "", alt_text: name, sort_order: 0 }];
  const count = list.length;
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const go = useCallback((i: number) => { setIndex(Math.max(0, Math.min(count - 1, i))); setZoom(null); }, [count]);
  const swipe = useSwipe({ count, index, onChange: go });

  // Keep the active thumbnail in view.
  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  const caption = (img: ProductImage) => (img.alt_text && img.alt_text !== name ? img.alt_text : "");

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      {/* Stage */}
      <div
        className="group/stage relative -mx-4 overflow-hidden bg-surface-2 outline-none sm:-mx-6 lg:mx-0 lg:flex-1 lg:rounded-[1.5rem]"
        role="region"
        aria-roledescription="carousel"
        aria-label={g.label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
          if (e.key === "Enter" && list[0].image_url) setLightbox(true);
        }}
      >
        <div
          className={cn("flex touch-pan-y", !swipe.dragging && "transition-transform duration-500 ease-[var(--ease-out-expo)]", swipe.dragging && "cursor-grabbing")}
          style={{ transform: `translate3d(calc(${-index * 100}% + ${swipe.offset}px), 0, 0)` }}
          {...swipe.handlers}
          onClickCapture={swipe.preventClickAfterDrag}
        >
          {list.map((img, i) => (
            <div
              key={img.id}
              className="relative aspect-[4/5] w-full shrink-0 sm:aspect-[5/4] lg:aspect-[4/5]"
              role="group"
              aria-roledescription="slide"
              aria-label={fmt(g.imageOf, { n: i + 1, total: count })}
              aria-hidden={i !== index}
            >
              {img.image_url && (
                <button
                  type="button"
                  tabIndex={i === index ? 0 : -1}
                  onClick={() => setLightbox(true)}
                  onMouseMove={(e) => {
                    if (swipe.dragging || window.matchMedia("(hover: none)").matches) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                  }}
                  onMouseLeave={() => setZoom(null)}
                  className="absolute inset-0 block h-full w-full cursor-zoom-in overflow-hidden"
                  aria-label={`${g.open}: ${img.alt_text || name}`}
                >
                  <Image
                    src={img.image_url}
                    alt={img.alt_text || name}
                    fill
                    priority={i === 0}
                    loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
                    sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 50vw, 100vw"
                    draggable={false}
                    className={cn("pointer-events-none select-none object-cover", !zoom && "transition-transform duration-500 ease-[var(--ease-out-expo)]")}
                    style={i === index && zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        {badge && <div className="pointer-events-none absolute left-4 top-4">{badge}</div>}

        {list[0].image_url && (
          <button type="button" onClick={() => setLightbox(true)} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-sm backdrop-blur transition-all hover:bg-white lg:opacity-0 lg:group-hover/stage:opacity-100" aria-label={g.open}>
            <Expand className="h-4 w-4" />
          </button>
        )}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={g.prev}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-sm backdrop-blur transition-all hover:bg-white disabled:opacity-0 sm:grid lg:opacity-0 lg:group-hover/stage:opacity-100 lg:disabled:opacity-0">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1} aria-label={g.next}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-sm backdrop-blur transition-all hover:bg-white disabled:opacity-0 sm:grid lg:opacity-0 lg:group-hover/stage:opacity-100 lg:disabled:opacity-0">
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* Progress: dots + counter */}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5">
              <div className="flex gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur">
                {list.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full bg-white transition-all duration-300", i === index ? "w-5" : "w-1.5 opacity-60")} />)}
              </div>
            </div>
            <span className="absolute bottom-4 right-4 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur" aria-live="polite">
              {fmt(g.counter, { n: index + 1, total: count })}
            </span>
          </>
        )}
      </div>

      {/* Thumbnail rail: horizontal under the stage on mobile/tablet, vertical beside it on desktop */}
      {count > 1 && (
        <div className="relative lg:w-[76px] lg:shrink-0">
        <div ref={railRef} className="flex gap-2 overflow-x-auto px-0.5 py-1 no-scrollbar lg:absolute lg:inset-0 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:px-1" role="tablist" aria-label={g.label}>
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              data-thumb={i}
              role="tab"
              aria-selected={index === i}
              aria-label={fmt(g.goTo, { n: i + 1 })}
              onClick={() => go(i)}
              onMouseEnter={() => window.matchMedia("(hover: hover)").matches && go(i)}
              className={cn(
                "relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2 transition-all duration-300 lg:w-full",
                index === i ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-60 hover:opacity-100",
              )}
            >
              {img.image_url && <Image src={img.image_url} alt="" fill sizes="76px" className="object-cover" />}
              {caption(img) && <span className="sr-only">{caption(img)}</span>}
            </button>
          ))}
        </div>
        </div>
      )}

      {lightbox && list[0].image_url && (
        <GalleryLightbox images={list} name={name} index={index} onIndex={go} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
