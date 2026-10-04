-- UNIsport — what a Match card shows besides the score (owner, 2026-10-04)
-- ---------------------------------------------------------------------------
-- The Match cards should say whether somebody is VARSITY or a MENTOR, and
-- everything they train — not just their main activity. The matching RPCs
-- don't carry any of that, so this hands it back for a short list of ids:
--
--   varsity          approved member of a varsity squad — the same yes/no
--                    get_public_profile already gives (db/public_profile.sql),
--                    never which team or role
--   mentor           mentorFreshmen OR helpOthers, as on the profile badge
--   activity_other   what "Other" means when it is their MAIN activity
--                    ("Climbing"), so a card never just says "Other"
--   other_activities their extras, as [{key, note}] — no frequency
--
-- All of it is already visible on the person's profile or used in matching.
-- Signed-in only; at most 200 ids per call. Idempotent.
-- UNDO: drop function if exists public.people_cards(uuid[]);

create or replace function public.people_cards(p_ids uuid[])
returns table (
  id uuid,
  varsity boolean,
  mentor boolean,
  activity_other text,
  other_activities jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         exists (
           select 1 from public.varsity_members m
            where m.user_id = p.id and m.status = 'approved'
         ),
         coalesce((p.data ->> 'mentorFreshmen')::boolean, false)
           or coalesce((p.data ->> 'helpOthers')::boolean, false),
         nullif(p.data ->> 'activityOther', ''),
         coalesce(
           (select jsonb_agg(jsonb_build_object('key', o ->> 'key', 'note', coalesce(o ->> 'note', '')))
              from jsonb_array_elements(
                     case when jsonb_typeof(p.data -> 'otherActivities') = 'array'
                          then p.data -> 'otherActivities' else '[]'::jsonb end
                   ) o),
           '[]'::jsonb
         )
    from public.profiles p
   where auth.uid() is not null
     and p.id = any (p_ids[1:200]);
$$;

revoke execute on function public.people_cards(uuid[]) from public, anon;
grant  execute on function public.people_cards(uuid[]) to authenticated;
