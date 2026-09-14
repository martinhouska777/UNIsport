-- UNIsport — Community channels anyone can start (slice 1 of 3)
-- ===========================================================================
-- Owner, 2026-09-14: channels are the students'. Anybody can start one; your
-- joined channels sit on top of Community and every other one can be searched
-- or browsed underneath. (Private channels, ask-to-join and adding people come
-- in the next two slices.)
--
-- A channel someone starts belongs to THEIR SCHOOL: a Harvard channel is never
-- shown at Yale. The school key comes from the app (the same key that picks the
-- theme — many profiles have no `university` saved, the app works it out from
-- the email), and the five seeded channels keep `university` null, which means
-- "every school".
--
-- Run AFTER db/messages.sql. Safe to re-run.
-- ===========================================================================

alter table public.channels add column if not exists university text;
alter table public.channels add column if not exists created_by uuid;
alter table public.channels add column if not exists created_at timestamptz not null default now();

-- channel_list gains an argument (the viewer's school) and a column (mine).
-- Postgres can't change a function's arguments or OUT columns in place.
drop function if exists public.channel_list();
drop function if exists public.channel_list(text);

-- Every channel this viewer can see — the every-school ones, their own
-- school's, and any they started — with its last message, the unread count,
-- whether they joined it, and whether they started it.
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
  mine             boolean
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
    coalesce(ch.created_by = auth.uid(), false)
  from public.channels ch
  left join lateral (
    select body, sender_name, created_at
    from public.channel_messages m
    where m.channel_id = ch.id
    order by created_at desc
    limit 1
  ) lm on true
  where ch.university is null
     or ch.university = nullif(uni, '')
     or ch.created_by = auth.uid()
  order by ch.sort, lower(ch.name);
$$;

-- Start a channel. The name is trimmed (a leading "#" is dropped), must be 2–40
-- characters, and can't repeat a channel the same school already sees. The
-- person who starts it is joined straight away. Returns the new channel's id.
create or replace function public.channel_create(channel_name text, uni text default null)
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

  if exists (
    select 1 from public.channels ch
    where lower(ch.name) = lower(nm)
      and (ch.university is null or ch.university = school)
  ) then
    raise exception 'There is already a channel called that.';
  end if;

  insert into public.channels (key, name, icon, sort, university, created_by)
    values ('u-' || replace(gen_random_uuid()::text, '-', ''), nm, 'message', 100, school, me)
    returning id into new_id;

  insert into public.channel_members (channel_id, user_id)
    values (new_id, me)
    on conflict (channel_id, user_id) do nothing;

  return new_id;
end;
$$;

grant execute on function public.channel_list(text)          to authenticated;
grant execute on function public.channel_create(text, text)  to authenticated;

notify pgrst, 'reload schema';
