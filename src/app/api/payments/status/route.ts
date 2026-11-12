import { NextResponse, type NextRequest } from "next/server";
import { getPaymentStatus } from "@/actions/checkout";

/** Polled by the mobile app while the customer confirms the mobile-money prompt. */
export async function GET(request: NextRequest) {
  const order = request.nextUrl.searchParams.get("order") ?? "";
  const email = request.nextUrl.searchParams.get("email") ?? "";
  if (!order || !email) return NextResponse.json({ status: "pending" }, { status: 400 });
  const status = await getPaymentStatus(order, email);
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
