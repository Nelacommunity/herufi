import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";

/** URL of a page in a given language. English is the default; Swahili uses ?lang=sw (crawlable, cookie-free). */
export function localizedPath(path: string, locale: Locale) {
  if (locale === "en") return path;
  return `${path}${path.includes("?") ? "&" : "?"}lang=sw`;
}

/** Canonical + hreflang alternates for a public page. */
export function pageAlternates(path: string, locale: Locale): Metadata["alternates"] {
  return {
    canonical: localizedPath(path, locale),
    languages: {
      "en-TZ": path,
      "sw-TZ": localizedPath(path, "sw"),
      "x-default": path,
    },
  };
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Props for a JSON-LD <script>; escapes "<" so content can't break out of the tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
