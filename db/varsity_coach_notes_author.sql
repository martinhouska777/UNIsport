-- UNIsport — Varsity coach notes: WHO WROTE IT
-- ---------------------------------------------------------------------------
-- The per-athlete note (db/varsity_coach_notes.sql) said only "the coach".
-- On a squad with a head coach and two assistants that is not enough: "work
-- the catch" from one of them is a different instruction than from another.
-- The card on the athlete's Home now signs the note, so these two columns say
-- who said it.
--
--   coach_id    the account that wrote it. Null for notes written before this,
--               and kept (set null) if that account is ever deleted — the
--               words were still said, and the name below still says by whom.
--   coach_name  their display name AS IT READ WHEN THEY WROTE IT. Stored, not
--               looked up: profiles are behind RLS, so an athlete cannot read
--               their coach's row, and a note should keep its signature even
--               after that coach leaves the squad.
--
-- Safe to run more than once. Run in the Supabase SQL editor.

alter table public.varsity_coach_notes
  add column if not exists coach_id   uuid references public.profiles (id) on delete set null,
  add column if not exists coach_name text not null default '';
