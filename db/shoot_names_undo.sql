-- ============================================================================
-- UNIsport: undo db/shoot_names.sql, after the shoot
-- ----------------------------------------------------------------------------
-- Gives every profile renamed for the shoot its old name back and forgets the
-- copy. The demo account's own name (Lucas Bennett, set in the app) stays.
-- ============================================================================

update public.profiles
set data = (data - 'nameBeforeShoot') || jsonb_build_object('name', data->>'nameBeforeShoot')
where data ? 'nameBeforeShoot';

select id, data->>'name' as name
from public.profiles
where id in ('aa51da80-664c-41ff-aca2-3d11d2688d41', 'de11a015-0000-4000-8000-000000000015');
