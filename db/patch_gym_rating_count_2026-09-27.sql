-- UNIsport — a comment is not a rating (launch audit 2026-09-27, item 22)
-- ---------------------------------------------------------------------------
-- The gym page said "1 rating" under five empty stars when the only review was
-- a comment with no scores: `reviews` counted every row. It now counts the rows
-- that carry at least one score, which is what the page means by "ratings";
-- comment-only rows are still counted in `comments`.
--
-- Idempotent. UNDO: replace `count(*) filter (where ... is not null)` for
-- `reviews` with plain `count(*)` again (db/gym_reviews.sql).

create or replace function public.gym_review_summary()
returns table (gym_slug text, reviews integer, score numeric, equipment_avg numeric,
               cleanliness_avg numeric, atmosphere_avg numeric, comments integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    r.gym_slug,
    count(*) filter (
      where public.gym_review_overall(r.equipment, r.cleanliness, r.atmosphere) is not null
    )::integer as reviews,
    avg(public.gym_review_overall(r.equipment, r.cleanliness, r.atmosphere)) as score,
    avg(r.equipment)   as equipment_avg,
    avg(r.cleanliness) as cleanliness_avg,
    avg(r.atmosphere)  as atmosphere_avg,
    count(*) filter (where r.comment is not null)::integer as comments
  from public.gym_reviews r
  where auth.uid() is not null
  group by r.gym_slug;
$$;

revoke execute on function public.gym_review_summary() from public, anon;
grant  execute on function public.gym_review_summary() to authenticated;
