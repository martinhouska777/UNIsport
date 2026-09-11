-- ============================================================================
-- UNIsport — remember what the squad was last TOLD
-- ----------------------------------------------------------------------------
-- WHY
--   A published lineup or block is live: it autosaves, so every edit is on
--   the squad's phones as it is made. The only thing left for the coach to
--   decide is whether to buzz them about it — "Tell the squad" — and that
--   button only appears once the thing differs from what they were last told.
--
--   Until now that memory lived in the screen. Close the app after editing a
--   live lineup and it was gone: the console said "Live" as if all was well,
--   and the buzz never went. This puts the memory on the row.
--
-- WHAT
--   `announced` is the exact snapshot string the app computed when the coach
--   last published or told the squad (for a lineup, its boats as JSON text;
--   for a block, its name/dates/race and every session in range). The app
--   compares its current snapshot to this. It is text, not jsonb, on purpose:
--   the comparison has to be byte-for-byte with what the client wrote, and
--   jsonb would re-order keys.
--
--   Rows from before this patch have NULL here. The app treats NULL on a
--   published row as "up to date" rather than as "edited" — nothing was being
--   tracked before, so there is nothing honest to say about it — and the next
--   publish or Tell the squad fills it in.
--
-- SAFE TO RE-RUN.
-- ============================================================================

alter table public.varsity_lineups
  add column if not exists announced text;

alter table public.varsity_plan_blocks
  add column if not exists announced text;
