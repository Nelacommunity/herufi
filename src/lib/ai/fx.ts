import "server-only";

/**
 * Live CNY → TZS exchange rate. Uses the free open.er-api.com feed (no key), cached for an hour.
 * If it can't be reached, falls back to CNY_TZS_RATE from the environment (set it as a safety net).
 */
export type FxRate = { rate: number; source: "live" | "fallback"; updatedAt: string | null };

export async function getCnyToTzs(): Promise<FxRate> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/CNY", { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
      const rate = data.rates?.TZS;
      if (data.result === "success" && typeof rate === "number" && rate > 50 && rate < 5000) {
        return { rate, source: "live", updatedAt: data.time_last_update_utc ?? null };
      }
    }
  } catch {
    /* fall through to the configured rate */
  }
  const fallback = Number(process.env.CNY_TZS_RATE);
  if (fallback > 0) return { rate: fallback, source: "fallback", updatedAt: null };
  throw new Error("Couldn't get the yuan exchange rate. Try again, or set CNY_TZS_RATE in the server settings.");
}
