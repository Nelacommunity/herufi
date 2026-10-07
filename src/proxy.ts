import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimisation, metadata files and the public search API.
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|manifest.webmanifest|robots.txt|sitemap.xml|llms.txt|llms-full.txt|api/search|api/snippe|api/payments|api/admin/order-notify|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
