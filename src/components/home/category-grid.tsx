import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { categoryName, cn } from "@/lib/utils";
import type { Dictionary } from "@/i18n/dictionaries";
import { plural } from "@/i18n/config";

export function CategoryGrid({ categories, t }: { categories: Category[]; t: Dictionary }) {
  const items = categories.slice(0, 8);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
      {items.map((c, i) => (
        <Link
          key={c.id}
          href={`/categories/${c.slug}`}
          className={cn(
            "group relative overflow-hidden rounded-[1.5rem] bg-surface-2",
            i === 0 ? "col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[4/5] sm:aspect-square",
          )}
        >
          {c.image_url && (
            <Image src={c.image_url} alt="" fill sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
            <div>
              <h3 className={cn("font-semibold tracking-tight", i === 0 ? "text-2xl sm:text-4xl" : "text-lg sm:text-xl")}>{categoryName(t.categories, c)}</h3>
              <p className="mt-0.5 text-sm text-white/75">{plural(t.common.products, c.product_count ?? 0)}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition-all duration-300 group-hover:bg-white group-hover:text-neutral-900">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
