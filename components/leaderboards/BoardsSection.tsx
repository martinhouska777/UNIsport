"use client";

/*
  BOARDS — three of them, and one sentence explaining the reset.

    INDIVIDUAL   everyone, by sessions this semester
    HOUSES/DORMS your own kind, by sessions this semester
    LEVELS       everyone, by XP — all time, never resets

  THE RANKINGS RESET EVERY SEMESTER. That is the whole point of them: a table
  nobody can still win is a table nobody plays, and in January everybody starts
  level again. Levels are the opposite and never reset, which is why they are a
  separate board rather than another column.

  HOUSES OR DORMS, NOT BOTH. Which one you see is decided by where you live,
  which the app already knows from onboarding: freshmen are in Yard dorms,
  everybody else is in a house. Showing an upperclassman a dorm table they can
  never appear in is just clutter, and ranking a three-week-old freshman against
  a house of seniors tells nobody anything.

  Groups rank on their TOTAL, not their average — the same rule as house levels.
  A bigger house does have an advantage, and that is deliberate: the way a quiet
  house catches up is by getting more people logging.
*/
import { useEffect, useMemo, useState } from "react";
import { IconActivity } from "@/components/icons";
import { CampusStatsSheet } from "@/components/leaderboards/CampusStats";
import LevelAvatar from "@/components/ui/LevelAvatar";
import { Bar, Empty, Loading, RankBadge } from "@/components/leaderboards/pieces";
import { residenceKind, residenceLabel } from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import {
  fetchGroupBoard,
  fetchPeopleBoard,
  houseColor,
  type GroupRow,
  type LeaderRow,
} from "@/lib/leaderboards";
import { schoolShortName } from "@/lib/honorCode";
import type { CampusStats, HouseStanding, LeagueRow } from "@/lib/league";

type BoardKey = "individual" | "group" | "levels";

/* ─────────────────────────────  rows  ───────────────────────────── */

