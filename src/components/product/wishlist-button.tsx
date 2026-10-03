"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useStore } from "@/providers/store-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function WishlistButton({ productId, name, className, variant = "floating" }: {
  productId: string; name: string; className?: string; variant?: "floating" | "outline";
}) {
  const { isWishlisted, toggleWishlist, ready } = useStore();
  const [pop, setPop] = useState(0);
  const { t } = useI18n();
  const saved = ready && isWishlisted(productId);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(productId, name); setPop((p) => p + 1); }}
      aria-pressed={saved}
      aria-label={fmt(saved ? t.product.removeFromWishlist : t.product.addToWishlist, { name })}
      className={cn(
        "grid place-items-center rounded-full transition-[background-color,transform,border-color] duration-200 active:scale-90",
        variant === "floating" ? "h-9 w-9 bg-white/90 text-neutral-900 shadow-sm backdrop-blur hover:bg-white" : "h-13 w-13 border border-border-strong bg-surface hover:border-foreground",
        className,
      )}
    >
      <Heart key={pop} className={cn("h-[18px] w-[18px] transition-colors", saved && "fill-sale text-sale", pop > 0 && "animate-pop")} />
    </button>
  );
}
