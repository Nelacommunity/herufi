/**
 * Business details shown on the policy pages (refunds, terms, privacy…) and the contact page.
 * Set these in .env.local (NEXT_PUBLIC_BUSINESS_* / NEXT_PUBLIC_SUPPORT_*); empty registration fields are simply left out.
 */
export const BUSINESS = {
  brand: "Herufi",
  /** Registered company name as on the BRELA certificate, e.g. "Herufi Trading Company Limited". */
  legalName: process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME ?? "",
  /** BRELA registration (incorporation) number. */
  registrationNumber: process.env.NEXT_PUBLIC_BUSINESS_REG_NUMBER ?? "",
  /** TRA Taxpayer Identification Number. */
  tin: process.env.NEXT_PUBLIC_BUSINESS_TIN ?? "",
  /** TRA VAT registration number (VRN), if VAT-registered. */
  vrn: process.env.NEXT_PUBLIC_BUSINESS_VRN ?? "",
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "Mikocheni B, Dar es Salaam, Tanzania",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@herufi.co.tz",
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+255 754 000 123",
  hours: { en: "every day, 8am to 8pm EAT", sw: "kila siku, saa 2 asubuhi hadi saa 2 usiku" },
} as const;

/** Name used in legal text: the registered name when set, otherwise the brand. */
export const LEGAL_NAME = BUSINESS.legalName || BUSINESS.brand;

/** Replace {brand}, {legal}, {email}, {phone}, {address} and {hours} in policy text. */
export function fillBusiness(text: string, locale: "en" | "sw") {
  return text
    .replaceAll("{brand}", BUSINESS.brand)
    .replaceAll("{legal}", LEGAL_NAME)
    .replaceAll("{email}", BUSINESS.email)
    .replaceAll("{phone}", BUSINESS.phone)
    .replaceAll("{address}", BUSINESS.address)
    .replaceAll("{hours}", BUSINESS.hours[locale]);
}

/** Registration lines that have been filled in, for the "Company details" section. */
export function companyDetails(locale: "en" | "sw") {
  const L = locale === "sw"
    ? { name: "Jina la kampuni", reg: "Namba ya usajili (BRELA)", tin: "TIN", vrn: "VRN", address: "Anwani" }
    : { name: "Registered name", reg: "Registration number (BRELA)", tin: "TIN", vrn: "VAT number (VRN)", address: "Address" };
  return [
    BUSINESS.legalName && `${L.name}: ${BUSINESS.legalName}`,
    BUSINESS.registrationNumber && `${L.reg}: ${BUSINESS.registrationNumber}`,
    BUSINESS.tin && `${L.tin}: ${BUSINESS.tin}`,
    BUSINESS.vrn && `${L.vrn}: ${BUSINESS.vrn}`,
    `${L.address}: ${BUSINESS.address}`,
  ].filter(Boolean) as string[];
}
