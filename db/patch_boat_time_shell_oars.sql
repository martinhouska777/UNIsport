-- ============================================================================
-- UNIsport — put a TIME in the time field, and name the shells
-- ----------------------------------------------------------------------------
-- WHY
--   A boat's `dock` is WHEN IT PUSHES OFF ("7:15am") — that is what the coach's
--   builder offers and what the athlete's card prints top right. Lineups written
--   before that used the same field for the BOATHOUSE ("Newell", "Weld"), so the
--   card showed a boathouse where the squad looks for a time.
--
--   The app now refuses to print anything that isn't a time there (lib/varsity/
--   home → dockTime), so nothing is WRONG on screen any more — but a boat with
--   no time says nothing at all. This puts a real one back.
--
-- WHAT IT DOES, per boat in every saved lineup:
--   1. dock — kept when it already is a time; otherwise the day's usual
--      push-off (AM 7:15am, PM 4:30pm).
--   2. name — the demo's CREW labels ("1V", "2V", "3V", "Small boat", "Pair")
--      become the names of PHYSICAL SHELLS, which is what the field is for and
--      what the athlete reads under the lineup: which boat to carry down.
--      Any other name — a real one a coach typed — is left exactly as it is.
--   3. oars — filled only when the boat has none, so a set a coach chose is
--      never overwritten.
--
-- SAFE TO RE-RUN: it is a pure rewrite of the same three fields, and a second
-- run finds every dock already a time and every boat already named.
-- ============================================================================

update public.varsity_lineups l
set boats = (
      select jsonb_agg(
               b
               || jsonb_build_object(
                    'dock',
                    case
                      when b->>'dock' ~* '^[0-9]{1,2}[:.][0-9]{2} *(am|pm)?$' then b->>'dock'
                      when l.day_key like '%-PM' then '4:30pm'
                      else '7:15am'
                    end,
                    'name',
                    case b->>'name'
                      when '1V'         then 'Hosea'
                      when '1V Four'    then 'Hosea'
                      when '2V'         then 'Mississippi'
                      when '3V'         then 'Kestrel'
                      when 'Small boat' then 'Kestrel'
                      when 'Pair'       then 'Kestrel'
                      else b->>'name'
                    end,
                    'oars',
                    coalesce(
                      nullif(b->>'oars', ''),
                      case b->>'name'
                        when '1V'      then 'Red set'
                        when '1V Four' then 'Red set'
                        when '2V'      then 'Blue set'
                        else 'White set'
                      end
                    )
                  )
               order by ord
             )
      from jsonb_array_elements(l.boats) with ordinality as t(b, ord)
    )
where jsonb_typeof(l.boats) = 'array'
  and jsonb_array_length(l.boats) > 0;

-- What it left behind: every boat, its shell, its oars and its push-off time.
select l.day_key,
       b->>'name' as shell,
       b->>'oars' as oars,
       b->>'dock' as push_off
from public.varsity_lineups l,
     jsonb_array_elements(l.boats) b
order by l.day_key desc, b->>'name'
limit 30;
