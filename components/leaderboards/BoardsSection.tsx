"use client";

/*
  LEADERBOARDS — two clocks, kept visibly apart.

    ALL TIME    people, houses, dorms and years by LEVEL. Never resets, so it
                is the long story of who has actually built something.
    THIS MONTH  the session boards, which DO reset. That reset is the point: a
                table nobody can still win is a table nobody plays.

  Putting them behind one switch rather than in one long row of pills is the
  whole reason this screen is readable. Seven pills side by side, half of which
  quietly ignore the period toggle above them, is a screen that lies.

  Houses and Yard dorms are ranked SEPARATELY. Freshmen have been on campus
  three weeks; measuring them against a house of seniors tells nobody anything.
*/
import { useEffect, useMemo, useState } from "react";
import LevelAvatar from "@/components/ui/LevelAvatar";
import { Bar, Empty, Loading, RankBadge, Segmented } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import {
  fetchPeopleBoard,
  groupLabel,
  houseColor,
  type LeaderRow,
  type Period,
} from "@/lib/leaderboards";
import { rankHouses, type HouseStanding, type LeagueRow } from "@/lib/league";

type Clock = "level" | "month";
type LevelBoard = "people" | "houses" | "dorms" | "years";
type MonthBoard = "campus" | "myHouse" | "partners";

const LEVEL_BOARDS: { key: LevelBoard; label: string; blurb: string; empty: string }[] = [
  {
    key: "people",
    label: "People",
    blurb: "Everyone, by XP earned all time.",
    empty: "Nobody has earned any XP yet.",
  },
  {
    key: "houses",
    label: "Houses",
    blurb: "The twelve houses, by total XP. Size counts — that is deliberate.",
    empty: "No house has anyone training yet.",
  },
  {
    key: "dorms",
    label: "Dorms",
    blurb: "The Yard dorms, ranked among themselves rather than against the houses.",
    empty: "No dorm has anyone training yet.",
  },
  {
    key: "years",
    label: "Years",
    blurb: "Class against class, by total XP.",
    empty: "No class year has anyone training yet.",
  },
];

const MONTH_BOARDS: { key: MonthBoard; label: string; blurb: string; empty: string }[] = [
  {
    key: "campus",
    label: "Campus",
    blurb: "Everyone, by sessions logged. A single day counts twice at most.",
    empty: "Nobody has logged a session yet.",
  },
  {
    key: "myHouse",
    label: "My house",
    blurb: "You against the people you live with.",
    empty: "Nobody in your house has logged a session yet.",
  },
  {
    key: "partners",
    label: "Partners",
    blurb: "How many different people you trained with. Training alone doesn't count here.",
    empty: "Nobody has logged a session with a partner yet.",
  },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "semester", label: "This semester" },
  { key: "all", label: "All time" },
];

/* ─────────────────────────────  rows  ───────────────────────────── */

function PersonLevelRow({ row, universityKey }: { row: LeagueRow; universityKey: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
        row.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
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
        <div className="text-[15px] font-semibold text-text">{row.xp.toLocaleString()}</div>
        <div className="text-[8px] uppercase tracking-[0.08em] text-muted">XP</div>
      </div>
    </div>
  );
}

