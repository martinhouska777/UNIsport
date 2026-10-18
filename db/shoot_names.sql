-- ============================================================================
-- UNIsport: made-up names for the app walk shoot (owner, 2026-10-18:
-- "do a fake name and not Martin Houska, then we will shoot it")
-- ----------------------------------------------------------------------------
-- The demo account the walk is shot on (martinhouska701) was renamed in the
-- app itself: Lucas Bennett. Two more profiles called "Martin Houska" are on
-- its Match tab, and the walk lights the first one and opens it:
--
--   aa51da80-664c-41ff-aca2-3d11d2688d41  first card on Match, the profile the
--                                         walk opens (Quincy, Class of 2029)
--   de11a015-0000-4000-8000-000000000015  the invented one from
--                                         db/seed_martin_match.sql (Quincy, 2028)
--
-- Each keeps its old name under data.nameBeforeShoot, and
-- db/shoot_names_undo.sql puts it back. Safe to run twice: a profile that is
-- no longer called Martin Houska is left alone.
-- ============================================================================

update public.profiles
set data = data || jsonb_build_object('name', 'Ethan Hale', 'nameBeforeShoot', data->>'name')
where id = 'aa51da80-664c-41ff-aca2-3d11d2688d41'
  and data->>'name' = 'Martin Houska';

update public.profiles
set data = data || jsonb_build_object('name', 'Oliver Grant', 'nameBeforeShoot', data->>'name')
where id = 'de11a015-0000-4000-8000-000000000015'
  and data->>'name' = 'Martin Houska';

-- What it did: both rows, with the new name and the one kept for the undo.
select id, data->>'name' as name, data->>'nameBeforeShoot' as before
from public.profiles
where id in ('aa51da80-664c-41ff-aca2-3d11d2688d41', 'de11a015-0000-4000-8000-000000000015');
