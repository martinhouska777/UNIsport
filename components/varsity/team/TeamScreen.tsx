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
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { roster, rosterGroups, rosterById, sideMeta, COX_COLOR, type Athlete } from "@/lib/varsity/coachLineup";
import { teamProfile } from "@/lib/varsity/teamProfiles";
import { statusOptions, prPieces, type StatusTone } from "@/lib/varsity/athleteProfile";
import { IconSearch, IconChevronRight, IconAnchor, IconActivity } from "@/components/icons";

const toneText: Record<StatusTone, string> = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-muted",
};
const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneRing: Record<StatusTone, string> = {
  success: "border-success/30 bg-success/15 text-success",
  warn: "border-warn/30 bg-warn/15 text-warn",
  danger: "border-danger/30 bg-danger/15 text-danger",
  muted: "border-border bg-surface-2 text-muted",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";
const sideColor = (a: Athlete) => (a.cox ? COX_COLOR : sideMeta[a.side].color);
const sideLabel = (a: Athlete) => (a.cox ? "Cox" : sideMeta[a.side].label);

/* ─────────────────────────  athlete profile sheet  ───────────────────────── */
function AthleteSheet({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const a = rosterById[athleteId];
  const p = teamProfile(athleteId);
  const tone = toneOf(p.status);
  const classLine = [p.classYear, p.teamYear].filter(Boolean).join(" · ");

  return (
    <Sheet title="Athlete" onClose={onClose}>
      <div className="flex items-start gap-3.5">
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-primary/5">
          <span className="text-xl font-semibold text-primary">{a?.initials ?? "—"}</span>
          <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-[2.5px] border-surface ${toneDot[tone]}`} />
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

      {/* status */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border ${toneRing[tone]}`}>
          <IconActivity size={18} />
        </span>
        <div>
          <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">Status</div>
          <div className={`mt-0.5 text-[13px] font-medium ${toneText[tone]}`}>{p.status}</div>
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
  const [tab, setTab] = useState<Tab>("roster");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const cox = roster.filter((a) => a.cox).length;
    return { rowers: roster.length - cox, cox };
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (a: Athlete) => a.name.toLowerCase().includes(q);

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
          <div className="mt-1.5 px-0.5 text-[10px] text-muted">
            {counts.rowers} rowers · {counts.cox} coxswains
          </div>

          {q ? (
            // Flat, filtered list while searching.
            <div className="mt-3 flex flex-col gap-1.5">
              {roster.filter(matches).map((a) => (
                <RosterRow key={a.id} a={a} onOpen={() => setOpen(a.id)} />
              ))}
              {roster.filter(matches).length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
                  No one matches “{query}”.
                </div>
              )}
            </div>
          ) : (
            // Grouped by training group otherwise.
            <div className="mt-3 flex flex-col gap-4">
              {rosterGroups.map((g) => (
                <div key={g.label}>
                  <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {g.label}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {g.ids.map((id) => {
                      const a = rosterById[id];
                      return a ? <RosterRow key={id} a={a} onOpen={() => setOpen(id)} /> : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // Ergs — built next slice.
        <div className="mt-4 rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <IconAnchor size={20} />
          </div>
          <div className="text-[14px] font-semibold text-text">Erg rankings are next</div>
          <p className="mx-auto mt-1 max-w-[16rem] text-[12px] leading-relaxed text-muted">
            The last workout, ranked — with each rower&apos;s improvement against their previous time.
          </p>
        </div>
      )}

      {open && <AthleteSheet athleteId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
