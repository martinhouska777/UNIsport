"use client";

/*
  Coach TODAY — the console's first screen.
  ---------------------------------------------------------------------------
  Today and tomorrow, each as its AM and PM. Every slot says three things at a
  glance — what the plan prescribes (in the squad's own words and colour),
  where its lineup has got to (none / draft / live, and how full), and who is
  out — and offers exactly two taps: EDIT SESSION opens the Plan tab on that
  slot's editor, BOATS opens the Lineup tab on that practice. Nothing here is
  edited in place; this screen is the door, the tabs are the rooms.

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
import { fetchOutOn } from "@/lib/varsity/availabilityStore";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { defaultConfig, type TrainingConfig } from "@/lib/varsity/trainingConfig";
import { outMeta, type OutReason } from "@/lib/varsity/coachLineup";
import { periods, sessionKey, toISO } from "@/lib/varsity/coachPlan";
import {
  buildDay,
  practiceForOut,
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{children}</div>
  );
}

/*
  Where the lineup has got to, in one pill. The same three words and the same
  dots as the Lineup picker and the publish bar, so "Live" here is "Live" there.
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
      {live ? "Live" : "Draft"} · {l.boats} {l.boats === 1 ? "boat" : "boats"}
      {l.seats > 0 && (
        <span className="font-normal opacity-80">
          · {l.filled}/{l.seats}
        </span>
      )}
    </span>
  );
}

/*
  ONE SLOT. The whole card is washed in the session's colour — the way the
  coach's own spreadsheet paints a square, and the way the Lineup picker
  already does — so the day reads as a pattern before a word of it is read.
  An empty slot is dashed, and its one action is to add a session.
*/
function SlotCard({ slot }: { slot: TodaySlot }) {
  const s = slot.session;
  const wash = s ? { background: `color-mix(in oklab, ${s.color} 14%, transparent)` } : undefined;
  const showBoats = slot.needsLineup || !!slot.lineup;
  return (
    <div
      style={wash}
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

/* Who is out on this day — and the one door to changing that, which is the pool. */
function OutRow({ day }: { day: TodayDay }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <SectionLabel>{day.out.length ? `Out · ${day.out.length}` : "Out"}</SectionLabel>
        {day.out.length === 0 ? (
          <div className="mt-1 text-[13px] text-text">Everyone available.</div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {day.out.map((o) => (
              <span
                key={o.id}
                className="flex items-center gap-1.5 rounded-lg border border-danger-line bg-danger-tint px-2 py-1 text-[12px] text-text"
              >
                {o.name}
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-danger">
                  {outMeta[o.reason]}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        href={lineupPracticeHref(practiceForOut(day))}
        className="tap44 flex-shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted active:bg-surface-2"
      >
        Mark out
      </Link>
    </div>
  );
}

function DaySection({ day }: { day: TodayDay }) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold text-text">{day.title}</h2>
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
        {day.title === "Today" && <OutRow day={day} />}
      </div>
    </section>
  );
}

export default function CoachTodayScreen() {
  const { membership } = useMembership();
  const [cfg, setCfg] = useState<TrainingConfig>(defaultConfig);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [lineups, setLineups] = useState<Record<string, StoredLineup | null>>({});
  const [out, setOut] = useState<Record<string, Record<string, OutReason>>>({});
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
      const isos = days.map(toISO);
      const [p, outs] = await Promise.all([fetchPlan(), Promise.all(isos.map(fetchOutOn))]);
      if (!active) return;
      setPlan(p);
      const outMap: Record<string, Record<string, OutReason>> = {};
      isos.forEach((iso, i) => (outMap[iso] = outs[i]));
      setOut(outMap);
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
        out: out[toISO(date)] ?? {},
      }),
    );
  }, [plan, cfg, lineups, out, today, tomorrow]);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Coach Console</div>
      {loading ? (
        <div className="mt-10 text-center text-[13px] text-muted">Loading the morning…</div>
      ) : (
        <div className="mt-1 flex flex-col gap-7">
          {days.map((d) => (
            <DaySection key={d.iso} day={d} />
          ))}
        </div>
      )}
    </div>
  );
}
