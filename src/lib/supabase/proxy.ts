import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

const PROTECTED = ["/account", "/admin"];

/** Refreshes the auth session cookie and guards signed-in areas. */
export async function updateSession(request: NextRequest) {
  // ?lang=sw|en gives search engines (which don't keep cookies) a crawlable URL per language.
  const lang = request.nextUrl.searchParams.get("lang");
  const forcedLocale = isLocale(lang) ? lang : null;
  if (forcedLocale) request.cookies.set(LOCALE_COOKIE, forcedLocale);
  const withLocale = (res: NextResponse) => {
    if (forcedLocale) res.cookies.set(LOCALE_COOKIE, forcedLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  };

  let response = NextResponse.next({ request });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return withLocale(response);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withLocale(NextResponse.redirect(url));
  }

  if (signedIn && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get("next")?.startsWith("/") ? request.nextUrl.searchParams.get("next")! : "/account";
    url.search = "";
    return withLocale(NextResponse.redirect(url));
  }

  return withLocale(response);
}
