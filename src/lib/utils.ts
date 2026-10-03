import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tzs = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 });
const tzsCompact = new Intl.NumberFormat("en-TZ", { style: "currency", currency: "TZS", notation: "compact", maximumFractionDigits: 1 });
const INTL: Record<string, string> = { en: "en-TZ", sw: "sw-TZ" };

/** Tanzanian shillings, no decimals: "TSh 725,000". `compact` gives "TSh 725K". */
export function formatPrice(value: number | string | null | undefined, opts: { compact?: boolean } = {}) {
  const n = Math.round(Number(value ?? 0));
  return (opts.compact ? tzsCompact : tzs).format(n);
}

export function formatDate(value: string | Date, style: "short" | "long" = "short", locale = "en") {
  return new Intl.DateTimeFormat(INTL[locale] ?? locale, style === "long"
    ? { dateStyle: "long" }
    : { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatRelative(value: string | Date, locale = "en") {
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, secs] of units) if (diff >= secs) return rtf.format(-Math.floor(diff / secs), unit);
  return rtf.format(0, "second");
}

export function slugify(input: string) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

/** Display name for a category, translated when the dictionary knows the slug. */
export function categoryName(names: Record<string, string>, c: { slug: string; name: string }) {
  return names[c.slug] ?? c.name;
}

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function initials(name: string | null | undefined, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2)).toUpperCase();
}
