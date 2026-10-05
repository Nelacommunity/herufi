"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { setProductActive } from "@/actions/admin";

export function ProductRowActions({ id, slug, active, canEdit }: { id: string; slug: string; active: boolean; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const btn = "grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40";
  return (
    <div className="flex justify-end gap-0.5">
      <Link href={`/admin/products/${id}`} className={btn} aria-label="Edit"><Pencil className="h-4 w-4" /></Link>
      {canEdit && <button className={btn} disabled={pending} aria-label={active ? "Unpublish" : "Publish"} title={active ? "Unpublish" : "Publish"}
        onClick={() => start(async () => { const r = await setProductActive(id, !active); if (r.ok) { toast.success(active ? "Moved to drafts" : "Published"); router.refresh(); } else toast.error(r.error); })}>
        {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>}
      {active && <a href={`/products/${slug}`} target="_blank" rel="noreferrer" className={btn} aria-label="View in store"><ExternalLink className="h-4 w-4" /></a>}
    </div>
  );
}
