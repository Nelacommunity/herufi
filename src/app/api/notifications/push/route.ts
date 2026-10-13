import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { sendPendingPushes } from "@/lib/push";

/**
 * Sends pending notifications to phones (see src/lib/push.ts). It only delivers what the database has already
 * queued, so calling it early is harmless.
 *   GET  — Vercel Cron, with `Authorization: Bearer $CRON_SECRET`.
 *   POST — the apps, right after something that may queue a notification, with the shopper's or admin's
 *          `Authorization: Bearer <access token>`.
 */
export const maxDuration = 60;

const recent = new Map<string, number>(); // last call per user (per server instance)

async function run() {
  try {
    return NextResponse.json(await sendPendingPushes());
  } catch (e) {
    console.error("[push] failed", e);
    return NextResponse.json({ error: "Couldn't send notifications." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const now = Date.now();
  if (now - (recent.get(user.id) ?? 0) < 5000) return NextResponse.json({ sent: 0, skipped: "too soon" });
  recent.set(user.id, now);
  return run();
}
