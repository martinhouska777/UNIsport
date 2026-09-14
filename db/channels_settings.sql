-- UNIsport — Channel info: members, adding people, rename, leave, delete (slice 3)
-- ===========================================================================
-- Owner, 2026-09-14: tap a channel's name → its settings, "copy the WhatsApp
-- classic group chat settings and make it make sense".
--
-- WHO MAY DO WHAT (the WhatsApp defaults, made simple):
--   • anyone who can see the channel sees its info and member list (a private
--     channel only for its members);
--   • any MEMBER can add people;
--   • the ADMIN — whoever started the channel — can rename it, remove a member
--     and delete it. The five seeded channels have no admin, so nobody can.
--   • leaving is db/messages.sql's channel_leave, for anyone.
--
-- Run AFTER db/channels_private.sql. Safe to re-run.
-- ===========================================================================

-- A private channel is only for its members. Raises if the caller may not look.
create or replace function public.channel_guard(chan_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id) then
    raise exception 'This channel no longer exists.';
  end if;
  if exists (select 1 from public.channels ch where ch.id = chan_id and ch.private)
     and not exists (
       select 1 from public.channel_members mem
       where mem.channel_id = chan_id and mem.user_id = me
     ) then
    raise exception 'This channel is private.';
  end if;
end;
$$;

-- The top of the info screen.
create or replace function public.channel_info(chan_id uuid)
returns table (
  name         text,
  private      boolean,
  member_count integer,
  am_member    boolean,
  am_admin     boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare me uuid := auth.uid();
begin
  perform public.channel_guard(chan_id);
  return query
    select ch.name,
           ch.private,
           (select count(*) from public.channel_members mem where mem.channel_id = ch.id)::int,
           exists (select 1 from public.channel_members mem
                   where mem.channel_id = ch.id and mem.user_id = me),
           coalesce(ch.created_by = me, false)
    from public.channels ch
    where ch.id = chan_id;
end;
$$;

-- Everyone in it: you first, then the admin, then by name.
create or replace function public.channel_members_list(chan_id uuid)
returns table (
  id         uuid,
  name       text,
  residence  text,
  class_year text,
  photo      text,
  is_admin   boolean,
  is_me      boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare me uuid := auth.uid();
begin
  perform public.channel_guard(chan_id);
  return query
    select p.id,
           coalesce(nullif(btrim(p.data->>'name'), ''), 'Member'),
           nullif(p.data->>'residence', ''),
           nullif(p.data->>'classYear', ''),
           nullif(p.data->>'photo', ''),
           coalesce(p.id = ch.created_by, false),
           p.id = me
    from public.channel_members mem
    join public.channels ch on ch.id = mem.channel_id
    join public.profiles p  on p.id = mem.user_id
    where mem.channel_id = chan_id
    order by (p.id = me) desc,
             coalesce(p.id = ch.created_by, false) desc,
             lower(coalesce(p.data->>'name', ''))
    limit 500;
end;
$$;

-- Add people (any member may). Returns how many were new. At most 200 at once.
create or replace function public.channel_add_members(chan_id uuid, member_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  added integer;
begin
  perform public.channel_guard(chan_id);
  if not exists (select 1 from public.channel_members mem
                 where mem.channel_id = chan_id and mem.user_id = me) then
    raise exception 'Join the channel to add people.';
  end if;
  if coalesce(cardinality(member_ids), 0) > 200 then
    raise exception 'Add at most 200 people at once.';
  end if;
  insert into public.channel_members (channel_id, user_id)
    select chan_id, p.id
    from public.profiles p
    where p.id = any(coalesce(member_ids, '{}'))
    on conflict (channel_id, user_id) do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;

-- Remove someone (the admin only, and never themselves — they delete instead).
create or replace function public.channel_remove_member(chan_id uuid, member_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  perform public.channel_guard(chan_id);
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.created_by = me) then
    raise exception 'Only the channel''s admin can remove people.';
  end if;
  if member_id = me then
    raise exception 'You can''t remove yourself — delete the channel instead.';
  end if;
  delete from public.channel_members
    where channel_id = chan_id and user_id = member_id;
end;
$$;

-- Rename (the admin only). Same rules as a new name. Returns the name as saved.
create or replace function public.channel_rename(chan_id uuid, new_name text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  school text;
  nm     text;
begin
  perform public.channel_guard(chan_id);
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.created_by = me) then
    raise exception 'Only the channel''s admin can rename it.';
  end if;

  nm := regexp_replace(btrim(coalesce(new_name, '')), '^#+\s*', '');
  nm := regexp_replace(nm, '\s+', ' ', 'g');
  if length(nm) < 2 or length(nm) > 40 then
    raise exception 'Give the channel a name of 2 to 40 characters.';
  end if;

  select ch.university into school from public.channels ch where ch.id = chan_id;
  if exists (
    select 1 from public.channels ch
    where ch.id <> chan_id
      and lower(ch.name) = lower(nm)
      and (not ch.private or ch.created_by = me)
      and (ch.university is null or ch.university = school)
  ) then
    raise exception 'There is already a channel called that.';
  end if;

  update public.channels set name = nm where id = chan_id;
  return nm;
end;
$$;

-- Delete (the admin only): the channel, its messages and its members go.
create or replace function public.channel_delete(chan_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  perform public.channel_guard(chan_id);
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.created_by = me) then
    raise exception 'Only the channel''s admin can delete it.';
  end if;
  delete from public.channels where id = chan_id;
end;
$$;

grant execute on function public.channel_guard(uuid)                to authenticated;
grant execute on function public.channel_info(uuid)                 to authenticated;
grant execute on function public.channel_members_list(uuid)         to authenticated;
grant execute on function public.channel_add_members(uuid, uuid[])  to authenticated;
grant execute on function public.channel_remove_member(uuid, uuid)  to authenticated;
grant execute on function public.channel_rename(uuid, text)         to authenticated;
grant execute on function public.channel_delete(uuid)               to authenticated;

notify pgrst, 'reload schema';
