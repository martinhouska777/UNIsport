-- ============================================================================
-- UNIsport — auto-confirm new sign-ups (skip the email-confirmation step)
-- ----------------------------------------------------------------------------
-- For sharing the app, we want anyone with the link to sign up and start using
-- it immediately, without having to click a confirmation email.
--
-- Supabase's "Confirm email" switch lives in the Auth dashboard, but we make the
-- outcome bulletproof at the DATABASE level: a trigger stamps every new
-- auth.users row as email-confirmed the moment it's created, so login works
-- right away even if that dashboard switch is ever turned back on.
--
-- NOTE: auth.users.confirmed_at is a GENERATED column (derived from
-- email/phone confirmed_at), so we set ONLY email_confirmed_at.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm_email on auth.users;
create trigger trg_auto_confirm_email
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- Confirm any existing accounts that somehow slipped through unconfirmed.
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
