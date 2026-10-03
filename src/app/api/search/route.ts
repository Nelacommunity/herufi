import { NextResponse, type NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { SearchSuggestion } from "@/lib/types";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ products: [] });

  try {
    const db = createPublicClient(120);
    const { data, error } = await db.rpc("search_suggestions", { q, max_results: 6 });
    if (error) throw error;
    const products = ((data ?? []) as SearchSuggestion[]).map((p) => ({ ...p, price: Number(p.price), compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price) }));
    return NextResponse.json({ products }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ products: [], error: "Search is temporarily unavailable" }, { status: 503 });
  }
}
