-- ============================================================================
-- UNIsport — Follow lists (Slice: followers on somebody else's profile)
-- ----------------------------------------------------------------------------
-- The other-person profile used to show only the Follow button. Now it shows
-- how many people follow them and how many they follow, and either number
-- opens the list — the way Instagram does it. The owner's own Followers stat
-- opens the same list for themselves.
--
-- SECURITY: `follows` has RLS with no policies (db/follows.sql), so both reads
-- are SECURITY DEFINER functions. They return a few PUBLIC fields per person
-- (the same ones the Match card already shows) and only to signed-in callers.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- Both totals for any profile (follow_status only had their follower count).
create or replace function public.follow_counts(target uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.follows where followee_id = target)::int,
    (select count(*) from public.follows where follower_id = target)::int
  where auth.uid() is not null;
$$;

-- The people behind one of those numbers. kind = 'followers' (who follows
-- `target`) or 'following' (who `target` follows). Newest first. `following`
-- says whether the CALLER already follows that person, so the list can show a
-- Follow button on the rows that need one.
create or replace function public.follow_list(target uuid, kind text)
returns table (
  id uuid,
  name text,
  photo text,
  residence text,
  class_year text,
  following boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.data->>'name',
    p.data->>'photo',
    p.data->>'residence',
    p.data->>'classYear',
    exists (select 1 from public.follows x
            where x.follower_id = auth.uid() and x.followee_id = p.id)
  from public.follows f
  join public.profiles p
    on p.id = case when kind = 'followers' then f.follower_id else f.followee_id end
  where auth.uid() is not null
    and kind in ('followers', 'following')
    and (case when kind = 'followers' then f.followee_id else f.follower_id end) = target
    and p.onboarding_completed = true
  order by f.created_at desc;
$$;

grant execute on function public.follow_counts(uuid)      to authenticated;
grant execute on function public.follow_list(uuid, text)  to authenticated;
