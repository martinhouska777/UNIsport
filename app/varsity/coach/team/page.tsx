"use client";

/*
  Team tab of the console — THE SAME SCREEN THE ATHLETES SEE.

  The owner's rule: a coach should not be reading a different set of numbers to
  their squad. So this renders components/varsity/team/TeamScreen — the roster,
  the erg boards and the water telemetry, exactly as a rower gets them — and
  adds what a coach has and a rower does not:
    • tapping a rower who is also a real account on this squad opens their full
      training screen (/varsity/coach/athlete/[id]) instead of the read-only
      squad profile sheet;
    • a NOTE button in every row, between the name and the side (owner,
      2026-09-13). It replaced the big "Write a technical note" button that
      sat on top of the list and made you pick the rower a second time. Red
      when that rower already has a note.

  Running the squad — the waiting room, invite links, captains — is NOT here
  any more. It lives behind the gear in the top bar (/varsity/coach/settings),
  because it is a settings job you do once, not something you look at daily.

  SEAT RACES (owner, 2026-09-18): a coach gets a Team | Seat races switch on
  top; the second half is components/varsity/coach/team/SeatRacesScreen.

  Accounts are not linked to the (still mock) roster yet, so the two are matched
  by NAME — the same stand-in lib/varsity/demoAthlete.ts and lineupStore.ts use.
  Only a signed-up account can get a note (lib/varsity/notesStore.ts), so a
  rower who hasn't joined gets a one-line sheet saying so instead of an editor.
*/
import { useEffect, useMemo, useState } from "react";
import TeamScreen from "@/components/varsity/team/TeamScreen";
import SeatRacesScreen from "@/components/varsity/coach/team/SeatRacesScreen";
import NoteEditor from "@/components/varsity/coach/notes/NoteEditor";
import Sheet from "@/components/varsity/Sheet";
import { useMembership } from "@/components/varsity/useMembership";
import { can, fetchSquad } from "@/lib/varsity/membership";
import { rosterIdForName } from "@/lib/varsity/demoAthlete";
import {
  fetchTeamRoster,
  fetchNotes,
  type TeamMember,
} from "@/lib/varsity/notesStore";
import { IconPencil } from "@/components/icons";

export default function CoachTeamPage() {
  const { membership, loading } = useMembership();
  const role = membership?.role ?? null;
  const teamId = membership?.teamId ?? null;
  const writesNotes = !!role && can.writeNotes(role);
  // roster id → the account id of the person who is that rower.
  const [accounts, setAccounts] = useState<Record<string, string>>({});
  // Who can get a note, and the notes they already have (account id → note).
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState<TeamMember | null>(null);
  const [notJoined, setNotJoined] = useState<string | null>(null);
  const [view, setView] = useState<"team" | "races">("team");
  const seatRaces = !!role && can.buildPlan(role);

  useEffect(() => {
    if (!teamId || !role || !can.readTraining(role)) return;
    let active = true;
    fetchSquad(teamId).then((squad) => {
      if (!active) return;
      const map: Record<string, string> = {};
      for (const m of squad) {
        if (m.status !== "approved") continue;
        const id = rosterIdForName(m.name);
        if (id) map[id] = m.userId;
      }
      setAccounts(map);
    });
    return () => {
      active = false;
    };
  }, [teamId, role]);

  useEffect(() => {
    if (!writesNotes) return;
    let active = true;
    Promise.all([fetchTeamRoster(), fetchNotes()]).then(([r, n]) => {
      if (!active) return;
      setMembers(r);
      setNotes(n);
    });
    return () => {
      active = false;
    };
  }, [writesNotes]);

  // roster id → the account that can receive a note.
  const memberByRosterId = useMemo(() => {
    const map: Record<string, TeamMember> = {};
    for (const m of members) {
      const id = rosterIdForName(m.name);
      if (id) map[id] = m;
    }
    return map;
  }, [members]);

  if (loading || !membership) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted">
        Loading the squad…
      </p>
    );
  }

  return (
    <>
      {seatRaces && (
        <div className="mx-auto w-full max-w-screen-sm px-4 pt-4">
          <div className="flex overflow-hidden rounded-xl border border-border bg-surface">
            {(
              [
                ["team", "Team"],
                ["races", "Seat races"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
                  view === k ? "bg-text text-background" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "races" ? (
        <SeatRacesScreen />
      ) : (
        <TeamScreen
          /* Just the roster — Workouts is its own tab in the console. */
          only="roster"
          /* A coach (not a captain) gets the note button in each row. */
          rowAction={
            writesNotes
              ? (a) => {
                  const member = memberByRosterId[a.id];
                  const hasNote = !!(member && notes[member.id]?.trim());
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        member ? setWriting(member) : setNotJoined(a.name)
                      }
                      aria-label={`${hasNote ? "Edit the" : "Write a"} technical note for ${a.name}`}
                      /* THE PENCIL IS THE SCHOOL'S COLOUR — crimson at Harvard,
                       navy at Yale — and never a fixed red (owner, 2026-09-17:
                       "I want it in red, so it's working… the colour would be
                       according to the school"). It used to be grey until a
                       note existed, which read as switched off. It is live in
                       every row now, and a row that already HAS a note is the
                       filled one. */
                      className={`tap44 press-icon flex h-8 w-8 items-center justify-center rounded-lg border text-primary ${
                        hasNote
                          ? "border-primary-line bg-primary-tint"
                          : "border-border bg-surface-2"
                      }`}
                    >
                      <IconPencil size={14} />
                    </button>
                  );
                }
              : undefined
          }
          athleteHref={(a) => {
            const userId = accounts[a.id];
            return userId ? `/varsity/coach/athlete/${userId}` : null;
          }}
        />
      )}

      {notJoined && (
        <Sheet title="Technical note" onClose={() => setNotJoined(null)}>
          <p className="py-4 text-center text-[13px] leading-relaxed text-muted">
            {notJoined} hasn&rsquo;t joined the app yet. A note goes to their
            phone, so it can be sent once they sign up.
          </p>
        </Sheet>
      )}

      {writing && (
        <NoteEditor
          member={writing}
          initialNote={notes[writing.id] ?? ""}
          onBack={() => setWriting(null)}
          onSaved={(n) => {
            setNotes((prev) => {
              const next = { ...prev };
              if (n) next[writing.id] = n;
              else delete next[writing.id];
              return next;
            });
            setWriting(null);
          }}
        />
      )}
    </>
  );
}
