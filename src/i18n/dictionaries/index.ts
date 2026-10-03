import type { Locale } from "@/i18n/config";
import en, { type Dictionary } from "./en";
import sw from "./sw";

export type { Dictionary };
export const dictionaries: Record<Locale, Dictionary> = { en, sw };
