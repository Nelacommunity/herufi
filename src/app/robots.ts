import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";

const PRIVATE = ["/admin", "/account", "/checkout", "/cart", "/wishlist", "/api/", "/auth/", "/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Search engines and AI answer engines are welcome on public pages (that's how Herufi gets
 * cited in Google, ChatGPT, Claude, Perplexity and Copilot answers); private pages are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: aiCrawlers, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
