"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory, reorderCategories, saveCategory } from "@/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Category } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function CategoryManager({ categories: initial }: { categories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) { setSource(initial); setCategories(initial); }
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [pending, start] = useTransition();

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[i], next[j]] = [next[j], next[i]];
    setCategories(next);
    start(async () => { const r = await reorderCategories(next.map((c) => c.id)); if (!r.ok) { toast.error(r.error); setCategories(initial); } });
  }

  return (
    <>
      <div className="mb-6 flex justify-end"><Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add category</Button></div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {categories.map((c, i) => (
          <li key={c.id} className="flex items-center gap-4 p-4">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0 || pending} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30" aria-label={`Move ${c.name} up`}><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === categories.length - 1 || pending} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30" aria-label={`Move ${c.name} down`}><ArrowDown className="h-4 w-4" /></button>
            </div>
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">{c.image_url && <Image src={c.image_url} alt="" fill sizes="56px" className="object-cover" />}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="truncate text-sm text-muted">/{c.slug} · {c.product_count ?? 0} products</p>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon-sm" variant="ghost" className="text-sale" aria-label={`Delete ${c.name}`} onClick={() => {
              if (!window.confirm(`Delete “${c.name}”? Its ${c.product_count ?? 0} products will become uncategorised.`)) return;
              start(async () => { const r = await deleteCategory(c.id); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); });
            }}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
        {!categories.length && <li className="p-12 text-center text-muted">No categories yet.</li>}
      </ul>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New category" : "Edit category"}>
        {editing !== null && <CategoryForm category={editing === "new" ? null : editing} onDone={() => { setEditing(null); router.refresh(); }} />}
      </Sheet>
    </>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveCategory, null);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [image, setImage] = useState(category?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state?.ok) { toast.success(state.message); onDone(); } }, [state, onDone]);

  async function upload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const path = `categories/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("category-images").upload(path, file, { cacheControl: "31536000" });
    setUploading(false);
    if (error) return toast.error("Upload failed", { description: error.message });
    setImage(supabase.storage.from("category-images").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} className="grid gap-4 p-5 sm:p-6">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <input type="hidden" name="image_url" value={image} />
      <button type="button" onClick={() => fileRef.current?.click()} className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border-strong text-sm text-muted hover:border-foreground">
        {image ? <Image src={image} alt="" fill sizes="400px" className="object-cover" /> : uploading ? <Spinner /> : <span className="flex flex-col items-center gap-2"><ImagePlus className="h-6 w-6" /> Upload cover image</span>}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Field label="Name" htmlFor="cat-name"><Input id="cat-name" name="name" required value={name} onChange={(e) => { setName(e.target.value); if (!category) setSlug(slugify(e.target.value)); }} /></Field>
      <Field label="Slug" htmlFor="cat-slug" hint={`/categories/${slug || "…"}`}><Input id="cat-slug" name="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></Field>
      <Field label="Description" htmlFor="cat-desc" optional><Textarea id="cat-desc" name="description" defaultValue={category?.description ?? ""} /></Field>
      {state && !state.ok && <p className="text-sm text-sale">{state.error}</p>}
      <Button type="submit" size="lg" loading={pending}>Save category</Button>
    </form>
  );
}
