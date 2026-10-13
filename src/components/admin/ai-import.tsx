"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { saveProduct } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { ImportResult, ProductDraft } from "@/lib/ai/product-import";
import { cn, formatPrice } from "@/lib/utils";

type Row = ProductDraft & { key: number; stock: string; publish: boolean; status: "draft" | "saving" | "saved"; savedId?: string };

/** Screenshots → AI-read product drafts → created products. */
export function AiImport({ categories, configured }: { categories: { id: string; name: string }[]; configured: boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pricing: ImportResult["pricing"]; rows: Row[] } | null>(null);
  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  function addFiles(list: FileList | null) {
    const next = [...files, ...Array.from(list ?? []).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type))].slice(0, 8);
    setFiles(next);
  }

  async function read() {
    setReading(true); setError(null); setResult(null);
    const body = new FormData();
    files.forEach((f) => body.append("images", f));
    try {
      const res = await fetch("/api/admin/ai-import", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The import failed.");
      const r = data as ImportResult;
      setResult({ pricing: r.pricing, rows: r.products.map((p, i) => ({ ...p, key: i, stock: String(p.variants[0]?.stock_quantity ?? p.stock_quantity), publish: false, status: "draft" })) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The import failed.");
    } finally {
      setReading(false);
    }
  }

  const update = (key: number, patch: Partial<Row>) => setResult((r) => r && { ...r, rows: r.rows.map((x) => (x.key === key ? { ...x, ...patch } : x)) });

  async function create(row: Row) {
    const stock = Math.max(0, Math.floor(Number(row.stock) || 0));
    update(row.key, { status: "saving" });
    const res = await saveProduct({
      name: row.name, slug: row.slug, brand: "", category_id: row.category_id, description: row.description,
      details: row.details, specifications: row.specifications, price: row.price, compare_at_price: row.compare_at_price,
      sku: null, stock_quantity: stock, is_featured: false, is_active: row.publish,
      weight_kg: row.weight_kg, length_cm: row.length_cm, width_cm: row.width_cm, height_cm: row.height_cm,
      shipping_methods: ["sea", "standard", "express"],
      images: row.images,
      variants: row.variants.map((v) => ({ ...v, stock_quantity: stock })),
    });
    if (!res.ok) { update(row.key, { status: "draft" }); return void toast.error(`${row.name}: ${res.error}`); }
    update(row.key, { status: "saved", savedId: res.data!.id });
    toast.success(row.publish ? `${row.name} is live` : `${row.name} saved as a draft`);
  }

  if (!configured) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm">
        <p className="font-medium">AI import isn&apos;t set up yet.</p>
        <p className="mt-2 text-muted">Add <code className="rounded bg-surface-2 px-1">GEMINI_API_KEY</code> to the server environment (get one at aistudio.google.com) and restart the site.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap gap-3">
          {previews.map(({ f, url }, i) => (
            <div key={i} className="relative h-40 w-[74px] overflow-hidden rounded-lg border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={f.name} className="h-full w-full object-cover object-top" />
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {files.length < 8 && (
            <label className="flex h-40 w-[74px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong text-xs text-muted hover:border-foreground">
              <ImagePlus className="h-5 w-5" /> Add
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        <p className="mt-3 text-sm text-muted">Up to 8 screenshots. Include the product page with its price and the options list. For clean photos, open the product photo full screen in the app and screenshot that too.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={read} loading={reading} disabled={!files.length}><Sparkles className="h-4 w-4" /> Read with AI</Button>
          {reading && <span className="inline-flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Reading screenshots, this can take up to a minute…</span>}
          {files.length > 0 && !reading && <Button variant="ghost" onClick={() => { setFiles([]); setResult(null); setError(null); }}><Trash2 className="h-4 w-4" /> Clear</Button>}
        </div>
        {error && <p className="mt-3 rounded-xl bg-sale-soft px-4 py-3 text-sm text-sale">{error}</p>}
      </section>

      {/* Results */}
      {result && (
        <>
          <p className="text-sm text-muted">
            ¥1 = TSh {result.pricing.rate.toFixed(2)} ({result.pricing.rateSource === "live" ? "live rate" : "fallback rate"}) × {result.pricing.multiplier}, rounded up to TSh {result.pricing.rounding.toLocaleString()}.
            {" "}{result.rows.length} product{result.rows.length === 1 ? "" : "s"} found.
          </p>
          {result.rows.map((row) => (
            <section key={row.key} className={cn("rounded-2xl border bg-surface p-5 sm:p-6", row.status === "saved" ? "border-success/40" : "border-border")}>
              {row.warnings.length > 0 && (
                <ul className="mb-4 space-y-1.5">
                  {row.warnings.map((w) => (
                    <li key={w} className={cn("flex gap-2 rounded-xl px-3 py-2 text-sm", /counterfeit|brand/i.test(w) ? "bg-sale-soft text-sale" : "bg-surface-2 text-muted")}>
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {row.images.map((img, i) => (
                  <span key={img.image_url} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image src={img.image_url} alt="" fill sizes="96px" className="object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-foreground px-1 text-[10px] font-semibold text-background">COVER</span>}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium">Name</span>
                  <input value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 outline-none focus:border-foreground" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium">Price (TSh)</span>
                  <input value={row.price} inputMode="numeric" onChange={(e) => update(row.key, { price: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 outline-none focus:border-foreground" />
                  <span className="mt-1 block text-xs text-muted">¥{row.source.price_cny} × {result.pricing.rate.toFixed(2)} × {result.pricing.multiplier}{row.compare_at_price ? ` · was ${formatPrice(row.compare_at_price)}` : ""}</span></label>
                <label className="text-sm"><span className="mb-1 block font-medium">Category</span>
                  <Select value={row.category_id ?? ""} onChange={(e) => update(row.key, { category_id: e.target.value || null })}>
                    <option value="">Uncategorised</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select></label>
                <label className="text-sm"><span className="mb-1 block font-medium">Stock {row.variants.length ? "per option" : ""}</span>
                  <input value={row.stock} inputMode="numeric" onChange={(e) => update(row.key, { stock: e.target.value.replace(/\D/g, "") })} className="h-10 w-full rounded-lg border border-border-strong bg-surface px-3 outline-none focus:border-foreground" /></label>
                <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={row.publish} onChange={(e) => update(row.key, { publish: e.target.checked })} className="h-4 w-4" /> Publish immediately</label>
              </div>
              <p className="mt-3 text-sm text-muted">{row.description}</p>
              {row.variants.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.variants.map((v) => (
                    <span key={v.value} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs">{v.value}{v.additional_price > 0 ? ` +${formatPrice(v.additional_price)}` : ""}</span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-subtle">Shipping estimate: {row.weight_kg} kg · {row.length_cm}×{row.width_cm}×{row.height_cm} cm</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {row.status === "saved" ? (
                  <Link href={`/admin/products/${row.savedId}`} className="inline-flex h-10 items-center rounded-full border border-border-strong px-4 text-sm font-medium hover:border-foreground">Open in editor</Link>
                ) : (
                  <Button onClick={() => create(row)} loading={row.status === "saving"} disabled={!row.name.trim() || row.price <= 0}>{row.publish ? "Create and publish" : "Create as draft"}</Button>
                )}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
