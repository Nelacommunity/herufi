"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Anchor, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { ShippingCalculator } from "@/components/shipping/shipping-calculator";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/product/price-display";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { WishlistButton } from "@/components/product/wishlist-button";
import { SWATCHES } from "@/components/product/swatches";
import { useStore } from "@/providers/store-provider";
import { isInStock } from "@/lib/queries/shared";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";


export function PurchasePanel({ product, freeSeaShipping = null }: { product: Product; freeSeaShipping?: number | null }) {
  const { addToCart, trackView } = useStore();
  const { t } = useI18n();
  const p = t.product;
  const router = useRouter();
  const optionName = product.variants[0]?.name;
  const optionLabel = optionName ? (t.optionNames[optionName] ?? optionName) : "";
  const [variantId, setVariantId] = useState<string | null>(product.variants.length === 1 ? product.variants[0].id : null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const extra = variant?.additional_price ?? 0;
  const stock = variant ? variant.stock_quantity : product.variants.length ? Math.max(...product.variants.map((v) => v.stock_quantity)) : product.stock_quantity;
  const available = isInStock(product);
  const max = Math.max(1, Math.min(10, stock));

  useEffect(() => { trackView(product.id); }, [product.id, trackView]);
  const quantity = Math.min(qty, max);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stockNote = useMemo(() => {
    if (!available) return { tone: "text-sale", text: p.stockSoldOut };
    if (variant && variant.stock_quantity === 0) return { tone: "text-sale", text: fmt(p.variantSoldOut, { value: variant.value }) };
    if (stock > 0 && stock <= 5) return { tone: "text-warning", text: fmt(p.lowStock, { n: stock }) };
    return { tone: "text-success", text: p.inStock };
  }, [available, variant, stock, p]);

  function add(goToCheckout = false) {
    if (product.variants.length && !variant) {
      setError(fmt(p.pleaseSelect, { option: optionLabel.toLowerCase() }));
      document.getElementById("variant-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    addToCart(product, variant, quantity, { openDrawer: !goToCheckout });
    if (goToCheckout) router.push("/checkout");
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  const isColor = optionName === "Color";

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.1em] text-muted">{product.brand}</p>
      <h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
      <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm hover:underline">
        <span className="flex">
          {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} viewBox="0 0 20 20" className={cn("h-4 w-4", i < Math.round(product.rating) ? "fill-star" : "fill-border-strong")} aria-hidden><path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z" /></svg>
          ))}
        </span>
        <span className="font-medium">{product.rating.toFixed(1)}</span>
        <span className="text-muted">({fmt(p.reviewsCount, { n: product.review_count })})</span>
      </a>

      <PriceDisplay price={product.price + extra} compareAt={product.compare_at_price ? product.compare_at_price + extra : null} size="lg" showBadge className="mt-6" />
      {freeSeaShipping != null && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-semibold text-success">
          <Anchor className="h-4 w-4" />
          {freeSeaShipping > 0 ? fmt(t.shipping.freeNoteOver, { amount: formatPrice(freeSeaShipping) }) : t.shipping.pdpBadge}
        </p>
      )}
      <p className="mt-2 text-sm text-muted">{p.taxNote} {p.payNote}</p>

      <p className="mt-6 text-pretty leading-relaxed text-muted">{product.description.split(". ").slice(0, 2).join(". ")}{product.description.split(". ").length > 2 ? "." : ""}</p>

      {product.variants.length > 0 && (
        <fieldset id="variant-picker" className="mt-8 scroll-mt-32">
          <legend className="mb-3 flex w-full items-center justify-between text-sm">
            <span><span className="font-semibold">{optionLabel}:</span> <span className="text-muted">{variant?.value ?? p.selectAnOption}</span></span>
            {optionName === "Size" && <Link href="/help/faq#sizing" className="text-muted underline-offset-4 hover:underline">{p.sizeGuide}</Link>}
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={optionLabel}>
            {product.variants.map((v) => {
              const selected = v.id === variantId;
              const soldOut = v.stock_quantity <= 0;
              const swatch = SWATCHES[v.value.toLowerCase()];
              return (
                <button key={v.id} role="radio" aria-checked={selected} disabled={soldOut} onClick={() => { setVariantId(v.id); setError(null); }}
                  className={cn(
                    "relative inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-200",
                    selected ? "border-foreground bg-foreground text-background" : "border-border-strong hover:border-foreground",
                    soldOut && "cursor-not-allowed border-dashed text-subtle line-through hover:border-border-strong",
                  )}>
                  {isColor && swatch && <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: swatch }} aria-hidden />}
                  {v.value}
                  {v.additional_price > 0 && <span className={cn("text-xs", selected ? "text-background/70" : "text-muted")}>+{formatPrice(v.additional_price)}</span>}
                </button>
              );
            })}
          </div>
          {error && <p className="mt-3 text-sm font-medium text-sale" role="alert">{error}</p>}
        </fieldset>
      )}

      <p className={cn("mt-6 flex items-center gap-2 text-sm font-medium", stockNote.tone)}>
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-current" /></span>
        {stockNote.text}
      </p>

      <div ref={ctaRef} className="mt-6 flex flex-col gap-3">
        <div className="flex gap-3">
          <QuantitySelector value={quantity} onChange={setQty} max={max} className="h-13 [&_button]:h-12" />
          <Button size="lg" className="flex-1" disabled={!available} onClick={() => add(false)}>
            {added ? <><Check className="h-4 w-4" /> {p.added}</> : available ? p.addToBag : p.soldOut}
          </Button>
          <WishlistButton productId={product.id} name={product.name} variant="outline" />
        </div>
        <Button size="lg" variant="secondary" disabled={!available} onClick={() => add(true)}>{p.buyNow}</Button>
      </div>

      <ShippingCalculator product={product} quantity={quantity} unitPrice={product.price + extra} />

      <ul className="mt-4 divide-y divide-border rounded-2xl border border-border text-sm">
        <li className="flex items-start gap-3 p-4">
          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">{p.returnsTitle}</p><p className="text-muted">{p.returnsText}</p></div>
        </li>
        <li className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div><p className="font-medium">{p.qualityTitle}</p><p className="text-muted">{p.qualityText}</p></div>
        </li>
      </ul>

      {/* Sticky purchase bar (mobile) */}
      <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-safe backdrop-blur-xl transition-transform duration-300 ease-[var(--ease-out-expo)] lg:hidden", showSticky ? "translate-y-0" : "translate-y-full")} aria-hidden={!showSticky}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {product.images[0] && <Image src={product.images[0].image_url} alt="" fill sizes="40px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-sm text-muted">{formatPrice(product.price + extra)}{variant ? ` · ${variant.value}` : ""}</p>
          </div>
          <Button size="md" disabled={!available} onClick={() => add(false)} tabIndex={showSticky ? 0 : -1}>{available ? p.addToBag : p.soldOut}</Button>
        </div>
      </div>
      <div className="h-4 lg:hidden" />
    </div>
  );
}
