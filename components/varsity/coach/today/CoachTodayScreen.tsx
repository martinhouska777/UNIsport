"use client";

/*
  Coach TODAY — the console's first screen.
  ---------------------------------------------------------------------------
  Today and tomorrow, each as its AM and PM. Every slot says three things at a
  glance — what the plan prescribes (in the squad's own words and colour) and
  where its lineup has got to (none / draft / live, and how full) — and offers
  exactly two taps: EDIT SESSION opens the Plan tab on that slot's editor,
  BOATS opens the Lineup tab on that practice. Nothing here is edited in place;
  this screen is the door, the tabs are the rooms. Who is OUT is not here: that
  is a fact about filling the boats, and it lives with the boats.

  It exists because the other four tabs each open on a list, and a coach on a
  dock at dawn wants the morning, not an index. All decisions about what to
  show are made in lib/varsity/coachToday.ts; this file only fetches and draws.
  Colours are theme tokens; a session's colour is content colour from the
  squad's config, applied inline (rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useMembership } from "@/components/varsity/useMembership";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import { fetchLineup, type StoredLineup } from "@/lib/varsity/lineupStore";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { defaultConfig, type TrainingConfig } from "@/lib/varsity/trainingConfig";
import { periods, sessionKey } from "@/lib/varsity/coachPlan";
import {
  buildDay,
  todayAndTomorrow,
  type TodayDay,
  type TodaySlot,
} from "@/lib/varsity/coachToday";
import { IconAnchor, IconCalendar, IconChevronRight, IconPencil, IconPlus } from "@/components/icons";

const PLAN = "/varsity/coach/plan";
const LINEUP = "/varsity/coach/lineup";
/** The two deep links the console's screens accept (see their page.tsx). */
export const planSlotHref = (key: string) => `${PLAN}?slot=${encodeURIComponent(key)}`;
export const lineupPracticeHref = (key: string) => `${LINEUP}?practice=${encodeURIComponent(key)}`;

/*
  Where the lineup has got to, in one pill. The same three words and the same
  dots as the Lineup picker and the builder's own chip, so "Published" here is
  "Published" there.
*/
function LineupPill({ slot }: { slot: TodaySlot }) {
  const l = slot.lineup;
  if (!l) {
    if (!slot.needsLineup) return null;
    return (
      <span className="flex items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted/50" />
        No lineup yet
      </span>
    );
  }
  const live = l.status === "published";
  return (
    <span
      className={`flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
        live ? "border-success-line bg-success-tint text-success" : "border-warn-line bg-warn-tint text-warn"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-warn"}`} />
      {live ? "Published" : "Draft"} · {l.boats} {l.boats === 1 ? "boat" : "boats"}
      {l.seats > 0 && (
        <span className="font-normal opacity-80">
          · {l.filled}/{l.seats}
        </span>
      )}
    </span>
  );
}

