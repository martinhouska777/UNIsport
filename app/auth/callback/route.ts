import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isUniversityEmail } from "@/lib/universityEmail";

/*
  Auth callback for Google (and PKCE magic links: ?code=) and email-confirm
  style links (?token_hash=&type=).

  IMPORTANT: the auth session cookies are written DIRECTLY onto the redirect
  response (response.cookies.set), not via next/headers cookies() — otherwise the
  Set-Cookie headers don't ride along with the redirect and the browser never
  stores the session (you'd land back on the login page with no error). We can't
  know the destination until after the code exchange, so the cookies are parked
  in `pending` and applied to the redirect once it's built.
*/
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const failure = NextResponse.redirect(`${origin}/?auth_error=1`);
  if (!code && !(tokenHash && type)) return failure;

  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pending.push(...cookiesToSet);
        },
      },
    }
  );

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash as string });

  if (error) return failure;

  /*
    The profile row, which answers two questions at once: whether this account
    is NEW (Google hands us a session either way — nothing else here tells the
    two apart, and there is no trigger creating profile rows, so "no row" means
    the account has never been set up), and whether onboarding is done.
  */
  const userId = data.user?.id;
  let profile: { onboarding_completed: boolean } | null = null;
  let profileUnknown = true; // couldn't read it — don't act on a guess
  if (userId) {
    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();
    if (!profileError) {
      profile = row;
      profileUnknown = false;
    }
  }

  /*
    The same university-email rule the email/password sign-up applies — Google
    would otherwise be the way around it, since any gmail address can start an
    OAuth flow and the page promises ".edu".

    Only a NEW account is turned away (no profile row): someone already set up
    keeps their access whatever address they joined with. Sign them straight
    back out, so a refused visitor is not left holding a half-session. And if
    the profile read failed, let them through — an RLS hiccup or a network blip
    must not lock out a real student.
  */
  if (!profileUnknown && !profile && !isUniversityEmail(data.user?.email ?? "")) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?auth_error=university`);
  }

  /*
    Where to land. A link that asked for a specific page (email confirmations
    carry ?next=) wins. Otherwise go INTO the app: returning to "/" dropped
    Google users on the logged-out landing page, which reads as a failed
    sign-in even though the session was created — then "Get started" bounced
    them in via /login, which felt like being signed in out of nowhere.

    If we can't tell whether onboarding is done (RLS, a missing row, a network
    blip), send them to /gyms: the Zone 2 layout re-checks on the client and
    forwards to /onboarding when it isn't. Guessing /onboarding instead would
    push a returning user back through the whole flow.
  */
  let destination = next;
  if (!destination) {
    destination = profileUnknown || profile?.onboarding_completed ? "/gyms" : "/onboarding";
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
