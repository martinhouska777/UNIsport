"use client";

/*
  CAMPUS STATISTICS — the whole school in one glance, not you.
  ---------------------------------------------------------------------------
  Your own numbers live on the Challenges tab, next to the challenges they
  feed. This screen is the other kind: how much a campus of students actually
  trains, which is the sort of thing people screenshot.

  Every figure is worked out from what the boards already loaded — no extra
  read, no extra database function. And nothing here is invented: with nothing
  logged it says so rather than showing a convincing fake.
*/
import { Empty, Loading, Stat } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import type { CampusStats as Stats } from "@/lib/league";

/** "1,240" — every number on this screen is potentially large. */
const n = (v: number) => v.toLocaleString();

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
      {/* The tab is called "Stats", which is short enough to fit four across.
          This says what it actually is, because "the whole school added up" is
          not what anyone assumes a statistics tab means. */}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {schoolName} altogether
      </h2>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Not you — everybody. This is the whole school added up. Your own numbers are on the
        Challenges tab.
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
