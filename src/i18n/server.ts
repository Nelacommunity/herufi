import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";

/** Locale from the cookie, falling back to the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^sw\b|,\s*sw\b/i.test(accept) ? "sw" : DEFAULT_LOCALE;
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
