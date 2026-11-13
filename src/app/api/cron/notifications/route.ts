import { NextResponse, type NextRequest } from "next/server";
import { retryPendingNotifications } from "@/lib/notifications";
import { cleanUpFailedOrders } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Retries order emails that failed (e.g. Resend was briefly down). Run by Vercel Cron
 * (vercel.json); Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [emails, orders] = await Promise.all([retryPendingNotifications(), cleanUpFailedOrders(100)]);
  return NextResponse.json({ ...emails, failedOrdersDeleted: orders.deleted });
}
