import { z } from "zod";

export const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  line1: z.string().trim().min(3, "Enter your street address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter your city").max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().length(2, "Choose a country"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{9,20}$/, "Enter a valid phone number"),
});
export type AddressInput = z.infer<typeof addressSchema>;

/** We deliver within Tanzania only. */
export const COUNTRIES = [["TZ", "Tanzania"]] as const;

/** Tanzanian mobile numbers: 06/07xx xxx xxx or +255 6/7xx xxx xxx. */
export function isTzMobile(value: string) {
  return /^(?:\+?255|0)[67]\d{8}$/.test(value.replace(/[\s()-]/g, ""));
}

