"use client";

/*
  COACH → ONE ATHLETE. Everything the squad's coach may see about one rower's
  training, on one screen, read-only.

  In the order a coach asks the questions:
    1. WHO — side, status, class year, height, weight, erg PRs. From the narrow
       `varsity_athlete_card` RPC, not from their profile row.
    2. WHEN — a month calendar of what they actually did, with the same category
       colours the athlete sees on their own Calendar tab. Tap a day for the
       sessions. This is the part that needed a new database permission
       (db/varsity_coach_reads.sql); everything else was already readable.
    3. THREE DOORS — Statistics, Past workouts, Calendar — each a screen of
       its own. NOTHING UNDER THEM (owner, 2026-10-01: "just show statistics,
       calendar and past workouts, don't show the erg results under"): the
       lists of erg and water results posted to the team boards are gone;
       those results are on Team → Workouts and in the Ranking.

  READ ONLY, deliberately and at the database level: there is no policy that
  would let a coach edit or delete a session. The log stays the athlete's own
  record of their own training; the coach gets to look.

  Crew telemetry (Peach / SpeedCoach) is NOT here, because an outing belongs to
  a BOAT rather than to a person — that lives in Team → Workouts. What a rower
  did on the water as an individual is in the calendar, like everything else.

  WHEN THERE IS NOTHING YET, the three screens fall back to a worked example
  (lib/varsity/demoAthlete.ts), labelled as one, so the screen can be reviewed
  before a squad has trained a single day. Real data always wins — see the
  header of that file.

  Colours are theme tokens (rule 1); the category dots and the side blade are
  CONTENT colours from data, applied inline (the rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchAthleteCard, type AthleteCard } from "@/lib/varsity/coachAthlete";
import { rosterIdForName, demoAthleteLogs } from "@/lib/varsity/demoAthlete";
import { toISO } from "@/lib/varsity/coachPlan";
import { sideMeta } from "@/lib/varsity/coachLineup";
import {
  prPieces,
  statusOptions,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import { IconActivity, IconArrowLeft, IconCalendar, IconClipboard } from "@/components/icons";
import AthleteNote from "@/components/varsity/coach/athlete/AthleteNote";
import AthleteStats from "@/components/varsity/coach/athlete/AthleteStats";
import AthleteWorkouts from "@/components/varsity/coach/athlete/AthleteWorkouts";
import AthleteWindow from "@/components/varsity/coach/athlete/AthleteWindow";
import CalendarScreen from "@/components/varsity/calendar/CalendarScreen";


const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-faint",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}


export default function AthleteDataScreen({ athleteId }: { athleteId: string }) {
  const now = useMemo(() => new Date(), []);

  const [card, setCard] = useState<AthleteCard | null>(null);
  const [loading, setLoading] = useState(true);
  /* THIS MONTH, and only this month. The page no longer draws a calendar — it
     reads one month of logs for a single purpose: to know whether this rower
     has ever logged anything, and so whether the three screens should fall
     back to the worked example. */
  const view = useMemo(() => ({ y: now.getFullYear(), m: now.getMonth() }), [now]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  /* STATISTICS or CALENDAR (owner, 2026-09-19, then "above calendar put
     statistics"). Who they are stays above the switch — their side, their
     status, the coach's note and their bests are true whichever question is
     being asked; what CHANGES is whether you want the sum of their training or
     the days that made it. The page OPENS ON THE STATISTICS: a coach coming to
     a rower's page is asking how much they have trained, and the calendar is
     where you go when the answer needs explaining. */
  const [openScreen, setOpenScreen] = useState<"stats" | "workouts" | "calendar" | null>(null);
  const [exampleLogs, setExampleLogs] = useState(false);

  /*
    The roster athlete this account is, if it is one of them — the example is
    built from their id, so a heavy rower's example is a heavy rower's numbers.
    Null for anyone not on the (still mock) roster: they get "nothing yet".
  */
  const demoId = useMemo(() => rosterIdForName(card?.name), [card]);

  // Who they are. Athlete-wide, so once.
  useEffect(() => {
    let active = true;
    (async () => {
      const c = await fetchAthleteCard(athleteId);
      if (!active) return;
      setCard(c);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  // Their calendar, one month at a time.
  useEffect(() => {
    if (loading) return;
    let active = true;
    (async () => {
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(athleteId, from, to);
      if (!active) return;
      const example = rows.length === 0 && !!demoId;
      setLogs(example ? demoAthleteLogs(demoId!, view.y, view.m) : rows);
      setExampleLogs(example);
    })();
    return () => {
      active = false;
    };
  }, [athleteId, view, demoId, loading]);

  /* The month grid, its dots, its totals and its month arrows all lived here.
     They are gone: the Calendar card opens the athlete's REAL calendar screen
     now, and this page's job is who they are plus the three doors. */

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading…</p>;
  }

  /*
    No card means the database said no: a captain (who never gets athlete data),
    or someone no longer on this squad. Say so plainly rather than showing an
    empty screen that looks like the athlete has never trained.
  */
  if (!card) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
        <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
          <IconArrowLeft size={14} />
          Squad
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] leading-relaxed text-muted">
          You can&apos;t see this athlete&apos;s training. Only a coach of their squad can, and only
          while they are on it.
        </div>
      </div>
    );
  }

  const p = card.profile;
  const cox = p.boatRole === "Coxswain";
  const side = sideMeta[p.side];
  const pinned = prPieces.filter((piece) => (p.prs[piece] ?? "").trim());

  /* Their name, or the honest absence of one — the page's title, and the name
     each of the three screens is opened under. */
  const who = card.name || "Unnamed athlete";

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
        <IconArrowLeft size={14} />
        Squad
      </Link>

      {/* ── 1. Who ── */}
      <h1 className="mt-2 text-2xl font-semibold text-text">{who}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {cox ? (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Coxswain
          </span>
        ) : (
          <span
            className="rounded-md border px-2 py-1 text-[11px] font-semibold"
            style={{
              background: side.color,
              color: side.ink,
              borderColor: `color-mix(in oklab, ${side.ink} 22%, transparent)`,
            }}
          >
            {side.label}
          </span>
        )}
        {p.teamYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.teamYear}
          </span>
        )}
        {card.classYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Class of {card.classYear}
          </span>
        )}
        {p.heightCm != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.heightCm} cm
          </span>
        )}
        {p.weightKg != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.weightKg} kg
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
          <span className={`h-1.5 w-1.5 rounded-full ${toneDot[toneOf(p.status)]}`} />
          {p.status}
        </span>
      </div>

      {/* The coach's note — it used to have a Notes tab of its own. */}
      <SectionLabel>Coach&apos;s note</SectionLabel>
      <AthleteNote athleteId={athleteId} name={card.name || "this athlete"} />

      {pinned.length > 0 && (
        <>
          <SectionLabel>Personal bests</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {pinned.map((piece) => (
              <div
                key={piece}
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center"
              >
                <div className="text-[13px] font-semibold leading-none text-text">{p.prs[piece]}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  {piece}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── THREE DOORS (owner, 2026-09-19) ──────────────────────────────────
          Not a switch that swaps the middle of this page: each one opens a
          whole screen of its own with a cross to come back — three long
          things taking turns in one panel is a page you get lost in. They
          are the end of the page. A COX HAS TWO (owner, 2026-10-01: Past
          workouts — their erg and water — is "just for athletes"). */}
      <div className={`mt-6 grid gap-2 ${cox ? "grid-cols-2" : "grid-cols-3"}`}>
        {(
          [
            ["stats", "Statistics", <IconActivity key="i" size={18} />],
            ["workouts", "Past workouts", <IconClipboard key="i" size={18} />],
            ["calendar", "Calendar", <IconCalendar key="i" size={18} />],
          ] as const
        )
          .filter(([k]) => !(cox && k === "workouts"))
          .map(([k, label, icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setOpenScreen(k)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-2 py-4 text-center active:bg-surface-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
                {icon}
              </span>
              <span className="text-[12px] font-semibold leading-tight text-text">{label}</span>
            </button>
          ))}
      </div>

      {/* ── the three screens ── */}
      {openScreen === "stats" && (
        <AthleteWindow name={who} title="Statistics" onClose={() => setOpenScreen(null)}>
          <AthleteStats athleteId={athleteId} demo={exampleLogs ? logs : undefined} />
        </AthleteWindow>
      )}
      {openScreen === "workouts" && (
        <AthleteWindow name={who} title="Past workouts" showTitle={false} onClose={() => setOpenScreen(null)}>
          <AthleteWorkouts athleteId={athleteId} demo={exampleLogs ? logs : undefined} />
        </AthleteWindow>
      )}
      {openScreen === "calendar" && (
        /* THE REAL CALENDAR, full size (owner, 2026-09-19: "when it's over the
           whole page… make it the same as it was there in the normal"). It IS
           the screen a rower has under their own Calendar tab — the wall
           calendar with the workout written inside each day — read-only, and
           `real` so the month comes from this athlete's actual logs rather than
           the invented team-mate data the Team tab shows. The coach's own small
           month grid that used to be on this page is gone with it: two
           calendars of the same month is one too many. */
        <AthleteWindow name={who} title="Calendar" fill onClose={() => setOpenScreen(null)}>
          <CalendarScreen teammate={{ id: athleteId, real: true }} />
        </AthleteWindow>
      )}

    </div>
  );
}
