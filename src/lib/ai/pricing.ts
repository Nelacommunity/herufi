/**
 * Pricing for imported products: Chinese yuan → Tanzanian shillings at the live rate, times the markup.
 * Pure functions (no server-only imports) so they can be unit-tested and reused.
 */

/** Markup on the supplier price. 3 = sell at three times what it costs in China. Override with AI_PRICE_MULTIPLIER. */
export const DEFAULT_MULTIPLIER = 3;
/** Prices are rounded up to a clean amount (TSh 500 steps by default). Override with AI_PRICE_ROUNDING. */
export const DEFAULT_ROUNDING = 500;

export type PricingRule = { rate: number; multiplier: number; rounding: number };

/** Selling price in TSh for a yuan amount, rounded up to the next clean step. */
export function tzsFromCny(cny: number, rule: PricingRule): number {
  if (!(cny > 0)) return 0;
  const raw = cny * rule.rate * rule.multiplier;
  return Math.ceil(raw / rule.rounding) * rule.rounding;
}
