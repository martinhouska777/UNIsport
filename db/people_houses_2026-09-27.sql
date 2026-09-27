-- UNIsport — whose house is whose, for the avatars (launch audit 2026-09-27, item 10)
-- ---------------------------------------------------------------------------
-- A person's avatar wore their house colours on Match and a pale school-colour
-- circle in Messages, so the same person looked like two people. The chat list
-- only knows ids and names (dm_list), so this hands back the one thing the
-- avatar needs — house and class year — for a short list of ids. Both are
-- already public inside the app (leaderboards, profiles, Match).
--
-- Signed-in only; at most 200 ids per call. Idempotent.
-- UNDO: drop function if exists public.people_houses(uuid[]);

create or replace function public.people_houses(p_ids uuid[])
returns table (id uuid, residence text, class_year text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         nullif(p.data ->> 'residence', ''),
         nullif(p.data ->> 'classYear', '')
    from public.profiles p
   where auth.uid() is not null
     and p.id = any (p_ids[1:200]);
$$;

revoke execute on function public.people_houses(uuid[]) from public, anon;
grant  execute on function public.people_houses(uuid[]) to authenticated;
