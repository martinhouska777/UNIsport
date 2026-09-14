-- UNIsport — Ask to join a private channel (slice 4)
-- ===========================================================================
-- Owner, 2026-09-14: "now do the ask to join for private channels" — the
-- classic way.
--
--   • A private channel is no longer invisible: it shows under Browse at its
--     school with a padlock and ASK TO JOIN. Its messages stay hidden (no last
--     message, no unread count, no reading, no info) until you are in.
--   • Asking leaves a request. You can take it back.
--   • The ADMIN (whoever started it) sees the requests — a count on the channel,
--     and the list in Channel info — and approves or declines each one.
--     Approving makes that person a member. Adding someone who had asked also
--     clears their request.
--   • Now that private channels can be seen, their names count too: a private
--     channel's name blocks the same name for a new channel at that school.
--
-- Run AFTER db/channels_settings.sql. Safe to re-run.
-- ===========================================================================

create table if not exists public.channel_join_requests (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);
alter table public.channel_join_requests enable row level security;

-- ── channel_list: private channels visible at their school; two new columns ──
drop function if exists public.channel_list(text);

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
  private          boolean,
  requested        boolean,  -- you have asked to join
  requests         integer   -- people asking to join (only counted for its admin)
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select ch.*,
           exists (
             select 1 from public.channel_members mem
             where mem.channel_id = ch.id and mem.user_id = auth.uid()
           ) as is_member
    from public.channels ch
    where exists (
            select 1 from public.channel_members mem
            where mem.channel_id = ch.id and mem.user_id = auth.uid()
          )
       or ch.created_by = auth.uid()
       or ch.university is null
       or ch.university = nullif(uni, '')
  )
  select
    ch.id, ch.key, ch.name, ch.icon,
    -- A private channel's messages are for its members only.
    case when ch.private and not ch.is_member then null else lm.body end,
    case when ch.private and not ch.is_member then null else lm.sender_name end,
    case when ch.private and not ch.is_member then null else lm.created_at end,
    case when ch.private and not ch.is_member then 0 else coalesce((
      select count(*) from public.channel_messages m
      where m.channel_id = ch.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select last_read_at from public.channel_reads r
           where r.channel_id = ch.id and r.user_id = auth.uid()), 'epoch')
    ), 0)::int end,
    ch.is_member,
    coalesce(ch.created_by = auth.uid(), false),
    ch.private,
    exists (
      select 1 from public.channel_join_requests q
      where q.channel_id = ch.id and q.user_id = auth.uid()
    ),
    case when ch.created_by = auth.uid() then (
      select count(*) from public.channel_join_requests q where q.channel_id = ch.id
    )::int else 0 end
  from mine ch
  left join lateral (
    select body, sender_name, created_at
    from public.channel_messages m
    where m.channel_id = ch.id
    order by created_at desc
    limit 1
  ) lm on true
  order by ch.sort, lower(ch.name);
$$;

-- ── channel_info: plus how many are asking (admin only) ──
drop function if exists public.channel_info(uuid);

create or replace function public.channel_info(chan_id uuid)
returns table (
  name          text,
  private       boolean,
  member_count  integer,
  am_member     boolean,
  am_admin      boolean,
  request_count integer
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
           coalesce(ch.created_by = me, false),
           case when ch.created_by = me then
             (select count(*) from public.channel_join_requests q where q.channel_id = ch.id)::int
           else 0 end
    from public.channels ch
    where ch.id = chan_id;
end;
$$;

-- ── Ask / take it back ──
create or replace function public.channel_request_join(chan_id uuid)
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
    raise exception 'This channel no longer exists.';
  end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.private) then
    raise exception 'This channel is open — just join it.';
  end if;
  if exists (select 1 from public.channel_members mem
             where mem.channel_id = chan_id and mem.user_id = me) then
    return; -- already in
  end if;
  insert into public.channel_join_requests (channel_id, user_id)
    values (chan_id, me)
    on conflict (channel_id, user_id) do nothing;
end;
$$;

create or replace function public.channel_cancel_request(chan_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.channel_join_requests where channel_id = chan_id and user_id = me;
end;
$$;

-- ── The admin's list, oldest request first ──
create or replace function public.channel_requests_list(chan_id uuid)
returns table (
  id           uuid,
  name         text,
  residence    text,
  class_year   text,
  photo        text,
  requested_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.created_by = me) then
    raise exception 'Only the channel''s admin can see who asked to join.';
  end if;
  return query
    select p.id,
           coalesce(nullif(btrim(p.data->>'name'), ''), 'Member'),
           nullif(p.data->>'residence', ''),
           nullif(p.data->>'classYear', ''),
           nullif(p.data->>'photo', ''),
           q.created_at
    from public.channel_join_requests q
    join public.profiles p on p.id = q.user_id
    where q.channel_id = chan_id
    order by q.created_at asc
    limit 500;
end;
$$;

-- ── The admin answers: approve (they become a member) or decline ──
create or replace function public.channel_answer_request(chan_id uuid, requester_id uuid, approve boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id and ch.created_by = me) then
    raise exception 'Only the channel''s admin can answer requests.';
  end if;
  if not exists (select 1 from public.channel_join_requests q
                 where q.channel_id = chan_id and q.user_id = requester_id) then
    raise exception 'That request is no longer there.';
  end if;
  delete from public.channel_join_requests where channel_id = chan_id and user_id = requester_id;
  if coalesce(approve, false) then
    insert into public.channel_members (channel_id, user_id)
      values (chan_id, requester_id)
      on conflict (channel_id, user_id) do nothing;
  end if;
end;
$$;

-- ── Adding someone who had asked clears their request (same rules as before) ──
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
  delete from public.channel_join_requests
    where channel_id = chan_id and user_id = any(coalesce(member_ids, '{}'));
  return added;
end;
$$;

-- ── Names: a private channel's name now counts too ──
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

  if exists (
    select 1 from public.channels ch
    where lower(ch.name) = lower(nm)
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
      and (ch.university is null or ch.university = school)
  ) then
    raise exception 'There is already a channel called that.';
  end if;

  update public.channels set name = nm where id = chan_id;
  return nm;
end;
$$;

grant execute on function public.channel_list(text)                           to authenticated;
grant execute on function public.channel_info(uuid)                           to authenticated;
grant execute on function public.channel_request_join(uuid)                   to authenticated;
grant execute on function public.channel_cancel_request(uuid)                 to authenticated;
grant execute on function public.channel_requests_list(uuid)                  to authenticated;
grant execute on function public.channel_answer_request(uuid, uuid, boolean)  to authenticated;
grant execute on function public.channel_add_members(uuid, uuid[])            to authenticated;
grant execute on function public.channel_create(text, text, boolean, uuid[])  to authenticated;
grant execute on function public.channel_rename(uuid, text)                   to authenticated;

notify pgrst, 'reload schema';
