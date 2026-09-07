"use client";

/*
  CHALLENGES — you on one side, your house on the other, each with its level on
  top of its own ladder.

  The level sits ABOVE the challenges because the challenges are what pays for
  it: you read the number, then you read the three things that will move it.
  The other way round it is just a list of chores.

  ALWAYS EXACTLY ONE NEXT THING. The first unfinished challenge is the one
  highlighted and named at the top; the rest of the ladder is there to be
  scrolled, not decided between.
*/
import { useState } from "react";
import LevelAvatar from "@/components/ui/LevelAvatar";
import { Bar, Empty, Stat } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import {
  ladderProgress,
  houseLadderProgress,
  type ChallengeProgress,
  type HouseChallengeProgress,
} from "@/lib/challenges";
import { HOUSE_LEVEL_FACTOR } from "@/lib/xp";
import { toNextLevelLine, type HouseStanding, type LeagueRow } from "@/lib/league";

/* A challenge row, for either ladder — they carry the same four things. */
function Row({
  title,
  blurb,
  have,
  target,
  done,
  fraction,
  xp,
  highlight,
}: {
  title: string;
  blurb: string;
  have: number;
  target: number;
  done: boolean;
  fraction: number;
  xp: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`truncate text-[13px] font-medium ${
            done ? "text-muted line-through" : "text-text"
          }`}
        >
          {title}
        </span>
        <span className="flex-shrink-0 text-[11px] font-semibold text-muted">
          {done ? "Done" : `${have.toLocaleString()} / ${target.toLocaleString()}`}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-muted">{blurb}</span>
        <span className="flex-shrink-0 text-[11px] text-primary">+{xp} XP</span>
      </div>
      {!done && <Bar fraction={fraction} />}
    </div>
  );
}

/** Shows a few at a time, so a twelve-rung ladder isn't a wall on first open. */
function Ladder({
  rows,
  nextKey,
}: {
  rows: (ChallengeProgress | HouseChallengeProgress)[];
  nextKey: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const doneCount = rows.filter((r) => r.done).length;
  const shown = showAll ? rows : rows.slice(0, Math.max(4, doneCount + 3));

  return (
    <>
      <div className="mt-2 flex flex-col gap-1.5">
        {shown.map((r) => (
          <Row
            key={r.challenge.key}
            title={r.challenge.title}
            blurb={r.challenge.blurb}
            have={r.have}
            target={r.target}
            done={r.done}
            fraction={r.fraction}
            xp={r.challenge.xp}
            highlight={r.challenge.key === nextKey}
          />
        ))}
      </div>
      {rows.length > shown.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="tap44 mt-2 w-full text-center text-[12px] font-medium text-primary"
        >
          Show all {rows.length}
        </button>
      )}
    </>
  );
}

/* ─────────────────────────────  you  ───────────────────────────── */

export function YouChallenges({
  me,
  universityKey,
  campusRank,
}: {
  me: LeagueRow | null;
  universityKey: string;
  campusRank: number | null;
}) {
  const rows = me ? ladderProgress(me.counters, universityKey) : [];
  const next = rows.find((r) => !r.done) ?? null;
  const done = rows.filter((r) => r.done).length;
  const colors = houseColorsFor(universityKey, me?.residence);

  return (
    <div className="px-3.5 py-3">
      {/* Your level */}
      <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <LevelAvatar
            name={me?.name ?? ""}
            level={me?.progress.level ?? 1}
            size={44}
            colors={colors}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-text">
              Level {me?.progress.level ?? 1}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted">
              {me
                ? `${me.xp.toLocaleString()} XP${campusRank ? ` · #${campusRank} on campus` : ""}`
                : "Counting…"}
            </div>
          </div>
        </div>
        <Bar fraction={me?.progress.fraction ?? 0} tint={colors?.primary} />
        {me && (
          <div className="mt-2.5 rounded-xl border border-primary-line bg-primary-tint px-3 py-2 text-[11px] font-medium text-primary">
            {toNextLevelLine(me.progress)}
          </div>
        )}
      </div>

      {/* The numbers the challenges are measured against. */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Stat value={`${me?.counters.sessions ?? 0}`} label="Sessions" />
        <Stat value={`${me?.counters.partners ?? 0}`} label="Partners" />
        <Stat value={`${me?.counters.gyms ?? 0}`} label="Gyms" />
        <Stat value={`${me?.counters.weeks3 ?? 0}`} label="Good weeks" />
        <Stat value={`${me?.counters.km ?? 0}`} label="Km" />
        <Stat value={`${done}`} label="Done" />
      </div>

      <div className="mt-3.5 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Your challenges
        </h2>
        <span className="text-[11px] text-muted">
          {done} of {rows.length}
        </span>
      </div>
      {next && (
        <p className="mt-1.5 text-[13px] font-medium text-text">Next up: {next.challenge.blurb}</p>
      )}

      {rows.length === 0 ? (
        <Empty>Log a session and your first challenge starts filling.</Empty>
      ) : (
        <Ladder rows={rows} nextKey={next?.challenge.key ?? null} />
      )}
    </div>
  );
}

/* ─────────────────────────────  house  ───────────────────────────── */

export function HouseChallenges({
  house,
  universityKey,
  residence,
}: {
  house: HouseStanding | null;
  universityKey: string;
  residence: string | null;
}) {
  const rows = house ? houseLadderProgress(house.counters) : [];
  const next = rows.find((r) => !r.done) ?? null;
  const done = rows.filter((r) => r.done).length;
  const colors = houseColorsFor(universityKey, residence);

  if (!residence) {
    return (
      <div className="px-3.5 py-3">
        <Empty>
          You haven&rsquo;t told us where you live yet, so there is no house to build. Add it from
          your profile and this fills in.
        </Empty>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-3">
      <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span
            className="h-11 w-1.5 flex-shrink-0 rounded-full bg-primary"
            style={colors ? { background: colors.primary } : undefined}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-text">
              {residenceLabel(residence)} · Level {house?.progress.level ?? 1}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted">
              {house
                ? `${house.xp.toLocaleString()} XP · ${house.counters.actives} of ${
                    house.counters.members
                  } training`
                : "Counting…"}
            </div>
          </div>
        </div>
        <Bar fraction={house?.progress.fraction ?? 0} tint={colors?.primary} />
        {house && (
          <div className="mt-2.5 rounded-xl border border-primary-line bg-primary-tint px-3 py-2 text-[11px] font-medium text-primary">
            {house.progress.toGo.toLocaleString()} XP to Level {house.progress.level + 1}
          </div>
        )}
      </div>

      <p className="mt-2.5 px-0.5 text-[11px] leading-relaxed text-muted">
        Every point anyone here earns counts for the house — so does every challenge they finish. A
        house needs {HOUSE_LEVEL_FACTOR}× one person&rsquo;s XP for the same level, and it is ranked
        on the TOTAL, not the average. A quiet house catches up by getting more people in, not by
        making the same three train harder.
      </p>

      <div className="mt-3.5 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          House challenges
        </h2>
        <span className="text-[11px] text-muted">
          {done} of {rows.length}
        </span>
      </div>
      {next && (
        <p className="mt-1.5 text-[13px] font-medium text-text">Next up: {next.challenge.blurb}</p>
      )}

      {rows.length === 0 ? (
        <Empty>Nothing counted here yet.</Empty>
      ) : (
        <Ladder rows={rows} nextKey={next?.challenge.key ?? null} />
      )}
    </div>
  );
}
