import { NextResponse, type NextRequest } from "next/server";
import { createClient as createTokenClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { ImportError, importFromScreenshots } from "@/lib/ai/product-import";

/**
 * POST /api/admin/ai-import  (multipart form, field "images": 1–8 screenshots)
 * Reads shop screenshots with Gemini and returns TSh-priced product drafts. Nothing is published here.
 *
 * Auth: the Herufi Admin app sends `Authorization: Bearer <access token>`; the website uses its session cookie.
 * Only active staff with the "Create products" permission may call it. Uploaded crops go to storage as that user
 * (the storage policy enforces the same permission).
 */
export const maxDuration = 120;

const MAX_IMAGES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const WINDOW_MS = 60 * 60 * 1000;
const PER_HOUR = 30;
const recent = new Map<string, number[]>(); // per-user request times (per server instance)

async function clientFor(request: NextRequest): Promise<SupabaseClient> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (token) {
    return createTokenClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return (await createCookieClient()) as unknown as SupabaseClient;
}

export async function POST(request: NextRequest) {
  const db = await clientFor(request);
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const { data: { user } } = token ? await db.auth.getUser(token) : await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  // Permission check runs in the database with the caller's own session.
  const { data: allowed, error: permError } = await db.rpc("has_permission", { p: "products.create" });
  if (permError || allowed !== true) return NextResponse.json({ error: "You need the “Create products” permission." }, { status: 403 });

  const now = Date.now();
  const times = (recent.get(user.id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= PER_HOUR) return NextResponse.json({ error: "Too many imports this hour. Try again later." }, { status: 429 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "Send the screenshots as a form upload." }, { status: 400 }); }
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "Add at least one screenshot." }, { status: 400 });
  if (files.length > MAX_IMAGES) return NextResponse.json({ error: `Use at most ${MAX_IMAGES} screenshots at a time.` }, { status: 400 });
  for (const f of files) {
    if (!TYPES.has(f.type)) return NextResponse.json({ error: `${f.name || "A file"} isn't a JPEG, PNG or WebP image.` }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `${f.name || "A file"} is larger than 8 MB.` }, { status: 400 });
  }

  recent.set(user.id, [...times, now]);
  try {
    const images = await Promise.all(files.map(async (f) => ({ data: Buffer.from(await f.arrayBuffer()), mimeType: f.type })));
    const result = await importFromScreenshots(images, db);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("ai-import failed", e);
    return NextResponse.json({ error: "Something went wrong reading these screenshots. Try again." }, { status: 500 });
  }
}