function GroupLevelRow({ row, isYear }: { row: HouseStanding; isYear: boolean }) {
  const tint = isYear ? null : houseColor(row.key);
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        row.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <RankBadge rank={row.rank} />
        <span
          className="h-8 w-1.5 flex-shrink-0 rounded-full bg-primary"
          style={tint ? { background: tint } : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-text">
            {isYear ? groupLabel("year", row.key) : residenceLabel(row.key)}
            {row.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
          </div>
          <div className="truncate text-[11px] text-muted">
            {row.counters.actives} of {row.counters.members} training ·{" "}
            {row.counters.sessions.toLocaleString()} sessions
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-[15px] font-semibold text-text">Lvl {row.progress.level}</div>
          <div className="text-[8px] uppercase tracking-[0.08em] text-muted">
            {row.xp.toLocaleString()} XP
          </div>
        </div>
      </div>
      <Bar fraction={row.progress.fraction} tint={tint} />
    </div>
  );
}

function PersonSessionRow({ row, showHouse }: { row: LeaderRow; showHouse: boolean }) {
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
          {[showHouse && row.residence ? residenceLabel(row.residence) : "", row.classYear]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>
      <span className="flex-shrink-0 text-[15px] font-semibold text-text">{row.score}</span>
    </div>
  );
}

/* ─────────────────────────────  screen  ───────────────────────────── */

export default function BoardsSection({
  people,
  houses,
  years,
  universityKey,
  userId,
}: {
  people: LeagueRow[] | null;
  houses: HouseStanding[] | null;
  years: HouseStanding[] | null;
  universityKey: string;
  userId: string | null;
}) {
  const [clock, setClock] = useState<Clock>("level");
  const [levelBoard, setLevelBoard] = useState<LevelBoard>("people");
  const [monthBoard, setMonthBoard] = useState<MonthBoard>("campus");
  const [period, setPeriod] = useState<Period>("month");

  /*
    One piece of state holding the result AND which request produced it, so
    "loading" is DERIVED rather than switched on at the top of the effect — a
    synchronous setState in an effect body causes cascading renders.
  */
  const [result, setResult] = useState<{ for: string; rows: LeaderRow[] } | null>(null);
  const want = `${monthBoard}|${period}|${userId ?? ""}`;

  useEffect(() => {
    if (clock !== "month") return;
    let active = true;
    fetchPeopleBoard(
      monthBoard === "myHouse" ? "house" : monthBoard === "partners" ? "partners" : "campus",
      period,
      50,
    )
      .then((rows) => active && setResult({ for: want, rows }))
      // A failed read must still settle, or the board says "Counting…" forever.
      .catch(() => active && setResult({ for: want, rows: [] }));
    return () => {
      active = false;
    };
  }, [clock, monthBoard, period, want]);

  // Houses and dorms come from one list, split and then re-ranked among
  // themselves — the rank has to be worked out after the split, not before it.
  const splitHouses = useMemo(
    () => (houses ? rankHouses(houses.filter((h) => h.kind === "house")) : null),
    [houses],
  );
  const splitDorms = useMemo(
    () => (houses ? rankHouses(houses.filter((h) => h.kind !== "house")) : null),
    [houses],
  );

  const levelDef = LEVEL_BOARDS.find((b) => b.key === levelBoard) ?? LEVEL_BOARDS[0];
  const monthDef = MONTH_BOARDS.find((b) => b.key === monthBoard) ?? MONTH_BOARDS[0];
  const groupRows =
    levelBoard === "houses" ? splitHouses : levelBoard === "dorms" ? splitDorms : years;

  return (
    <div className="px-3.5 py-3">
      <Segmented
        value={clock}
        onChange={setClock}
        options={[
          { key: "level", label: "All time · levels" },
          { key: "month", label: "This month · sessions" },
        ]}
      />

      {clock === "level" ? (
        <>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {LEVEL_BOARDS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setLevelBoard(b.key)}
                className={`tap44 flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  levelBoard === b.key
                    ? "border-text bg-text text-background"
                    : "border-border bg-surface text-muted"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <p className="mt-2.5 px-0.5 text-[11px] leading-relaxed text-muted">{levelDef.blurb}</p>

          {levelBoard === "people" ? (
            people === null ? (
              <Loading />
            ) : people.length === 0 ? (
              <Empty>{levelDef.empty}</Empty>
            ) : (
              <div className="mt-2 flex flex-col gap-1.5">
                {people.slice(0, 50).map((r) => (
                  <PersonLevelRow key={r.userId} row={r} universityKey={universityKey} />
                ))}
              </div>
            )
          ) : groupRows === null ? (
            <Loading />
          ) : groupRows.length === 0 ? (
            <Empty>{levelDef.empty}</Empty>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {groupRows.map((r) => (
                <GroupLevelRow key={r.key} row={r} isYear={levelBoard === "years"} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MONTH_BOARDS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setMonthBoard(b.key)}
                className={`tap44 flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  monthBoard === b.key
                    ? "border-text bg-text text-background"
                    : "border-border bg-surface text-muted"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex gap-1 rounded-xl border border-border bg-surface p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
                  period === p.key ? "bg-text text-background" : "text-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="mt-2.5 px-0.5 text-[11px] leading-relaxed text-muted">{monthDef.blurb}</p>

          {result?.for !== want ? (
            <Loading />
          ) : result.rows.length === 0 ? (
            <Empty>{monthDef.empty}</Empty>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {result.rows.map((r) => (
                <PersonSessionRow key={r.userId} row={r} showHouse={monthBoard !== "myHouse"} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
