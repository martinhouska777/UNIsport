# Varsity / Coach screens for social — the invented-team reshoot (2026-09-22)

The real squad's Varsity screens cannot be posted: the header says "Harvard Rowing",
the crest carries the H, and the boards and lineups show real teammates (SOCIAL.md §7B).
This folder is the recipe that shot them as **Westbrook Rowing** with 64 invented rowers,
invented shell names and no Harvard anywhere. The live app and the real repo were not
touched: everything happened in a throwaway copy that was deleted afterwards.

Output: `mockups/social/screens/light/varsity-*.png`, `coach-*.png`, and the framed
phones in `mockups/social/phones/` (17 screens; `coach-notes` is dropped because the
notes route now shows the Team screen). Those files are gitignored on purpose — the
ignore rule is what keeps a future real-name reshoot out of this PUBLIC repo.

## Redo it

1. Throwaway copy of the app, with the dependencies linked, on its own port:
   ```
   git worktree add --detach C:\Unisport-shoot HEAD
   cmd /c mklink /J C:\Unisport-shoot\node_modules C:\Unisport\node_modules
   copy .env.local C:\Unisport-shoot\
   cd C:\Unisport-shoot && node node_modules\next\dist\bin\next dev -p 3001 --webpack
   ```
2. In the copy: `git apply copy-edits.patch` (crest letter W, school short name
   "Westbrook", both Supabase clients wired to the rewriting fetch), then put
   `shootFetch.ts.txt` at `lib/supabase/shootFetch.ts` and run
   `node fake-roster.mjs` (rewrites the roster names in the copy and writes
   `lib/supabase/shootMap.json`, the race-sheet surname map).
3. Owner signs in once: `node scripts/landing/save-cookie.mjs --fresh` (demo account).
   Never probe production with that cookie — one request rotates it and it is dead.
4. From the copy: `node scripts/social/capture-shoot.mjs` — shoots every screen, refuses
   if signed out or if any real surname is still visible, writes into the real repo.
5. From the real repo: `node scripts/social/posts.mjs phones` frames them.
6. Tear down: stop the server, `cmd /c rmdir C:\Unisport-shoot\node_modules` (the
   junction — NOT a recursive delete, or the real node_modules goes with it), then
   `git worktree remove --force C:\Unisport-shoot`.

What the rewrite maps: team name, block name ("Fall 2026"), "Palmer Dixon" → the
boathouse, "HClub Event", the shells (Engstrom, Hamlin, Hosea, Mississippi, 92 →
Aurora, Osprey, Meridian, Tempest, Heron), and every race-sheet token in `fake-roster.mjs`.
Martin Houska stays himself.