function PersonSessionRow({ row }: { row: LeaderRow }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
        row.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <RankBadge rank={row.rank} />
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[11px] font-semibold text-primary">
        {row.initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {row.name}
          {row.isMe && <span className="ml-1.5 text-[11px] text-primary">You</span>}
        </div>
        <div className="truncate text-[11px] text-muted">
          {[row.residence ? residenceLabel(row.residence) : "", row.classYear]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[15px] font-semibold text-text">{row.score}</div>
        <div className="text-[8px] uppercase tracking-[0.08em] text-muted">sessions</div>
      </div>
    </div>
  );
}

/** A house or dorm this semester, carrying its all-time level as context. */
function GroupSessionRow({
  row,
  rank,
  level,
}: {
  row: GroupRow;
  rank: number;
  level: number | null;
}) {
  const tint = houseColor(row.key);
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
        row.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <RankBadge rank={rank} />
      <span
        className="h-8 w-1.5 flex-shrink-0 rounded-full bg-primary"
        style={tint ? { background: tint } : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {residenceLabel(row.key)}
          {row.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
        </div>
        <div className="truncate text-[11px] text-muted">
          {row.actives} of {row.members} training
          {level ? ` · Level ${level}` : ""}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[15px] font-semibold text-text">{row.sessions.toLocaleString()}</div>
        <div className="text-[8px] uppercase tracking-[0.08em] text-muted">sessions</div>
      </div>
    </div>
  );
}

function PersonLevelRow({ row, universityKey }: { row: LeagueRow; universityKey: string }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        row.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <RankBadge rank={row.rank} />
        <LevelAvatar
          name={row.name}
          level={row.progress.level}
          size={32}
          badge
          colors={houseColorsFor(universityKey, row.residence)}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-text">
            {row.name}
            {row.isMe && <span className="ml-1.5 text-[11px] text-primary">You</span>}
          </div>
          <div className="truncate text-[11px] text-muted">
            {[row.residence ? residenceLabel(row.residence) : "", row.classYear]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[15px] font-semibold text-text">Lvl {row.progress.level}</div>
          <div className="text-[8px] uppercase tracking-[0.08em] text-muted">
            {row.xp.toLocaleString()} XP
          </div>
        </div>
      </div>
      <Bar fraction={row.progress.fraction} />
    </div>
  );
}

/* ─────────────────────────────  screen  ───────────────────────────── */

export default function BoardsSection({
  people,
  houses,
  stats,
  universityKey,
  userId,
  residence,
}: {
  people: LeagueRow[] | null;
  houses: HouseStanding[] | null;
  stats: CampusStats | null;
  universityKey: string;
  userId: string | null;
  residence: string | null;
}) {
  const [board, setBoard] = useState<BoardKey>("individual");
  const [showStats, setShowStats] = useState(false);

  // Freshmen live in Yard dorms, everybody else in a house. Somebody who never
  // answered gets the houses, which is the bigger and more useful table.
  const myKind = residence && residenceKind(residence) === "dorm" ? "dorm" : "house";
  const groupLabelText = myKind === "dorm" ? "Dorms" : "Houses";

  /*
    One piece of state holding the result AND which request produced it, so
    "loading" is DERIVED rather than switched on at the top of the effect — a
    synchronous setState in an effect body causes cascading renders.
  */
  const [result, setResult] = useState<{
    for: string;
    rows: LeaderRow[];
    groups: GroupRow[];
  } | null>(null);
  const want = `${board}|${userId ?? ""}`;

  useEffect(() => {
    if (board === "levels") return; // already loaded with the rest of the screen
    let active = true;
    const run =
      board === "individual"
        ? fetchPeopleBoard("campus", "semester", 50).then((rows) => ({
            for: want,
            rows,
            groups: [] as GroupRow[],
          }))
        : fetchGroupBoard("house", "semester", 1).then((groups) => ({
            for: want,
            rows: [] as LeaderRow[],
            groups,
          }));
    run
      // A failed read must still settle, or the board says "Counting…" forever.
      .then((r) => active && setResult(r))
      .catch(() => active && setResult({ for: want, rows: [], groups: [] }));
    return () => {
      active = false;
    };
  }, [board, want]);

  /*
    Only your own kind, ranked among themselves on total sessions. The rank has
    to be worked out after the split — Postgres ranked houses and dorms
    together, so keeping its numbers would leave gaps in both tables.
  */
  const myGroups = useMemo(() => {
    const rows = (result?.groups ?? []).filter((g) => residenceKind(g.key) === myKind);
    return [...rows].sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key));
  }, [result, myKind]);

  const levelOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of houses ?? []) map.set(h.key, h.progress.level);
    return map;
  }, [houses]);

  const BOARDS: { key: BoardKey; label: string; blurb: string; empty: string }[] = [
    {
      key: "individual",
      label: "Individual",
      blurb: "Everyone, by sessions logged this semester. A single day counts twice at most.",
      empty: "Nobody has logged a session this semester yet.",
    },
    {
      key: "group",
      label: groupLabelText,
      blurb: `${groupLabelText} by total sessions this semester. Size counts — that is how a quiet ${
        myKind === "dorm" ? "dorm" : "house"
      } catches up: more people logging.`,
      empty: `No ${myKind === "dorm" ? "dorm" : "house"} has logged anything this semester yet.`,
    },
    {
      key: "levels",
      label: "Levels",
      blurb: "Everyone by XP, all time. This is the one that never resets.",
      empty: "Nobody has earned any XP yet.",
    },
  ];

  const def = BOARDS.find((b) => b.key === board) ?? BOARDS[0];
  const loading = board === "levels" ? people === null : result?.for !== want;

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-stretch gap-1.5">
        <div className="flex min-w-0 flex-1 gap-1 rounded-xl border border-border bg-surface p-1">
          {BOARDS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBoard(b.key)}
              className={`tap44 min-w-0 flex-1 truncate rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                board === b.key ? "bg-text text-background" : "text-muted"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {/* Nobody opens an app to read aggregate statistics — but once you are
            looking at a leaderboard, "how is the whole place doing?" is the
            obvious next thought. A curiosity belongs behind an icon. */}
        <button
          type="button"
          onClick={() => setShowStats(true)}
          aria-label="Campus statistics"
          className="tap44 press-icon flex w-11 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted"
        >
          <IconActivity size={16} />
        </button>
      </div>

      {showStats && (
        <CampusStatsSheet
          stats={stats}
          schoolName={schoolShortName(universityKey)}
          onClose={() => setShowStats(false)}
        />
      )}

      <p className="mt-2.5 px-0.5 text-[11px] leading-relaxed text-muted">{def.blurb}</p>

      {loading ? (
        <Loading />
      ) : board === "levels" ? (
        (people ?? []).length === 0 ? (
          <Empty>{def.empty}</Empty>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {(people ?? []).slice(0, 50).map((r) => (
              <PersonLevelRow key={r.userId} row={r} universityKey={universityKey} />
            ))}
          </div>
        )
      ) : board === "individual" ? (
        (result?.rows ?? []).length === 0 ? (
          <Empty>{def.empty}</Empty>
        ) : (
          <div className="mt-2 flex flex-col gap-1.5">
            {(result?.rows ?? []).map((r) => (
              <PersonSessionRow key={r.userId} row={r} />
            ))}
          </div>
        )
      ) : myGroups.length === 0 ? (
        <Empty>{def.empty}</Empty>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {myGroups.map((g, i) => (
            <GroupSessionRow
              key={g.key}
              row={g}
              rank={i + 1}
              level={levelOf.get(g.key) ?? null}
            />
          ))}
        </div>
      )}

      <p className="mt-3 px-0.5 text-[11px] leading-relaxed text-muted">
        {board === "levels"
          ? "Levels and XP are all time. They never reset — there is always something being built."
          : "Rankings reset at the start of every semester, so everybody starts level again."}
      </p>
    </div>
  );
}
