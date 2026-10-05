"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Link2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, saveProduct, type ProductPayload } from "@/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Category, DeliveryMethod, Product } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

type Img = { id?: string; image_url: string; alt_text: string };
type Variant = { id?: string; name: string; value: string; additional_price: string; stock_quantity: string };

const card = "rounded-2xl border border-border bg-surface p-5 sm:p-6";

export function ProductForm({ product, categories, canEdit = true, canDelete = false }: { product: Product | null; categories: Category[]; canEdit?: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [details, setDetails] = useState((product?.details ?? []).join("\n"));
  const [specs, setSpecs] = useState(Object.entries(product?.specifications ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"));
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [compareAt, setCompareAt] = useState(product?.compare_at_price?.toString() ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(product?.stock_quantity.toString() ?? "0");
  const [featured, setFeatured] = useState(product?.is_featured ?? false);
  const [active, setActive] = useState(product?.is_active ?? true);
  const [weight, setWeight] = useState(product?.weight_kg.toString() ?? "0.5");
  const [dims, setDims] = useState({ l: product?.length_cm.toString() ?? "20", w: product?.width_cm.toString() ?? "15", h: product?.height_cm.toString() ?? "10" });
  const [methods, setMethods] = useState<DeliveryMethod[]>(product?.shipping_methods ?? ["standard", "express", "sea"]);
  const cbm = (Number(dims.l) * Number(dims.w) * Number(dims.h)) / 1_000_000 || 0;
  const [images, setImages] = useState<Img[]>(product?.images.map((i) => ({ id: i.id, image_url: i.image_url, alt_text: i.alt_text })) ?? []);
  const [variants, setVariants] = useState<Variant[]>(product?.variants.map((v) => ({ id: v.id, name: v.name, value: v.value, additional_price: String(v.additional_price), stock_quantity: String(v.stock_quantity) })) ?? []);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const discount = Number(compareAt) > Number(price) && Number(price) > 0 ? Math.floor(((Number(compareAt) - Number(price)) / Number(compareAt)) * 100) : 0;

  async function upload(files: FileList) {
    setUploading(true);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { toast.error(`${file.name}: unsupported format`); continue; }
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: larger than 5 MB`); continue; }
      const path = `products/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { cacheControl: "31536000" });
      if (error) { toast.error("Upload failed", { description: error.message }); continue; }
      const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      setImages((imgs) => [...imgs, { image_url: url, alt_text: name }]);
    }
    setUploading(false);
  }

  function addUrl() {
    try {
      const u = new URL(urlInput.trim());
      if (u.hostname !== "images.unsplash.com" && !u.pathname.startsWith("/storage/v1/object/public/")) {
        return toast.error("Use an Unsplash or Supabase Storage URL, or upload a file.");
      }
      setImages((imgs) => [...imgs, { image_url: u.toString(), alt_text: name }]);
      setUrlInput("");
    } catch {
      toast.error("That doesn't look like a valid URL.");
    }
  }

  function move<T>(list: T[], i: number, dir: -1 | 1) {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const specifications = Object.fromEntries(
      specs.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        const idx = l.indexOf(":");
        return idx > 0 ? [l.slice(0, idx).trim(), l.slice(idx + 1).trim()] : [l, ""];
      }),
    );
    const payload: ProductPayload = {
      id: product?.id,
      name, slug: slug || slugify(name), brand, category_id: categoryId || null, description,
      details: details.split("\n").map((d) => d.trim()).filter(Boolean),
      specifications,
      price: Number(price), compare_at_price: compareAt ? Number(compareAt) : null,
      sku: sku || null, stock_quantity: Number(stock) || 0, is_featured: featured, is_active: active,
      weight_kg: Number(weight), length_cm: Number(dims.l), width_cm: Number(dims.w), height_cm: Number(dims.h), shipping_methods: methods,
      images,
      variants: variants.filter((v) => v.name.trim() && v.value.trim()).map((v) => ({ ...v, additional_price: Number(v.additional_price) || 0, stock_quantity: Number(v.stock_quantity) || 0 })),
    };
    startSave(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      if (!product) router.replace(`/admin/products/${res.data!.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className={card}>
          <h2 className="mb-5 font-semibold">Details</h2>
          <div className="grid gap-4">
            <Field label="Product name" htmlFor="name"><Input id="name" required value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} /></Field>
            <Field label="URL slug" htmlFor="slug" hint={`herufi.shop/products/${slug || "…"}`}>
              <Input id="slug" value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} />
            </Field>
            <Field label="Description" htmlFor="description"><Textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Highlights" htmlFor="details" hint="One per line. Shown as bullet points."><Textarea id="details" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
            <Field label="Specifications" htmlFor="specs" hint="One per line as “Label: value”, e.g. Weight: 254 g"><Textarea id="specs" rows={4} value={specs} onChange={(e) => setSpecs(e.target.value)} className="font-mono text-sm" /></Field>
          </div>
        </section>

        <section className={card}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Images</h2>
            <span className="text-sm text-muted">The first image is the cover</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img, i) => (
              <div key={`${img.image_url}-${i}`} className="group relative">
                <div className={cn("relative aspect-[4/5] overflow-hidden rounded-xl bg-surface-2", i === 0 && "ring-2 ring-foreground ring-offset-2 ring-offset-surface")}>
                  <Image src={img.image_url} alt={img.alt_text} fill sizes="160px" className="object-cover" />
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                  <button type="button" onClick={() => setImages(move(images, i, -1))} disabled={i === 0} className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-neutral-900 disabled:opacity-40" aria-label="Move earlier"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
                  <button type="button" onClick={() => setImages(move(images, i, 1))} disabled={i === images.length - 1} className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-neutral-900 disabled:opacity-40" aria-label="Move later"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
                  <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sale" aria-label="Remove image"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <input value={img.alt_text} onChange={(e) => setImages(images.map((x, j) => (j === i ? { ...x, alt_text: e.target.value } : x)))} placeholder="Alt text" aria-label={`Alt text for image ${i + 1}`}
                  className="mt-2 h-8 w-full rounded-lg border border-border bg-transparent px-2 text-xs outline-none focus:border-foreground" />
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-strong text-sm text-muted transition-colors hover:border-foreground hover:text-foreground">
              {uploading ? <Spinner className="h-5 w-5" /> : <ImagePlus className="h-6 w-6" />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} />
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} placeholder="…or paste an image URL"
                className="h-10 w-full rounded-full border border-border-strong bg-surface pl-10 pr-4 text-sm outline-none focus:border-foreground" />
            </div>
            <Button type="button" variant="secondary" size="sm" className="h-10" onClick={addUrl}><Upload className="h-4 w-4" /> Add</Button>
          </div>
        </section>

        <section className={card}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Variants</h2>
            <Button type="button" size="sm" variant="secondary" onClick={() => setVariants([...variants, { name: variants[0]?.name ?? "Size", value: "", additional_price: "0", stock_quantity: "0" }])}><Plus className="h-4 w-4" /> Add option</Button>
          </div>
          <p className="mb-5 text-sm text-muted">Use one option type per product (e.g. Size or Color). When variants exist, stock is tracked per variant.</p>
          {variants.length > 0 ? (
            <div className="space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_110px_100px_76px] gap-2 px-1 text-xs font-medium text-muted sm:grid"><span>Option</span><span>Value</span><span>Extra price</span><span>Stock</span><span /></div>
              {variants.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-2 sm:grid-cols-[1fr_1fr_110px_100px_76px] sm:bg-transparent sm:p-0">
                  {(["name", "value", "additional_price", "stock_quantity"] as const).map((k) => (
                    <input key={k} value={v[k]} required={k === "name" || k === "value"} inputMode={k === "additional_price" || k === "stock_quantity" ? "decimal" : undefined}
                      onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                      placeholder={{ name: "Size", value: "M", additional_price: "0", stock_quantity: "0" }[k]} aria-label={k.replace("_", " ")}
                      className="h-10 rounded-lg border border-border-strong bg-surface px-3 text-sm outline-none focus:border-foreground" />
                  ))}
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setVariants(move(variants, i, -1))} className="grid h-10 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="grid h-10 w-8 place-items-center rounded-lg text-sale hover:bg-sale-soft" aria-label="Remove variant"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-surface-2 p-4 text-center text-sm text-muted">No variants. This product is sold as a single item.</p>
          )}
        </section>
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <section className={card}>
          <h2 className="mb-5 font-semibold">Status</h2>
          <div className="space-y-3">
            <Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} label="Active (visible in store)" />
            <Checkbox checked={featured} onChange={(e) => setFeatured(e.target.checked)} label="Featured in Trending" />
          </div>
          <Field className="mt-5" label="Category" htmlFor="category">
            <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorised</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field className="mt-4" label="Brand" htmlFor="brand"><Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
        </section>

        <section className={card}>
          <h2 className="mb-5 font-semibold">Pricing</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" htmlFor="price"><Input id="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Compare at" htmlFor="compare" optional><Input id="compare" inputMode="decimal" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} placeholder="0.00" /></Field>
          </div>
          <p className="mt-3 text-sm text-muted">{discount > 0 ? <span className="font-medium text-sale">Shows as {discount}% off</span> : "Set a higher compare-at price to show a discount."}</p>
        </section>

        <section className={card}>
          <h2 className="mb-5 font-semibold">Inventory</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" htmlFor="sku" optional><Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} /></Field>
            <Field label="Stock" htmlFor="stock"><Input id="stock" inputMode="numeric" value={variants.length ? String(variants.reduce((n, v) => n + (Number(v.stock_quantity) || 0), 0)) : stock} disabled={variants.length > 0} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} /></Field>
          </div>
          {variants.length > 0 && <p className="mt-3 text-sm text-muted">Calculated from variant stock.</p>}
        </section>

        <section className={card}>
          <h2 className="mb-1 font-semibold">Shipping</h2>
          <p className="mb-5 text-sm text-muted">Packed weight and box size drive cargo prices. <Link href="/admin/shipping" className="underline">Edit rates</Link></p>
          <Field label="Weight (kg)" htmlFor="weight"><Input id="weight" inputMode="decimal" required value={weight} onChange={(e) => setWeight(e.target.value)} /></Field>
          <p className="mb-1.5 mt-4 text-sm font-medium">Box size (cm)</p>
          <div className="grid grid-cols-3 gap-2">
            {(["l", "w", "h"] as const).map((k) => (
              <input key={k} inputMode="decimal" required value={dims[k]} onChange={(e) => setDims({ ...dims, [k]: e.target.value })} aria-label={{ l: "Length (cm)", w: "Width (cm)", h: "Height (cm)" }[k]} placeholder={{ l: "L", w: "W", h: "H" }[k]}
                className="h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm outline-none focus:border-foreground" />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted tabular-nums">{cbm.toFixed(4)} m³ · volumetric weight {(cbm * 167).toFixed(1)} kg (air)</p>
          <p className="mb-2 mt-5 text-sm font-medium">Allowed methods</p>
          <div className="space-y-2.5">
            {([["standard", "Air cargo"], ["express", "Express air"], ["sea", "Sea freight"]] as const).map(([m, label]) => (
              <Checkbox key={m} checked={methods.includes(m)} label={label}
                onChange={(e) => setMethods(e.target.checked ? [...methods, m] : methods.filter((x) => x !== m))} />
            ))}
          </div>
          {!methods.length && <p className="mt-2 text-sm text-sale">Allow at least one method.</p>}
        </section>

        <div className="flex flex-col gap-2">
          {canEdit && <Button type="submit" size="lg" loading={saving} disabled={!methods.length}>{product ? "Save changes" : "Create product"}</Button>}
          {!canEdit && <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">You can view this product but not edit it.</p>}
          {product?.is_active && <Link href={`/products/${product.slug}`} target="_blank" className={buttonVariants({ variant: "secondary", size: "lg" })}>View in store</Link>}
          {product && canDelete && (
            <Button type="button" variant="ghost" className="text-sale" loading={deleting} onClick={() => {
              if (!window.confirm(`Delete “${product.name}”? This can't be undone. Past orders keep their line items.`)) return;
              startDelete(async () => { const r = await deleteProduct(product.id); if (r.ok) { toast.success(r.message); router.replace("/admin/products"); } else toast.error(r.error); });
            }}><Trash2 className="h-4 w-4" /> Delete product</Button>
          )}
        </div>
      </div>
    </form>
  );
}
