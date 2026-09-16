"use client";

/*
  Varsity TEAM tab — the squad.
  ---------------------------------------------------------------------------
  A top sub-navigation switches between:
    • Roster   — the whole squad (grouped like the lineup pool), searchable; tap
                 a rower to open their profile (team year, height/weight, status,
                 a Calendar button if they share it, erg PRs).
    • Workouts — every session the coach flagged as a TEAM WORKOUT, with the
                 board of everyone's results (components/varsity/team/…).

  Roster comes from lib/varsity/coachLineup; each athlete's profile detail from
  lib/varsity/teamProfiles (stable demo data until accounts link to the squad).
  All colors are theme tokens; the rowing-side dot is a CONTENT color from data
  applied via inline style (the rule-1 exception the lineup screens use).
*/
import { useMemo, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import TeamWorkouts from "@/components/varsity/team/TeamWorkouts";
import TeammateCalendarWindow from "@/components/varsity/team/TeammateCalendarWindow";
import { useUnits } from "@/components/useUnits";
import { formatWeight } from "@/lib/varsity/units";
import { roster, rosterById, sideMeta, COX_COLOR, COX_INK, type Athlete } from "@/lib/varsity/coachLineup";
import { teamProfile } from "@/lib/varsity/teamProfiles";
import { statusOptions, prPieces, type StatusTone } from "@/lib/varsity/athleteProfile";
import {
  IconSearch,
  IconChevronRight,
  IconUser,
  IconActivity,
  IconEyeOff,
  IconCalendar,
} from "@/components/icons";

// The status pill — the same one the athlete sees on their own profile.
const toneRing: Record<StatusTone, string> = {
  success: "border-success-line bg-success-tint text-success",
  warn: "border-warn-line bg-warn-tint text-warn",
  danger: "border-danger-line bg-danger-tint text-danger",
  muted: "border-border bg-surface-2 text-muted",
};
/*
  The side dot. It carries a hairline of its own ink so the dot keeps a crisp
  edge on both the light and the dark varsity theme, whatever colour it is.
*/
const sideDot = (a: Athlete): React.CSSProperties => {
  const color = a.cox ? COX_COLOR : sideMeta[a.side].color;
  const ink = a.cox ? COX_INK : sideMeta[a.side].ink;
  return { background: color, border: `1px solid color-mix(in oklab, ${ink} 30%, transparent)` };
};
const sideLabel = (a: Athlete) => (a.cox ? "Cox" : sideMeta[a.side].label);

/* ─────────────────────────  athlete profile sheet  ───────────────────────── */
/*
  A TEAMMATE'S CARD — who they are, how they row, their status, their training
  month and their erg PRs.

  THE CALENDAR IS THEIR CHOICE (owner, 2026-09-13). On 2026-09-11 the month was
  taken off this card, because it was the athlete's own log handed to forty
  peers with no say. The owner wants it back — so the squad can see how the
  people who train best actually train — and the missing piece was the say:
  every athlete now has a "Teammates see my calendar" switch on their own
  profile (VarsityAthleteProfile.showCalendar). Off, and this card says so in
  one line instead of the button. The coach sees it either way.

  A BUTTON, NOT A MONTH (owner, 2026-09-14). The card no longer draws a small
  calendar of its own: it has one "Calendar" row, and tapping it opens the
  month full-screen, drawn by the same screen as your own Calendar tab
  (TeammateCalendarWindow → CalendarScreen, read-only).

  Until accounts are linked to roster seats the month is demo data
  (lib/varsity/teamTraining), as is who has the switch off (teamProfiles).
*/
function AthleteSheet({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const a = rosterById[athleteId];
  const p = teamProfile(athleteId);
  const { units } = useUnits();
  const classLine = [p.classYear, p.teamYear].filter(Boolean).join(" · ");
  const status = statusOptions.find((s) => s.title === p.status);
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <Sheet title="Athlete" onClose={onClose}>
      <div className="flex items-start gap-3.5">
        {/* The same rule as the roster row: a person, not a monogram. */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary-line bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <IconUser size={30} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-lg font-semibold leading-tight text-text">{a?.name ?? "Unknown"}</div>
          {classLine && <div className="mt-1 text-[11px] text-muted">{classLine}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              <span className="h-2 w-2 rounded-full" style={sideDot(a)} />
              {sideLabel(a)}
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              {p.heightCm} cm
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              {formatWeight(p.weightKg, units.weight)}
            </span>
          </div>
        </div>
        {/* Status — top right, one word in a pill, exactly as on your own
            profile (owner, 2026-09-13). The grey card that sat under the
            header, and its "Available for training and selection" line, went. */}
        {status && (
          <span
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${toneRing[status.tone]}`}
          >
            <IconActivity size={13} />
            <span className="text-[11px] font-medium">{status.title}</span>
          </span>
        )}
      </div>

      {p.showCalendar ? (
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-left active:bg-surface"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
            <IconCalendar size={16} />
          </span>
          <span className="flex-1 text-[13px] font-semibold text-text">Calendar</span>
          <IconChevronRight size={15} className="flex-shrink-0 text-muted" />
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[12px] text-muted">
          <IconEyeOff size={15} />
          {(a?.name ?? "").split(" ")[0] || "They"} keeps their calendar private.
        </div>
      )}

      {/* erg PRs — not for a coxswain: nobody compares a cox's 2k, and a card
          that printed one would be asking to be. */}
      {!a?.cox && (
        <>
          <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Personal Bests
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {prPieces.map((piece) => (
              <div
                key={piece}
                className="flex items-baseline justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{piece}</span>
                <span className="text-[14px] font-semibold text-text">{p.prs[piece] ?? "—"}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {calendarOpen && (
        <TeammateCalendarWindow
          athleteId={athleteId}
          name={a?.name ?? "Athlete"}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </Sheet>
  );
}

/* ─────────────────────────  roster row  ───────────────────────── */
/*
  The row is a button that opens the squad profile sheet — unless a `href` is
  given, which is the coach's version: it goes to that rower's full training
  screen instead. Same row either way; only where it leads changes.
*/
/* data-tour: the Coach Console tour lights the first row to explain that
   opening a rower shows what they have actually trained. Harmless in the
   athletes' own Team tab, where no tour looks for it. */
function RosterRow({
  a,
  onOpen,
  href,
  tour,
  action,
}: {
  a: Athlete;
  onOpen: () => void;
  href?: string;
  tour?: string;
  /* The coach's note button, between the name and the side (see rowAction). */
  action?: React.ReactNode;
}) {
  const cls =
    "relative flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-2";
  if (action) {
    /*
      WITH A BUTTON IN THE ROW. A button can't sit inside the link, so the
      link is stretched invisibly across the whole row underneath, and the
      note button sits above it: tap the button, you write a note; tap
      anywhere else, the rower opens — the same as a row without one.
    */
    return (
      <div className="relative flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
        {href ? (
          <Link href={href} data-tour={tour} aria-label={a.name} className="absolute inset-0 rounded-xl active:bg-surface-2" />
        ) : (
          <button type="button" onClick={onOpen} data-tour={tour} aria-label={a.name} className="absolute inset-0 rounded-xl active:bg-surface-2" />
        )}
        <span className="pointer-events-none relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-tint text-primary">
          <IconUser size={18} />
        </span>
        <span className="pointer-events-none relative min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
        <span className="relative z-10 flex-shrink-0">{action}</span>
        {/* A fixed width, so the note buttons line up down the list
            whatever the side says — "Port" is half as wide as "Starboard". */}
        <span className="pointer-events-none relative flex w-[4.25rem] flex-shrink-0 items-center gap-1 text-[11px] text-muted">
          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={sideDot(a)} />
          {sideLabel(a)}
        </span>
        <span className="pointer-events-none relative text-muted">
          <IconChevronRight size={15} />
        </span>
      </div>
    );
  }
  const inner = (
    <>
      {/*
        A PERSON, NOT TWO LETTERS. The owner does not want initials on a roster:
        a person is their photo, and somebody we have no photo of is a
        person-shaped glyph rather than a monogram. Nobody on the squad has one
        yet — these are demo profiles and real accounts are not linked to roster
        seats — so today this is always the glyph, and it is where the photo goes
        the day they are.

        (The status dot that used to sit in the top-right corner of the row went
        with it, also the owner's call. The status itself is still on the
        athlete's own screen, said in words.)
      */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-tint text-primary">
        <IconUser size={18} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full" style={sideDot(a)} />
        {sideLabel(a)}
      </span>
      <span className="text-muted">
        <IconChevronRight size={15} />
      </span>
    </>
  );
  return href ? (
    <Link href={href} data-tour={tour} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} data-tour={tour} className={cls}>
      {inner}
    </button>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
type Tab = "roster" | "workouts";

/*
  ONE screen, shown to athletes and to coaches alike — the Coach Console's Team
  tab renders this exact component. The only difference a coach gets is
  `athleteHref`: for a rower who is also a real account on this squad it returns
  the link to their full training screen, which is a permission an athlete does
  not have. And `rowAction`, the technical-note button on each roster row, and
  `inConsole`, which keeps the stand-in rower off the top of a board. Everything else — roster, workouts, the erg boards, the water
  telemetry — is identical, on purpose: a coach and a rower should be looking
  at the same numbers.
*/
export default function TeamScreen({
  athleteHref,
  only,
  rowAction,
  inConsole = false,
}: {
  athleteHref?: (a: Athlete) => string | null;
  /* The Coach Console shows the two halves as two bottom tabs (Team = roster,
     Workouts = the boards), so it asks for one half and gets no switch. */
  only?: Tab;
  /* A button in each roster row, between the name and the side — the coach's
     technical note (owner, 2026-09-13: it used to be one big "Write a
     technical note" button on top of the list). Athletes get no button. */
  rowAction?: (a: Athlete) => React.ReactNode;
  /* The Coach Console — see WorkoutBoard's `inConsole`. */
  inConsole?: boolean;
} = {}) {
  const [picked, setTab] = useState<Tab>("roster");
  const tab = only ?? picked;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  /*
    THE WHOLE SQUAD, in two groups: rowers, then coxswains, each in name order.
    Coxswains used to be filtered out of this list altogether — on a roster for
    an app whose setup screen asks "Rower or Coxswain", a cox who joined could
    never find themselves. They are listed apart, as a boathouse lists them,
    not left off.
  */
  const byName = (a: Athlete, b: Athlete) => a.name.localeCompare(b.name);
  const rowers = useMemo(() => roster.filter((a) => !a.cox).sort(byName), []);
  const coxes = useMemo(() => roster.filter((a) => a.cox).sort(byName), []);

  const q = query.trim().toLowerCase();
  const matches = (a: Athlete) => !q || a.name.toLowerCase().includes(q);
  const shownRowers = rowers.filter(matches);
  const shownCoxes = coxes.filter(matches);
  const shownCount = shownRowers.length + shownCoxes.length;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      {/* No "Team" title — the tab bar already says it; the Roster / Workouts
          switch is the top of the screen. */}
      <h1 className="sr-only">{only === "workouts" ? "Workouts" : "Team"}</h1>

      {/* sub-navigation

          THE SELECTED HALF FILLS ITS SIDE, EDGE TO EDGE (owner, 2026-09-14).
          The dark fill used to be a smaller pill floating inside a 4px inset,
          so the switch read as a box with a button loose in it. Now the two
          halves ARE the box: no padding, no gap, and `overflow-hidden` is what
          lets the fill take the container's own rounded corners with it. */}
      {!only && (
        <div className="flex overflow-hidden rounded-xl border border-border bg-surface">
          {(["roster", "workouts"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[12px] font-semibold capitalize transition-colors ${
                tab === t ? "bg-text text-background" : "text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "roster" ? (
        <>
          {/* SEARCH — a fully round bubble. It was a dark `bg-well` hole
              (2026-09-14); the owner turned it WHITE on 2026-09-16 ("it's
              gray, I think it should be white"), same as the Workouts search. */}
          <div className={`${only ? "" : "mt-3 "}flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5`}>
            <span className="text-muted">
              <IconSearch size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {shownRowers.map((a, i) => (
              <RosterRow
                key={a.id}
                a={a}
                tour={i === 0 ? "coach-team-first-rower" : undefined}
                onOpen={() => setOpen(a.id)}
                href={athleteHref?.(a) ?? undefined}
                action={rowAction?.(a)}
              />
            ))}
            {/* Coxswains, under their own heading — only when there are any to show. */}
            {shownCoxes.length > 0 && (
              <div className={`px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted ${shownRowers.length > 0 ? "mt-3 mb-0.5" : "mb-0.5"}`}>
                Coxswains
              </div>
            )}
            {shownCoxes.map((a) => (
              <RosterRow
                key={a.id}
                a={a}
                onOpen={() => setOpen(a.id)}
                href={athleteHref?.(a) ?? undefined}
                action={rowAction?.(a)}
              />
            ))}
            {shownCount === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No one matches “{query}”.
              </div>
            )}
          </div>
        </>
      ) : (
        <TeamWorkouts inConsole={inConsole} />
      )}

      {open && <AthleteSheet athleteId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
