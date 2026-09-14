-- UNIsport — Private channels, and the people you add when you start one (slice 2)
-- ===========================================================================
-- Owner, 2026-09-14: starting a channel is the WhatsApp way — a name, then
-- Public or Private, and for a private one you add the members.
--
--   PUBLIC  — anyone at the school can find it under Browse and join.
--   PRIVATE — only its members (and whoever started it) can see it, read it or
--             post in it. Nobody else finds it. (Ask to join is the next slice.)
--
-- A member always sees their channel, whatever school it was started at.
--
-- Run AFTER db/messages.sql and db/channels_community.sql. Safe to re-run.
-- ===========================================================================

alter table public.channels add column if not exists private boolean not null default false;

-- channel_list gains a column (private); channel_create gains two arguments.
drop function if exists public.channel_list(text);
drop function if exists public.channel_create(text, text);
drop function if exists public.channel_create(text, text, boolean, uuid[]);

create or replace function public.channel_list(uni text default null)
returns table (
  channel_id       uuid,
  key              text,
  name             text,
  icon             text,
  last_body        text,
  last_sender_name text,
  last_at          timestamptz,
  unread           integer,
  joined           boolean,
  mine             boolean,
  private          boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ch.id, ch.key, ch.name, ch.icon,
    lm.body, lm.sender_name, lm.created_at,
    coalesce((
      select count(*) from public.channel_messages m
      where m.channel_id = ch.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select last_read_at from public.channel_reads r
           where r.channel_id = ch.id and r.user_id = auth.uid()), 'epoch')
    ), 0)::int,
    exists(
      select 1 from public.channel_members mem
      where mem.channel_id = ch.id and mem.user_id = auth.uid()
    ),
    coalesce(ch.created_by = auth.uid(), false),
    ch.private
  from public.channels ch
  left join lateral (
    select body, sender_name, created_at
    from public.channel_messages m
    where m.channel_id = ch.id
    order by created_at desc
    limit 1
  ) lm on true
  where exists (
          select 1 from public.channel_members mem
          where mem.channel_id = ch.id and mem.user_id = auth.uid()
        )
     or ch.created_by = auth.uid()
     or (not ch.private and (ch.university is null or ch.university = nullif(uni, '')))
  order by ch.sort, lower(ch.name);
$$;

-- Start a channel. Public or private; a private one takes the people to add
-- (at most 200). The name is trimmed (a leading "#" dropped), 2–40 characters,
-- and can't repeat a channel the school can already see. The person who starts
-- it is joined straight away. Returns the new channel's id.
create or replace function public.channel_create(
  channel_name text,
  uni          text    default null,
  is_private   boolean default false,
  member_ids   uuid[]  default '{}'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  school text := nullif(btrim(coalesce(uni, '')), '');
  nm     text;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  nm := regexp_replace(btrim(coalesce(channel_name, '')), '^#+\s*', '');
  nm := regexp_replace(nm, '\s+', ' ', 'g');
  if length(nm) < 2 or length(nm) > 40 then
    raise exception 'Give the channel a name of 2 to 40 characters.';
  end if;

  if coalesce(cardinality(member_ids), 0) > 200 then
    raise exception 'Add at most 200 people at once.';
  end if;

  -- Only against channels this school can SEE — a private channel's name is
  -- nobody else's business, so it never blocks one.
  if exists (
    select 1 from public.channels ch
    where lower(ch.name) = lower(nm)
      and (not ch.private or ch.created_by = me)
      and (ch.university is null or ch.university = school)
  ) then
    raise exception 'There is already a channel called that.';
  end if;

  insert into public.channels (key, name, icon, sort, university, created_by, private)
    values ('u-' || replace(gen_random_uuid()::text, '-', ''), nm, 'message', 100,
            school, me, coalesce(is_private, false))
    returning id into new_id;

  insert into public.channel_members (channel_id, user_id)
    values (new_id, me)
    on conflict (channel_id, user_id) do nothing;

  if coalesce(is_private, false) then
    insert into public.channel_members (channel_id, user_id)
      select new_id, p.id
      from public.profiles p
      where p.id = any(coalesce(member_ids, '{}')) and p.id <> me
      on conflict (channel_id, user_id) do nothing;
  end if;

  return new_id;
end;
$$;

-- Joining: a private channel can't be joined from outside.
create or replace function public.channel_join(chan_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id) then
    raise exception 'unknown channel';
  end if;
  if exists (select 1 from public.channels ch where ch.id = chan_id and ch.private)
     and not exists (
       select 1 from public.channel_members mem
       where mem.channel_id = chan_id and mem.user_id = me
     ) then
    raise exception 'This channel is private.';
  end if;
  insert into public.channel_members (channel_id, user_id)
    values (chan_id, me)
    on conflict (channel_id, user_id) do nothing;
end;
$$;

-- Reading: a private channel only for its members. (Posting already requires
-- membership in channel_send.)
create or replace function public.channel_thread(chan_id uuid)
returns table (
  id                uuid,
  sender_id         uuid,
  sender_name       text,
  sender_residence  text,
  sender_class_year text,
  body              text,
  created_at        timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;

  if exists (select 1 from public.channels ch where ch.id = chan_id and ch.private)
     and not exists (
       select 1 from public.channel_members mem
       where mem.channel_id = chan_id and mem.user_id = me
     ) then
    raise exception 'This channel is private.';
  end if;

  insert into public.channel_reads (channel_id, user_id, last_read_at)
    values (chan_id, me, now())
    on conflict (channel_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.sender_residence,
           m.sender_class_year, m.body, m.created_at
    from public.channel_messages m
    where m.channel_id = chan_id
    order by m.created_at asc;
end;
$$;

-- People to add. Nothing typed → the people you know (you follow them or have a
-- chat with them). Something typed → anyone whose name has it in. Never you,
-- never a profile with no name. At most 40.
create or replace function public.channel_people(q text default null)
returns table (
  id         uuid,
  name       text,
  residence  text,
  class_year text,
  photo      text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         btrim(p.data->>'name'),
         nullif(p.data->>'residence', ''),
         nullif(p.data->>'classYear', ''),
         nullif(p.data->>'photo', '')
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and coalesce(btrim(p.data->>'name'), '') <> ''
    and case
      when length(btrim(coalesce(q, ''))) > 0 then
        p.data->>'name' ilike '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      else
        p.id in (
          select f.followee_id from public.follows f where f.follower_id = auth.uid()
          union
          select case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end
          from public.dm_conversations c
          where auth.uid() in (c.user_lo, c.user_hi)
        )
    end
  order by lower(btrim(p.data->>'name'))
  limit 40;
$$;

grant execute on function public.channel_list(text)                        to authenticated;
grant execute on function public.channel_create(text, text, boolean, uuid[]) to authenticated;
grant execute on function public.channel_join(uuid)                        to authenticated;
grant execute on function public.channel_thread(uuid)                      to authenticated;
grant execute on function public.channel_people(text)                      to authenticated;

notify pgrst, 'reload schema';
