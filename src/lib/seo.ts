import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/env";
import { SITE } from "@/lib/constants";

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

/**
 * Open Graph + Twitter tags for a page. Next.js replaces (doesn't merge) a parent's openGraph
 * object, so every page builds the full set here: site name, locale and its own URL, which is
 * what WhatsApp, Facebook, LinkedIn, Telegram and X show in the link preview. The preview image
 * comes from the nearest opengraph-image file.
 */
export function socialMeta(o: { title: string; description: string; path: string; locale: Locale; type?: "website" | "article"; publishedTime?: string; modifiedTime?: string }): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: o.type ?? "website",
      siteName: SITE.name,
      title: o.title,
      description: o.description,
      url: localizedPath(o.path, o.locale),
      locale: o.locale === "sw" ? "sw_TZ" : "en_TZ",
      alternateLocale: o.locale === "sw" ? ["en_TZ"] : ["sw_TZ"],
      ...(o.publishedTime && { publishedTime: o.publishedTime }),
      ...(o.modifiedTime && { modifiedTime: o.modifiedTime }),
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description },
  };
}

/** The site-wide preview card, for pages without their own opengraph-image file. */
export const DEFAULT_SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, type: "image/jpeg", alt: `${SITE.name}: buy from China, delivered to Tanzania` };

/** socialMeta plus the site-wide card. Use on pages that have no opengraph-image of their own. */
export function socialMetaWithImage(o: Parameters<typeof socialMeta>[0]): Pick<Metadata, "openGraph" | "twitter"> {
  const m = socialMeta(o);
  return { openGraph: { ...m.openGraph, images: [DEFAULT_SHARE_IMAGE] }, twitter: { ...m.twitter, images: [DEFAULT_SHARE_IMAGE.url] } };
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Props for a JSON-LD <script>; escapes "<" so content can't break out of the tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
