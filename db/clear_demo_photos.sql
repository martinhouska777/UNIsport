-- ============================================================================
-- UNIsport — take the photos off the demo account's Memories
-- ----------------------------------------------------------------------------
-- Owner, 2026-09-15: "we need to delete the photos from Memories" — on
-- martinhouska701@gmail.com, the screenshot account. Memories is nothing but
-- the photos on workout_logs.photos (lib/memories.ts), so emptying that column
-- empties the gallery while every session, gym, partner and note stays.
--
-- Only this one account. Nothing else is touched — not the demo campus's logs,
-- not the owner's own account.
--
-- The files themselves stay in Storage. They are no longer referenced anywhere,
-- so nothing shows them; remove them from the Supabase dashboard if the space
-- matters.
--
-- NOT REVERSIBLE: the photo URLs are gone from the rows once this runs.
-- ============================================================================

with me as (
  select id from auth.users where lower(email) = 'martinhouska701@gmail.com'
),
cleared as (
  update public.workout_logs w
     set photos = '[]'::jsonb
    from me
   where w.user_id = me.id
     and jsonb_array_length(coalesce(w.photos, '[]'::jsonb)) > 0
  returning w.id
)
select count(*) as sessions_cleared from cleared;
