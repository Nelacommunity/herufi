"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { bulkDelete, type BulkKind } from "@/actions/admin";
import { Button } from "@/components/ui/button";

type Ctx = { enabled: boolean; selected: Set<string>; toggle: (id: string) => void; setMany: (ids: string[], on: boolean) => void; clear: () => void };
const BulkContext = createContext<Ctx>({ enabled: false, selected: new Set(), toggle: () => {}, setMany: () => {}, clear: () => {} });

const NOUN: Record<BulkKind, [string, string]> = { products: ["product", "products"], categories: ["category", "categories"], coupons: ["discount code", "discount codes"] };
const EFFECT: Record<BulkKind, string> = {
  products: "Past orders keep their line items, but the products disappear from the store.",
  categories: "Their products stay in the store but become uncategorised.",
  coupons: "Customers can no longer use them, and their sales drop out of the staff sales report. Past orders still show the code.",
};

/**
 * Multi-select + bulk delete for admin lists. Only rendered for super admins (`enabled`); the server action
 * and the admin_bulk_delete() database function both re-check the role.
 */
export function BulkSelectProvider({ enabled, kind, children }: { enabled: boolean; kind: BulkKind; children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const ctx: Ctx = {
    enabled,
    selected,
    toggle: (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    setMany: (ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; }),
    clear: () => setSelected(new Set()),
  };
  const count = selected.size;
  const [one, many] = NOUN[kind];

  async function remove() {
    if (!window.confirm(`Delete ${count} ${count === 1 ? one : many}? This can't be undone.\n\n${EFFECT[kind]}`)) return;
    setPending(true);
    const r = await bulkDelete(kind, [...selected]);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success(r.message);
    ctx.clear();
    router.refresh();
  }

  return (
    <BulkContext.Provider value={ctx}>
      {children}
      {enabled && count > 0 && (
        <div role="region" aria-label="Bulk actions" className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border border-border bg-surface py-2 pl-5 pr-2 shadow-[var(--shadow-soft)]">
            <span className="text-sm font-medium tabular-nums">{count} selected</span>
            <button type="button" onClick={ctx.clear} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Clear selection"><X className="h-4 w-4" /></button>
            <Button size="sm" variant="primary" className="bg-sale text-white hover:bg-sale/90" loading={pending} onClick={remove}><Trash2 className="h-4 w-4" /> Delete {count}</Button>
          </div>
        </div>
      )}
    </BulkContext.Provider>
  );
}

export function useBulk() {
  return useContext(BulkContext);
}

const box = "h-4 w-4 cursor-pointer rounded accent-[var(--color-foreground)]";

export function SelectCheckbox({ id, label }: { id: string; label: string }) {
  const { enabled, selected, toggle } = useBulk();
  if (!enabled) return null;
  return <input type="checkbox" className={box} checked={selected.has(id)} onChange={() => toggle(id)} aria-label={`Select ${label}`} onClick={(e) => e.stopPropagation()} />;
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { enabled, selected, setMany } = useBulk();
  if (!enabled || !ids.length) return null;
  const all = ids.every((id) => selected.has(id));
  const some = !all && ids.some((id) => selected.has(id));
  return (
    <input type="checkbox" className={box} checked={all} aria-label={all ? "Deselect all on this page" : "Select all on this page"}
      ref={(el) => { if (el) el.indeterminate = some; }} onChange={() => setMany(ids, !all)} />
  );
}

/** Renders its children only for super admins (e.g. a checkbox column header/cell wrapper). */
export function BulkOnly({ children }: { children: ReactNode }) {
  return useBulk().enabled ? <>{children}</> : null;
}
