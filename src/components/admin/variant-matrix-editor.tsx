"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { cellKey, matrixStock, renameAt, SIZE_PRESETS, type Matrix } from "@/lib/variant-matrix";

/** Digits only, without leading zeros ("02000" → "2000", "0" stays "0"). */
const digits = (t: string) => t.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

const input = "h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm outline-none focus:border-foreground";

/**
 * Colours (with a photo each), sizes (with an extra price each) and a stock grid.
 * An empty cell = this colour doesn't come in this size; 0 = sold out.
 */
export function VariantMatrixEditor({ matrix: m, onChange, images }: { matrix: Matrix; onChange: (m: Matrix) => void; images: { image_url: string }[] }) {
  const [picking, setPicking] = useState<number | null>(null);
  const [fill, setFill] = useState("");
  const colours = m.colours.length ? m.colours : [null];
  const sizes = m.sizes.length ? m.sizes : [null];
  const hasGrid = m.colours.length > 0 || m.sizes.length > 0;
  const setCell = (c: string, s: string, v: string) => onChange({ ...m, stock: { ...m.stock, [cellKey(c, s)]: digits(v) } });
  const dropCells = (pred: (c: string, s: string) => boolean) =>
    Object.fromEntries(Object.entries(m.stock).filter(([k]) => { const [c, s] = k.split("|"); return !pred(c, s); }));

  return (
    <div className="space-y-6">
      {/* Colours */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Colours <span className="font-normal text-muted">· each with its photo</span></p>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...m, colours: [...m.colours, { name: "", image_url: null }] })}><Plus className="h-4 w-4" /> Add colour</Button>
        </div>
        <div className="space-y-2">
          {m.colours.map((c, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPicking(picking === i ? null : i)} aria-label={`Photo for ${c.name || "this colour"}`}
                  className={cn("relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-surface-2 text-muted", picking === i ? "border-foreground" : "border-border-strong")}>
                  {c.image_url ? <Image src={c.image_url} alt="" fill sizes="40px" className="object-cover" /> : <ImagePlus className="h-4 w-4" />}
                </button>
                <input value={c.name} placeholder="e.g. Black" aria-label={`Colour ${i + 1}`} className={cn(input, "flex-1")}
                  onChange={(e) => onChange(renameAt(m, "colour", i, e.target.value))} />
                <button type="button" aria-label={`Remove ${c.name || "colour"}`} className="grid h-10 w-9 place-items-center rounded-lg text-sale hover:bg-sale-soft"
                  onClick={() => { setPicking(null); onChange({ ...m, colours: m.colours.filter((_, j) => j !== i), stock: dropCells((cc) => cc === c.name) }); }}><Trash2 className="h-4 w-4" /></button>
              </div>
              {picking === i && (
                <div className="ml-12 mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 p-2">
                  {images.length ? images.map((img, n) => (
                    <button key={`${img.image_url}-${n}`} type="button" aria-label={`Use image ${n + 1}`}
                      onClick={() => { onChange({ ...m, colours: m.colours.map((x, j) => (j === i ? { ...x, image_url: img.image_url } : x)) }); setPicking(null); }}
                      className={cn("relative h-12 w-12 overflow-hidden rounded-lg border-2", c.image_url === img.image_url ? "border-foreground" : "border-transparent hover:border-border-strong")}>
                      <Image src={img.image_url} alt="" fill sizes="48px" className="object-cover" />
                    </button>
                  )) : <span className="px-1 text-xs text-muted">Upload product images above first, then pick one for this colour.</span>}
                  {c.image_url && <button type="button" className="ml-1 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                    onClick={() => { onChange({ ...m, colours: m.colours.map((x, j) => (j === i ? { ...x, image_url: null } : x)) }); setPicking(null); }}><X className="h-3.5 w-3.5" /> No photo</button>}
                </div>
              )}
            </div>
          ))}
          {!m.colours.length && <p className="text-sm text-muted">No colours. Add some if this product comes in different colours.</p>}
        </div>
      </div>

      {/* Sizes */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Sizes <span className="font-normal text-muted">· extra price is added to the product price</span></p>
          <div className="flex flex-wrap gap-1">
            {SIZE_PRESETS.map((p) => (
              <Button key={p.label} type="button" size="sm" variant="ghost" className="text-xs"
                onClick={() => onChange({ ...m, sizes: [...m.sizes, ...p.sizes.filter((s) => !m.sizes.some((x) => x.name === s)).map((s) => ({ name: s, extra: "" }))] })}>+ {p.label}</Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...m, sizes: [...m.sizes, { name: "", extra: "" }] })}><Plus className="h-4 w-4" /> Add size</Button>
          </div>
        </div>
        <div className="space-y-2">
          {m.sizes.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={s.name} placeholder="e.g. M" aria-label={`Size ${i + 1}`} className={cn(input, "w-28")}
                onChange={(e) => onChange(renameAt(m, "size", i, e.target.value))} />
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">+ TSh</span>
                <input value={s.extra} inputMode="numeric" placeholder="0" aria-label={`Extra price for ${s.name || "this size"}`} className={cn(input, "w-full pl-14")}
                  onChange={(e) => onChange({ ...m, sizes: m.sizes.map((x, j) => (j === i ? { ...x, extra: digits(e.target.value) } : x)) })} />
              </div>
              <button type="button" aria-label={`Remove ${s.name || "size"}`} className="grid h-10 w-9 place-items-center rounded-lg text-sale hover:bg-sale-soft"
                onClick={() => onChange({ ...m, sizes: m.sizes.filter((_, j) => j !== i), stock: dropCells((_, ss) => ss === s.name) })}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!m.sizes.length && <p className="text-sm text-muted">No sizes. Add some if this product comes in different sizes.</p>}
        </div>
      </div>

      {/* Stock grid */}
      {hasGrid && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Stock <span className="font-normal text-muted">· leave empty if it doesn&apos;t exist, 0 = sold out</span></p>
            <div className="flex items-center gap-1.5">
              <input value={fill} onChange={(e) => setFill(digits(e.target.value))} placeholder="Qty" aria-label="Stock for every combination" className={cn(input, "h-9 w-20")} />
              <Button type="button" size="sm" variant="secondary" disabled={!fill}
                onClick={() => onChange({ ...m, stock: Object.fromEntries(colours.flatMap((c) => sizes.map((s) => [cellKey(c?.name ?? "", s?.name ?? ""), fill]))) })}>Set all</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{m.colours.length ? "Colour" : ""}</th>
                  {sizes.map((s, j) => (
                    <th key={j} className="px-2 py-2 text-center font-medium">
                      {s ? <>{s.name || "?"}{Number(s.extra) > 0 && <span className="block text-[10px] font-normal">+{formatPrice(Number(s.extra))}</span>}</> : "Stock"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colours.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">
                      {c ? (
                        <span className="flex items-center gap-2">
                          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-2">{c.image_url && <Image src={c.image_url} alt="" fill sizes="28px" className="object-cover" />}</span>
                          <span className="truncate">{c.name || "?"}</span>
                        </span>
                      ) : <span className="text-muted">All</span>}
                    </td>
                    {sizes.map((s, j) => {
                      const key = cellKey(c?.name ?? "", s?.name ?? "");
                      const v = m.stock[key] ?? "";
                      return (
                        <td key={j} className="px-1.5 py-1.5 text-center">
                          <input value={v} inputMode="numeric" placeholder="—" onChange={(e) => setCell(c?.name ?? "", s?.name ?? "", e.target.value)}
                            aria-label={`Stock for ${[c?.name, s?.name].filter(Boolean).join(" ")}`}
                            className={cn("h-9 w-16 rounded-lg border text-center text-sm outline-none focus:border-foreground", v === "" ? "border-dashed border-border-strong bg-transparent" : v === "0" ? "border-sale/40 bg-sale-soft text-sale" : "border-border-strong bg-surface")} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">{matrixStock(m).toLocaleString()} in stock in total. Shoppers see each colour&apos;s photo when they pick it, and sizes that a colour doesn&apos;t come in are greyed out.</p>
        </div>
      )}
    </div>
  );
}
