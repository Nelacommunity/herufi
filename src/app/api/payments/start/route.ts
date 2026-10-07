import { NextResponse, type NextRequest } from "next/server";
import { startPayment } from "@/actions/checkout";

/** JSON endpoint for the mobile app. Secrets stay on the server; the app only sends order number + email + phone. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  const result = await startPayment(body);
  return NextResponse.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
}
