import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

/*
  Auth callback for Google (and PKCE magic links: ?code=) and email-confirm
  style links (?token_hash=&type=).

  IMPORTANT: the auth session cookies are written DIRECTLY onto the redirect
  response (response.cookies.set), not via next/headers cookies() — otherwise the
  Set-Cookie headers don't ride along with the redirect and the browser never
  stores the session (you'd land back on the login page with no error).
*/
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const failure = NextResponse.redirect(`${origin}/?auth_error=1`);
  if (!code && !(tokenHash && type)) return failure;

  // Build the success redirect up front so cookies can be attached to it.
  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash as string });

  return error ? failure : response;
}
