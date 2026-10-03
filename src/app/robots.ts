import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/cart", "/wishlist", "/api/", "/auth/", "/login", "/signup"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
