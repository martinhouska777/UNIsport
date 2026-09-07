"use client";

/*
  CAMPUS STATISTICS — the whole school in one glance, not you.
  ---------------------------------------------------------------------------
  Your own numbers live on the Challenges tab, next to the challenges they
  feed. This is the other kind: how much a campus of students actually trains,
  which is the sort of thing people screenshot.

  It is a SHEET behind the chart icon on Rankings rather than a tab of its own.
  Nobody opens an app to read aggregate statistics — but plenty of people, once
  they are looking at a leaderboard, want to know how the whole place is doing.
  That is a curiosity, and a curiosity belongs behind an icon.

  Every figure is worked out from what the boards already loaded — no extra
  read, no extra database function. And nothing here is invented: with nothing
  logged it says so rather than showing a convincing fake.
*/
import { useEffect } from "react";
import { IconX } from "@/components/icons";
import { useDragToDismiss } from "@/components/useDragToDismiss";
import { Empty, Loading, Stat } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import type { CampusStats as Stats } from "@/lib/league";

/** "1,240" — every number on this screen is potentially large. */
const n = (v: number) => v.toLocaleString();

export function CampusStatsSheet({
  stats,
  schoolName,
  onClose,
}: {
  stats: Stats | null;
  schoolName: string;
  onClose: () => void;
}) {
  const { dragProps, sheetStyle } = useDragToDismiss(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />
      <div
        style={sheetStyle}
        className="relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        <div {...dragProps} className="cursor-grab active:cursor-grabbing">
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">Campus statistics</div>
              <div className="mt-0.5 text-[11px] text-muted">Everybody, added up</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <CampusStatsSection stats={stats} schoolName={schoolName} />
        </div>
      </div>
    </div>
  );
}

export default function CampusStatsSection({
  stats,
  schoolName,
}: {
  stats: Stats | null;
  schoolName: string;
}) {
  if (!stats) {
    return (
      <div className="px-3.5 py-3">
        <Loading />
      </div>
    );
  }

  if (stats.people === 0) {
    return (
      <div className="px-3.5 py-3">
        <Empty>
          Nobody has logged a session yet. The moment somebody does, this fills up.
        </Empty>
      </div>
    );
  }

  const partnerShare = stats.sessions
    ? Math.round((stats.withPartner / stats.sessions) * 100)
    : 0;

  return (
    <div className="px-3.5 py-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {schoolName} altogether
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Not you — everybody. Your own numbers are on the Challenges tab.
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Stat value={n(stats.sessions)} label="Sessions logged" />
        <Stat value={n(stats.people)} label="Students training" />
        <Stat value={`${stats.avgSessions}`} label="Sessions each" />
        <Stat value={n(stats.km)} label="Kilometres covered" />
        <Stat value={n(stats.partnerships)} label="Partner links" />
        <Stat value={n(stats.totalXp)} label="XP earned" />
      </div>

      <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Worth knowing
      </h2>

      <div className="mt-2 flex flex-col gap-1.5">
        <Fact
          headline={`${partnerShare}% of sessions had a partner`}
          detail={
            partnerShare >= 50
              ? "More than half of this campus trains with somebody. That is the whole idea working."
              : "Every one of those was worth more XP than training alone — and more fun."
          }
        />
        {stats.busiestHouse && (
          <Fact
            headline={`${residenceLabel(stats.busiestHouse)} logs the most`}
            detail="Total sessions, not per person — the biggest and the keenest both count."
          />
        )}
        <Fact
          headline={`The highest level on campus is ${stats.topLevel}`}
          detail="Levels never reset, so this one only ever goes up."
        />
      </div>

      <p className="mt-3 px-0.5 text-[11px] leading-relaxed text-muted">
        Every number here is a total. Nobody&rsquo;s individual sessions, workouts or photos are
        ever part of it.
      </p>
    </div>
  );
}

function Fact({ headline, detail }: { headline: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="text-[13px] font-medium text-text">{headline}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{detail}</div>
    </div>
  );
}
