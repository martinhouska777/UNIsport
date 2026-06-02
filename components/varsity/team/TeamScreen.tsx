"use client";

/*
  Varsity TEAM tab — the squad.
  ---------------------------------------------------------------------------
  A top sub-navigation switches between:
    • Roster — the whole squad (grouped like the lineup pool), searchable; tap a
      rower to open their profile (team year, height/weight, status, erg PRs).
    • Ergs   — last-workout rankings + improvement vs last time (next slice).

  Roster comes from lib/varsity/coachLineup; each athlete's profile detail from
  lib/varsity/teamProfiles (stable demo data until accounts link to the squad).
  All colors are theme tokens; the rowing-side dot is a CONTENT color from data
  applied via inline style (the rule-1 exception the lineup screens use).
*/
import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import ErgBoard from "@/components/varsity/team/ErgBoard";
import { useAppState } from "@/components/AppState";
import { fetchProfileFullName } from "@/lib/varsity/planStore";
import { roster, rosterById, sideMeta, COX_COLOR, type Athlete } from "@/lib/varsity/coachLineup";
import { teamProfile } from "@/lib/varsity/teamProfiles";
import { teamTrainingMonth, formatDuration, type CatTotal } from "@/lib/varsity/teamTraining";
import { formatMetrics } from "@/lib/varsity/logParse";
import {
  statusOptions,
  prPieces,
  logCategoryColor,
  logCategoryLabel,
  legendCategories,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import { IconSearch, IconChevronRight, IconChevronDown } from "@/components/icons";

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";
const sideColor = (a: Athlete) => (a.cox ? COX_COLOR : sideMeta[a.side].color);
const sideLabel = (a: Athlete) => (a.cox ? "Cox" : sideMeta[a.side].label);

/* ─────────────────────────  athlete profile sheet  ───────────────────────── */
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

function CatBreakdown({ rows, empty }: { rows: CatTotal[]; empty: string }) {
  if (rows.length === 0) {
    return <div className="px-3.5 py-3 text-[11px] text-muted">{empty}</div>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div key={row.cat} className="flex items-center gap-2.5 px-3.5 py-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: logCategoryColor[row.cat] ?? "var(--muted)" }}
          />
          <span className="flex-1 text-[12px] font-medium text-text">
            {logCategoryLabel[row.cat] ?? row.cat}
          </span>
          <span className="text-[11px] text-muted">{row.sessions}×</span>
          <span className="w-16 text-right text-[12px] font-semibold text-text">
            {formatDuration(row.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

function AthleteSheet({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const a = rosterById[athleteId];
  const p = teamProfile(athleteId);
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDay, setSelDay] = useState<number | null>(null);
  const [openBreak, setOpenBreak] = useState<"trained" | "extra" | null>(null);

  const month = teamTrainingMonth(athleteId, view.y, view.m);
  const classLine = [p.classYear, p.teamYear].filter(Boolean).join(" · ");
  const atCurrent = view.y === now.getFullYear() && view.m === now.getMonth();
  const goMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
    setSelDay(null);
  };
  const selected = selDay != null ? month.days.find((d) => d.day === selDay) ?? null : null;

  const dotsFor = (sessions: { cat: string }[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of sessions) {
      if (!seen.has(s.cat) && out.length < 3) {
        seen.add(s.cat);
        out.push(s.cat);
      }
    }
    return out;
  };

  const tileCls = (active: boolean) =>
    `rounded-2xl border px-2 py-3 text-center ${
      active ? "border-primary bg-primary/10" : "border-border bg-surface-2"
    }`;

  return (
    <Sheet title="Athlete" onClose={onClose}>
      <div className="flex items-start gap-3.5">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-primary/5">
          <span className="text-xl font-semibold text-primary">{a?.initials ?? "—"}</span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-lg font-semibold leading-tight text-text">{a?.name ?? "Unknown"}</div>
          {classLine && <div className="mt-1 text-[11px] text-muted">{classLine}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-text">
              <span className="h-2 w-2 rounded-full" style={{ background: sideColor(a) }} />
              {sideLabel(a)}
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-text">
              {p.heightCm} cm
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[10px] text-text">
              {p.weightKg} kg
            </span>
          </div>
        </div>
      </div>

      {/* month switcher — stats + calendar follow this */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Training</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goMonth(-1)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted"
          >
            <IconChevronDown size={13} className="rotate-90" />
          </button>
          <span className="min-w-[5.5rem] text-center text-[12px] font-semibold text-text">
            {month.monthLabel} {month.y}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goMonth(1)}
            disabled={atCurrent}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted disabled:opacity-30"
          >
            <IconChevronDown size={13} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* stats for the viewed month — Trained / Extra expand a breakdown */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className={tileCls(false)}>
          <div className="text-lg font-semibold leading-none text-text">{month.consistency}%</div>
          <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">
            Consistency
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpenBreak((o) => (o === "trained" ? null : "trained"))}
          className={tileCls(openBreak === "trained")}
        >
          <div className="text-lg font-semibold leading-none text-text">{formatDuration(month.minutes)}</div>
          <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">Trained</div>
        </button>
        <button
          type="button"
          onClick={() => setOpenBreak((o) => (o === "extra" ? null : "extra"))}
          className={tileCls(openBreak === "extra")}
        >
          <div className="text-lg font-semibold leading-none text-text">{month.extraCount}</div>
          <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-muted">Extra</div>
        </button>
      </div>

      {openBreak && (
        <div className="mt-1.5 overflow-hidden rounded-2xl border border-border bg-surface-2">
          <div className="border-b border-border px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
            {openBreak === "trained" ? "By activity" : "Extra by activity"}
          </div>
          <CatBreakdown
            rows={openBreak === "trained" ? month.byCategory : month.extraByCategory}
            empty={openBreak === "trained" ? "Nothing logged this month." : "No extra sessions this month."}
          />
        </div>
      )}

      {/* training calendar */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="py-0.5 text-center text-[8px] font-semibold tracking-[0.12em] text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[3px] px-2 pb-2.5 pt-1.5">
          {Array.from({ length: month.leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {month.days.map((d) => {
            const dots = dotsFor(d.sessions);
            const isSel = selDay === d.day;
            const isToday = d.day === month.todayDay;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelDay(d.day)}
                className={`flex aspect-square flex-col items-center justify-center rounded-[9px] pt-0.5 ${
                  isSel
                    ? "border border-primary bg-primary/20"
                    : isToday
                      ? "border border-primary/40 bg-primary/10"
                      : dots.length
                        ? "active:bg-surface"
                        : ""
                }`}
              >
                <span
                  className={`text-[11px] font-medium leading-none ${
                    isSel || isToday ? "text-primary" : d.future ? "text-muted/50" : "text-text"
                  }`}
                >
                  {d.day}
                </span>
                <span className="mt-[3px] flex h-1 items-center gap-0.5">
                  {dots.map((c, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* selected-day detail — minutes · metres · split, like the log */}
        <div className="border-t border-border px-3.5 py-2.5">
          {selected == null ? (
            <div className="text-[11px] text-muted">Tap a day to see what they did.</div>
          ) : selected.sessions.length === 0 ? (
            <div className="text-[11px] text-muted">
              {month.monthLabel} {selected.day} · {selected.future ? "Upcoming" : "Rest day"}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selected.sessions.map((s, i) => {
                const metrics = formatMetrics(s.minutes, s.metres, s.split);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: logCategoryColor[s.cat] ?? "var(--muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-text">
                          {logCategoryLabel[s.cat] ?? s.cat}
                        </span>
                        {s.extra && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-muted">
                            Extra
                          </span>
                        )}
                      </div>
                      {metrics && <div className="mt-0.5 text-[11px] text-text/90">{metrics}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border px-3.5 py-2.5">
          {legendCategories.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-[9px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: logCategoryColor[c] ?? "var(--muted)" }} />
              {logCategoryLabel[c]}
            </div>
          ))}
        </div>
      </div>

      {/* erg PRs */}
      <div className="mb-2 mt-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
        Personal Bests
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {prPieces.map((piece) => (
          <div
            key={piece}
            className="flex items-baseline justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{piece}</span>
            <span className="text-[14px] font-semibold text-text">{p.prs[piece] ?? "—"}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────  roster row  ───────────────────────── */
function RosterRow({ a, onOpen }: { a: Athlete; onOpen: () => void }) {
  const tone = toneOf(teamProfile(a.id).status);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-2"
    >
      <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[11px] font-semibold text-primary">
        {a.initials}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${toneDot[tone]}`} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
      <span className="flex items-center gap-1 text-[10px] text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: sideColor(a) }} />
        {a.cox ? "Cox" : a.side}
      </span>
      <span className="text-muted">
        <IconChevronRight size={15} />
      </span>
    </button>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
type Tab = "roster" | "ergs";

export default function TeamScreen() {
  const { userId } = useAppState();
  const [tab, setTab] = useState<Tab>("roster");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProfileFullName(userId).then((n) => active && setMyName(n));
    return () => {
      active = false;
    };
  }, [userId]);

  // Rowers only (coxswains aren't on the squad roster here), in name order.
  const rowers = useMemo(
    () => roster.filter((a) => !a.cox).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const q = query.trim().toLowerCase();
  const shown = q ? rowers.filter((a) => a.name.toLowerCase().includes(q)) : rowers;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">The squad</div>
      <h1 className="mt-0.5 text-2xl font-semibold text-text">Team</h1>

      {/* sub-navigation */}
      <div className="mt-3 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {(["roster", "ergs"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors ${
              tab === t ? "bg-primary text-primary-contrast" : "text-muted"
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
          <div className="mt-1.5 px-0.5 text-[10px] text-muted">{rowers.length} rowers</div>

          <div className="mt-3 flex flex-col gap-1.5">
            {shown.map((a) => (
              <RosterRow key={a.id} a={a} onOpen={() => setOpen(a.id)} />
            ))}
            {shown.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No one matches “{query}”.
              </div>
            )}
          </div>
        </>
      ) : (
        <ErgBoard myName={myName} onOpen={(id) => setOpen(id)} />
      )}

      {open && <AthleteSheet athleteId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
