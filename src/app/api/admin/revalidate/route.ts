import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { CATALOG_TAG } from "@/lib/supabase/public";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Called by the Herufi Admin mobile app after it edits the catalog, so the storefront shows changes right away
 * instead of after the 5-minute cache window. The caller's Supabase access token must belong to active staff (admin or super admin).
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: profile } = await db.from("profiles").select("role, status").eq("user_id", user.id).maybeSingle();
  if ((profile?.role !== "admin" && profile?.role !== "super_admin") || profile.status !== "active") return NextResponse.json({ ok: false }, { status: 403 });

  revalidateTag(CATALOG_TAG, "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
