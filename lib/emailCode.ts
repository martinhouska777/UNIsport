/*
  THE EMAIL CODE: the same 6 digits at sign-up (app/login) and on the waitlist
  (app/waitlist), so both screens say and accept exactly the same thing.

  The two numbers mirror Supabase dashboard settings (Authentication → Sign In /
  Providers → Email): "Email OTP Length", and the SMTP "minimum interval per
  user", which is why a new code can only be asked for once a minute.
*/
export const CODE_LENGTH = 6;
export const RESEND_SECONDS = 60;

/** What to say when Supabase turns a code down. */
export function codeError(message: string): string {
  return /expired|invalid/i.test(message)
    ? "That code is wrong or has expired. Check it, or send a new one."
    : message;
}
