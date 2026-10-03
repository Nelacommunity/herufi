import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";
import { getI18n } from "@/i18n/server";

/** Completes OAuth, magic-link, signup-confirmation and password-recovery flows (PKCE). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/account");
  const providerError = searchParams.get("error_description");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  const message = providerError ?? (await getI18n()).t.auth.errors.link;
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
}
