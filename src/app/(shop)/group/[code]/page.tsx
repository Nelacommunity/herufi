import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock, Smartphone, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { JoinGroupButton } from "@/components/product/join-group-button";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { fmt } from "@/i18n/config";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type GroupInfo = {
  code: string; status: "open" | "complete" | "expired"; size: number; joined: number;
  members: { initial: string; leader: boolean; me: boolean }[];
  expires_at: string; hours: number; price_until: string | null; unit_price: number;
  am_member: boolean; used: boolean; can_buy: boolean;
  product: { slug: string; name: string; brand: string; price: number; image: string | null; in_stock: boolean } | null;
};

async function load(code: string) {
  if (!/^[A-Za-z0-9]{6,12}$/.test(code)) return null;
  const supabase = await createClient();
  const [{ data }, { data: { user } }] = await Promise.all([supabase.rpc("group_info", { p_code: code }), supabase.auth.getUser()]);
  return { group: (data ?? null) as GroupInfo | null, signedIn: Boolean(user) };
}

export async function generateMetadata({ params }: PageProps<"/group/[code]">): Promise<Metadata> {
  const { code } = await params;
  const [res, { t }] = await Promise.all([load(code), getI18n()]);
  const g = res?.group;
  if (!g?.product) return { title: t.group.title, robots: { index: false } };
  return {
    title: `${g.product.name} · ${t.group.groupPrice} ${formatPrice(g.unit_price)}`,
    description: fmt(t.group.how, { n: g.size, hours: g.hours, price: formatPrice(g.unit_price) }),
    robots: { index: false },
    openGraph: g.product.image ? { images: [g.product.image] } : undefined,
  };
}

function remaining(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const h = Math.max(0, Math.floor(ms / 3_600_000)), m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function GroupPage({ params }: PageProps<"/group/[code]">) {
  const { code } = await params;
  const [res, { t, locale }] = await Promise.all([load(code), getI18n()]);
  const g = res?.group;
  const tg = t.group;

  if (!g?.product) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">{tg.title}</h1>
        <p className="mt-3 text-muted">{tg.notFound}</p>
        <Link href="/products" className={cn(buttonVariants({ variant: "secondary" }), "mt-6")}>{t.common.shopNow}</Link>
      </div>
    );
  }
  const p = g.product;
  const left = g.size - g.joined;

  return (
    <div className="container-page max-w-lg py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">{tg.title}</p>
      <div className="mt-4 flex gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {p.image && <Image src={p.image} alt={p.name} fill sizes="96px" className="object-cover" />}
        </div>
        <div className="min-w-0">
          <Link href={`/products/${p.slug}`} className="line-clamp-2 font-medium hover:underline">{p.name}</Link>
          <p className="mt-2 text-xl font-semibold text-sale">{formatPrice(g.unit_price)} <span className="text-sm font-normal text-muted">{tg.groupPrice}</span></p>
          <p className="text-sm text-muted">{tg.alone}: <s>{formatPrice(p.price)}</s> · {fmt(tg.save, { amount: formatPrice(p.price - g.unit_price) })}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        {Array.from({ length: g.size }, (_, i) => g.members[i]).map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={cn("grid h-14 w-14 place-items-center rounded-full text-lg font-semibold",
              m ? "bg-foreground text-background" : "border-2 border-dashed border-border-strong text-muted")}>
              {m ? m.initial : <Users className="h-5 w-5" />}
            </span>
            <span className="h-4 text-xs text-muted">{m?.me ? tg.you : m?.leader ? tg.leader : ""}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        {g.status === "open" && (
          <p className="inline-flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4" /> {fmt(tg.toGo, { n: left })} · {fmt(tg.endsIn, { time: remaining(g.expires_at) })}</p>
        )}
        {g.status === "complete" && <p className="inline-flex items-center gap-2 font-semibold text-success"><Check className="h-4 w-4" /> {tg.complete}</p>}
        {g.status === "expired" && <p className="text-muted">{tg.expired}</p>}
      </div>

      <div className="mt-6 grid gap-3">
        {g.status === "open" && !g.am_member && (res!.signedIn
          ? <JoinGroupButton code={g.code} label={`${tg.join} · ${formatPrice(g.unit_price)}`} />
          : <Link href={`/login?next=${encodeURIComponent(`/group/${g.code}`)}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>{tg.signInToJoin}</Link>)}
        {g.status === "open" && g.am_member && <p className="text-center text-sm text-muted">{tg.joined}</p>}
        {g.can_buy && (
          <>
            <p className="text-center text-sm text-muted">{fmt(tg.completeDesc, { date: formatDate(g.price_until!, "long", locale) })}</p>
            <Link href={`/products/${p.slug}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>{tg.buy}</Link>
          </>
        )}
        {g.used && <p className="text-center text-sm text-muted">{tg.used}</p>}
        {g.status === "complete" && !g.am_member && <p className="text-center text-sm text-muted">{tg.full}</p>}
        {g.status === "expired" && <Link href={`/products/${p.slug}`} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}>{tg.startNew}</Link>}
        <a href={`herufi://group/${g.code}`} className={cn(buttonVariants({ variant: "secondary" }), "w-full")}><Smartphone className="h-4 w-4" /> {tg.openInApp}</a>
      </div>

      <p className="mt-8 text-center text-sm text-muted">{fmt(tg.how, { n: g.size, hours: g.hours, price: formatPrice(g.unit_price) })}</p>
    </div>
  );
}