/*
  ONE SLOT — a plain card, and the session's colour is the DOT.

  The whole card used to be washed in that colour. Two things were wrong with
  it. The wash is a `background`, so it REPLACED the card's own surface — which
  meant the hairline between the workout and its two buttons, and the one
  between Edit session and Boats, were being drawn across a tint instead of on
  a surface and had all but vanished; the two doors read as loose words at the
  bottom of a green rectangle. And with every water session the same colour, a
  morning and an afternoon were two big green blocks that said nothing apart.

  So the card is the app's normal surface, the divider lines are back, and the
  colour lives where it can still be read at a glance without swallowing the
  card: the dot beside the session's name.
*/
function SlotCard({ slot }: { slot: TodaySlot }) {
  const s = slot.session;
  const showBoats = slot.needsLineup || !!slot.lineup;
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface ${s ? "border-border" : "border-dashed border-border"}`}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
        <span className="flex items-baseline gap-2">
          <span className="text-[12px] font-bold tracking-[0.1em] text-text">{slot.period}</span>
          <span className="text-[12px] text-muted">{slot.time}</span>
        </span>
        <LineupPill slot={slot} />
      </div>

      {s ? (
        <div className="px-3.5 pb-1 pt-2">
          <div className="text-[16px] font-semibold leading-snug text-text">
            {s.description || s.label}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </div>
          {s.note && <div className="mt-1.5 text-[12px] leading-relaxed text-text/80">{s.note}</div>}
        </div>
      ) : (
        <div className="px-3.5 pb-1 pt-2 text-[14px] italic text-muted">Nothing planned</div>
      )}

      {/* The two doors. Big enough for a thumb, labelled with where they go. */}
      <div className="mt-2 flex border-t border-border">
        <Link
          href={planSlotHref(slot.key)}
          className="tap44 flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-text active:bg-surface-2"
        >
          {s ? <IconPencil size={13} /> : <IconPlus size={13} />}
          {s ? "Edit session" : "Add session"}
        </Link>
        {showBoats && (
          <Link
            href={lineupPracticeHref(slot.key)}
            className="tap44 flex flex-1 items-center justify-center gap-1.5 border-l border-border px-3 py-2.5 text-[12px] font-semibold text-text active:bg-surface-2"
          >
            <IconAnchor size={13} />
            Boats
            <IconChevronRight size={13} className="text-muted" />
          </Link>
        )}
      </div>
    </div>
  );
}

/*
  WHO IS OUT IS NOT ON THIS SCREEN (owner, 2026-09-21). There was a card here
  listing today's sick, injured and away — and the coach's answer to it is
  always the same thing: build the boats without them. That happens on the
  Lineup tab, where the pool already shows every one of them greyed out with
  their reason, so this card was a list the coach reads twice and acts on once.
  Today is what is ON; who can't row is part of filling the boats.
*/

function DaySection({ day }: { day: TodayDay }) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[19px] font-semibold text-text">{day.title}</h2>
        <span className="text-[12px] font-medium text-muted">{day.label}</span>
      </div>
      {day.block ? (
        <div className="mt-0.5 text-[11px] text-muted">
          {day.block.name}
          {day.block.status === "draft" && (
            <span className="text-warn"> · draft — the squad can&apos;t see it</span>
          )}
        </div>
      ) : (
        /* No block covers the day: the plan has nothing for it, and the way
           to fix that is a block, not a session — say so and offer the door. */
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-3.5 py-3">
          <span className="text-muted">
            <IconCalendar size={18} />
          </span>
          <span className="flex-1 text-[12px] leading-relaxed text-muted">
            No training block covers this day.
          </span>
          <Link href={PLAN} className="flex-shrink-0">
            <Button size="sm">New block</Button>
          </Link>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2.5">
        {day.slots.map((slot) => (
          <SlotCard key={slot.key} slot={slot} />
        ))}
      </div>
    </section>
  );
}

export default function CoachTodayScreen() {
  const { membership } = useMembership();
  const [cfg, setCfg] = useState<TrainingConfig>(defaultConfig);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [lineups, setLineups] = useState<Record<string, StoredLineup | null>>({});
  const [loading, setLoading] = useState(true);

  const { today, tomorrow } = useMemo(() => todayAndTomorrow(), []);

  useEffect(() => {
    const teamId = membership?.teamId;
    if (!teamId) return;
    let active = true;
    fetchTrainingConfig(teamId).then((c) => active && setCfg(c));
    return () => {
      active = false;
    };
  }, [membership?.teamId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const days = [today, tomorrow];
      const p = await fetchPlan();
      if (!active) return;
      setPlan(p);
      // The four practices' lineups, for boat and seat counts.
      const practiceKeys = days.flatMap((d) => periods.map((p) => sessionKey(d, p)));
      const stored = await Promise.all(practiceKeys.map((k) => fetchLineup(k)));
      if (!active) return;
      const map: Record<string, StoredLineup | null> = {};
      practiceKeys.forEach((k, i) => (map[k] = stored[i]));
      setLineups(map);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [today, tomorrow]);

  const days = useMemo(() => {
    if (!plan) return [];
    return [
      { date: today, title: "Today" },
      { date: tomorrow, title: "Tomorrow" },
    ].map(({ date, title }) =>
      buildDay({
        date,
        title,
        blocks: plan.blocks,
        sessions: plan.sessions,
        cfg,
        lineups,
      }),
    );
  }, [plan, cfg, lineups, today, tomorrow]);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
      {/* No "Coach Console" eyebrow. The bar at the top of every screen in here
          already says which console this is and whose squad it belongs to. */}
      {loading ? (
        <div className="mt-10 text-center text-[13px] text-muted">Loading the morning…</div>
      ) : (
        <div className="flex flex-col gap-7">
          {days.map((d) => (
            <DaySection key={d.iso} day={d} />
          ))}
        </div>
      )}
    </div>
  );
}
