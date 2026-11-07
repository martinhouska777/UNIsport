# Sign in with Apple

The App Store asks for Sign in with Apple because the app has Continue with Google
(App Review Guideline 4.8). Google stays: those are the university's own Google
accounts. The code is in place since 2026-11-07 and the button stays hidden until
the steps below are done.

## How it works

1. **Continue with Apple** on the sign-in page (`app/login/page.tsx`) appears when
   `NEXT_PUBLIC_APPLE_SIGNIN=1`.
2. A returning account signs straight in.
3. A **new** Apple account almost never comes with a .edu address (Apple gives the
   Apple ID address or a hidden `@privaterelay.appleid.com` one). It stays signed in
   and goes to **/verify-school** (`app/verify-school/page.tsx`): the university
   email, then the 6-digit code sent to it. The code makes that address the
   account's own, so from then on it is the same as an email sign-up.
4. Until then every other page sends it back to /verify-school
   (`components/AppState.tsx`, `needsSchoolAddress` in `lib/universityEmail.ts`).
5. A university address that already has an account gets "This email already has
   an account. Log in with it." and a Log in button.

## Steps (once the Apple Developer Program is paid, $99 a year)

**Apple** (developer.apple.com > Certificates, Identifiers & Profiles)

1. Identifiers > **App ID**, for example `com.getunisport.app`, with **Sign in with
   Apple** ticked.
2. Identifiers > **Services ID**, for example `com.getunisport.web`. Tick Sign in
   with Apple, Configure:
   - Primary App ID: the App ID above
   - Domains: `wavxyrgtaotrhnyepyor.supabase.co`
   - Return URL: `https://wavxyrgtaotrhnyepyor.supabase.co/auth/v1/callback`
3. Keys > new key with **Sign in with Apple**. Download the `.p8` file once and
   write down the **Key ID** and the **Team ID** (top right of the page).

**Supabase** (project wavxyrgtaotrhnyepyor)

4. Authentication > Sign In / Providers > **Apple**: turn it on.
   - Client IDs: the Services ID (and later the app's bundle ID, `com.getunisport.app`)
   - Secret Key: made from the `.p8`, the Key ID, the Team ID and the Services ID
     (Supabase's Apple page links its generator). **It runs out after 6 months**:
     put a reminder in the calendar to make a new one.
5. Authentication > Email Templates > **Change email address**: put the code in
   the email, `{{ .Token }}`, the same way the sign-up email has it.
6. Authentication > Sign In / Providers > Email: turn **Secure email change** off,
   so only the university address gets a code (otherwise the hidden Apple address
   gets one too).

**Vercel** (project un-isport)

7. Settings > Environment Variables: `NEXT_PUBLIC_APPLE_SIGNIN` = `1` for
   Production, then redeploy.

## Check

Sign in with an Apple ID that has no .edu address: it should land on "Your
university email", take a college.harvard.edu address and its code, then go on to
onboarding with that address on the account.
