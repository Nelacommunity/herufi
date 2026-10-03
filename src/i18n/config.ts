export const LOCALES = ["en", "sw"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "herufi-locale";
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", sw: "Kiswahili" };
/** BCP-47 tags used for Intl formatting (dates, numbers, TZS). */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-TZ", sw: "sw-TZ" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Fill {placeholders} in a template. */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Pick the singular/plural template for n and fill {n}. */
export function plural(pair: readonly string[], n: number, vars: Record<string, string | number> = {}) {
  return fmt(n === 1 ? pair[0] : pair[1] ?? pair[0], { n: n.toLocaleString("en-US"), ...vars });
}
