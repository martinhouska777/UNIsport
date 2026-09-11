"use client";

/*
  Varsity TEAM tab — the squad.
  ---------------------------------------------------------------------------
  A top sub-navigation switches between:
    • Roster   — the whole squad (grouped like the lineup pool), searchable; tap
                 a rower to open their profile (team year, height/weight, status,
                 erg PRs).
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
import { useUnits } from "@/components/useUnits";
import { formatWeight } from "@/lib/varsity/units";
import { roster, rosterById, sideMeta, COX_COLOR, COX_INK, type Athlete } from "@/lib/varsity/coachLineup";
import { teamProfile } from "@/lib/varsity/teamProfiles";
import { statusOptions, prPieces, type StatusTone } from "@/lib/varsity/athleteProfile";
import { IconSearch, IconChevronRight } from "@/components/icons";

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";
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
  A TEAMMATE'S CARD — what a squad genuinely shares out loud, and nothing else.

  It used to carry their whole training month: a day-by-day calendar, a
  consistency percentage, hours trained, how many extra sessions, a breakdown
  by activity. That is the athlete's private log, which the rules say only
  their coach may look at (lib/varsity/membership → can.readTraining) — and
  the Team tab was handing the same view to all forty of their peers. Between
  teammates a consistency figure is not information, it is a stick.

  So the card is now: who they are, how they row, and their erg PRs — the
  numbers a boathouse already compares in the open. The coach's full view of a
  rower lives in the Coach Console (components/varsity/coach/athlete), behind
  the permission that exists for it.
*/
function AthleteSheet({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const a = rosterById[athleteId];
  const p = teamProfile(athleteId);
  const { units } = useUnits();
  const classLine = [p.classYear, p.teamYear].filter(Boolean).join(" · ");
  const status = statusOptions.find((s) => s.title === p.status);

  return (
    <Sheet title="Athlete" onClose={onClose}>
      <div className="flex items-start gap-3.5">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary-line bg-gradient-to-br from-primary/15 to-primary/5">
          <span className="text-xl font-semibold text-primary">{a?.initials ?? "—"}</span>
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
      </div>

      {/* Status — whether they are in the boat this week is squad business. */}
      {status && (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
          <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${toneDot[status.tone]}`} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-text">{status.title}</div>
            <div className="truncate text-[11px] text-muted">{status.sub}</div>
          </div>
        </div>
      )}

      {/* erg PRs */}
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
}: {
  a: Athlete;
  onOpen: () => void;
  href?: string;
  tour?: string;
}) {
  const tone = toneOf(teamProfile(a.id).status);
  const cls =
    "flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-2";
  const inner = (
    <>
      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[11px] font-semibold text-primary">
        {a.initials}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${toneDot[tone]}`} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full" style={sideDot(a)} />
        {a.cox ? "Cox" : a.side}
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
  not have. Everything else — roster, workouts, the erg boards, the water
  telemetry — is identical, on purpose: a coach and a rower should be looking
  at the same numbers.
*/
export default function TeamScreen({
  athleteHref,
}: {
  athleteHref?: (a: Athlete) => string | null;
} = {}) {
  const [tab, setTab] = useState<Tab>("roster");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // Rowers only (coxswains aren't on the squad roster here), in name order.
  const rowers = useMemo(
    () => roster.filter((a) => !a.cox).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const q = query.trim().toLowerCase();
  const shown = q ? rowers.filter((a) => a.name.toLowerCase().includes(q)) : rowers;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      {/* Just the word. "The squad" sat above it saying the same thing twice. */}
      <h1 className="text-2xl font-semibold text-text">Team</h1>

      {/* sub-navigation */}
      <div className="mt-3 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {(["roster", "workouts"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors ${
              tab === t ? "bg-text text-background" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "roster" ? (
        <>
          {/* search */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
            <span className="text-muted">
              <IconSearch size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the squad"
              className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
            />
          </div>
          <div className="mt-1.5 px-0.5 text-[11px] text-muted">{rowers.length} rowers</div>

          <div className="mt-3 flex flex-col gap-1.5">
            {shown.map((a, i) => (
              <RosterRow
                key={a.id}
                a={a}
                tour={i === 0 ? "coach-team-first-rower" : undefined}
                onOpen={() => setOpen(a.id)}
                href={athleteHref?.(a) ?? undefined}
              />
            ))}
            {shown.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No one matches “{query}”.
              </div>
            )}
          </div>
        </>
      ) : (
        <TeamWorkouts />
      )}

      {open && <AthleteSheet athleteId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
