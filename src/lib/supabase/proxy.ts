import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

const PROTECTED = ["/account", "/admin", "/welcome"];

/**
 * Pages a signed-in customer can use before finishing their profile (phone + where they live):
 * the welcome form itself, auth flows, the API, policies/help, and the staff dashboard.
 */
const ONBOARDING_EXEMPT = ["/welcome", "/auth", "/api", "/admin", "/login", "/signup", "/forgot-password", "/reset-password", "/help"];
const under = (pathname: string, list: string[]) => list.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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

  if (!signedIn && under(pathname, PROTECTED)) {
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

  // New accounts (email or Google) must add a phone number and address once. The flag lives in the
  // session token's user_metadata, so this check needs no database call. Only page loads are
  // redirected; server actions and other POSTs pass through.
  const onboarded = (data?.claims?.user_metadata as { onboarded?: boolean } | undefined)?.onboarded === true;
  const isPageLoad = request.method === "GET" && !request.headers.has("next-action");
  if (signedIn && !onboarded && isPageLoad && !under(pathname, ONBOARDING_EXEMPT)) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectWithCookies(url, response, withLocale);
  }
  if (signedIn && onboarded && pathname === "/welcome") {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    const target = next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/welcome") ? new URL(next, request.url) : null;
    url.pathname = target?.pathname ?? "/";
    url.search = target?.search ?? "";
    return redirectWithCookies(url, response, withLocale);
  }

  return withLocale(response);
}

/** Redirect while keeping any refreshed session cookies set on `response`. */
function redirectWithCookies(url: URL, response: NextResponse, withLocale: (r: NextResponse) => NextResponse) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return withLocale(redirect);
}
