"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { setStaff } from "@/actions/admin";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PERMISSIONS, ROLE_LABEL, type Permission, type StaffRole } from "@/lib/permissions";
import { cn, formatDate, initials } from "@/lib/utils";

export type StaffMember = { user_id: string; full_name: string | null; email: string | null; role: StaffRole; status: string; permissions: string[]; created_at: string };

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export function StaffManager({ staff, me }: { staff: StaffMember[]; me: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="mb-6 flex justify-end"><Button onClick={() => setEditing("new")}><UserPlus className="h-4 w-4" /> Add staff</Button></div>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
        {staff.map((s) => (
          <li key={s.user_id} className="flex flex-wrap items-center gap-4 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold">{initials(s.full_name, s.email)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.full_name ?? s.email}{s.user_id === me && <span className="ml-2 text-xs text-muted">(you)</span>}</p>
              <p className="truncate text-sm text-muted">{s.email} · since {formatDate(s.created_at)}</p>
              {s.role === "admin" && (
                <p className="mt-1.5 flex flex-wrap gap-1">
                  {s.permissions.length ? s.permissions.map((p) => <span key={p} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px]">{PERMISSIONS.find((x) => x.key === p)?.label ?? p}</span>)
                    : <span className="text-xs text-sale">No permissions yet: they can only see their own discount codes.</span>}
                </p>
              )}
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.role === "super_admin" ? "bg-foreground text-background" : "bg-surface-2")}>
              {s.role === "super_admin" && <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />}{ROLE_LABEL[s.role]}
            </span>
            {s.status === "suspended" && <span className="rounded-full bg-sale-soft px-2.5 py-1 text-xs font-semibold text-sale">Suspended</span>}
            {s.user_id !== me && (
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${s.email}`}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon-sm" variant="ghost" className="text-sale" disabled={pending} aria-label={`Remove ${s.email} from staff`} onClick={() => {
                  if (!window.confirm(`Remove ${s.email} from staff? Their account stays; they become a regular customer. Discount codes assigned to them keep their history.`)) return;
                  start(async () => { const r = await setStaff({ email: s.email ?? "", role: "customer", permissions: [] }); if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.error); });
                }}><UserMinus className="h-4 w-4" /></Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add staff" : "Edit staff access"}>
        {editing !== null && <StaffForm key={editing === "new" ? "new" : editing.user_id} member={editing === "new" ? null : editing} onDone={() => { setEditing(null); router.refresh(); }} />}
      </Sheet>
    </>
  );
}

function StaffForm({ member, onDone }: { member: StaffMember | null; onDone: () => void }) {
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<"admin" | "super_admin">(member?.role === "super_admin" ? "super_admin" : "admin");
  const [perms, setPerms] = useState<Permission[]>((member?.permissions ?? []) as Permission[]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form className="grid gap-5 p-5 sm:p-6" onSubmit={(e) => {
      e.preventDefault();
      setError(null);
      start(async () => {
        const r = await setStaff({ email, role, permissions: perms });
        if (r.ok) { toast.success(r.message); onDone(); } else setError(r.error);
      });
    }}>
      <Field label="Email" htmlFor="staff-email" hint={member ? undefined : "They need a Herufi account first. Ask them to sign up on the store, then add them here."}>
        <Input id="staff-email" type="email" required value={email} disabled={!!member} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Role</p>
        <div className="grid grid-cols-2 gap-2">
          {(["admin", "super_admin"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={cn("rounded-xl border p-3 text-left text-sm", role === r ? "border-foreground bg-surface-2" : "border-border hover:border-foreground")}>
              <span className="block font-medium">{ROLE_LABEL[r]}</span>
              <span className="text-xs text-muted">{r === "admin" ? "Only the permissions you choose" : "Everything, including managing staff"}</span>
            </button>
          ))}
        </div>
      </div>
      {role === "admin" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Permissions</p>
            <button type="button" className="text-xs text-muted underline" onClick={() => setPerms(perms.length === PERMISSIONS.length ? [] : PERMISSIONS.map((p) => p.key))}>
              {perms.length === PERMISSIONS.length ? "Clear all" : "Select all"}
            </button>
          </div>
          {GROUPS.map((g) => (
            <fieldset key={g}>
              <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{g}</legend>
              <div className="space-y-1.5">
                {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                  <label key={p.key} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-surface-2">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-foreground)]" checked={perms.includes(p.key)}
                      onChange={(e) => setPerms(e.target.checked ? [...perms, p.key] : perms.filter((x) => x !== p.key))} />
                    <span className="text-sm"><span className="block font-medium">{p.label}</span><span className="text-xs text-muted">{p.hint}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">Every admin can always see the discount codes assigned to them and the orders made with those codes.</p>
        </div>
      ) : (
        <p className="rounded-xl bg-sale-soft p-3 text-sm text-sale">Super admins have full control, including adding and removing other super admins. Only give this to people you fully trust.</p>
      )}
      {error && <p className="text-sm text-sale">{error}</p>}
      <Button type="submit" size="lg" loading={pending}>{member ? "Save access" : "Add to staff"}</Button>
    </form>
  );
}
