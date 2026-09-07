"use client";

/*
  LEADERBOARDS — the full boards, reached from the strip on the Profile tab.
  ---------------------------------------------------------------------------
  Five boards behind one row of pills:
    • Houses   — house vs house, ranked by sessions PER MEMBER
    • My house — you against your own housemates
    • Campus   — everyone
    • Partners — who trained with the most DIFFERENT people
    • Years    — class year vs class year, also per member

  Everything is real: db/leaderboards.sql counts actual logged sessions. There
  are no placeholder numbers anywhere on this screen — a board with nothing in
  it says so.

  Boards reset monthly / each semester (the period toggle). That reset is the
  point: everybody starts level again, so the table is always still winnable —
  the month is the short race, the semester the long one.

  Colors are theme tokens (rule 1). The only per-item colors are each house's
  identity color, which lives in lib/gyms.ts as DATA and is applied inline —
  the same exception the gym and lineup screens use.
*/
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { IconArrowLeft, IconTrophy, IconChevronRight } from "@/components/icons";
import { residenceLabel } from "@/lib/onboarding";
import {
  fetchGroupBoard,
  fetchPeopleBoard,
  fetchStanding,
  groupLabel,
  houseColor,
  nextUpLine,
  scoreLabel,
  MIN_GROUP_MEMBERS,
  type GroupRow,
  type LeaderRow,
  type Period,
  type Standing,
} from "@/lib/leaderboards";

/* ─────────────────────────  the boards, as data  ───────────────────────── */

type BoardKey = "houses" | "myHouse" | "campus" | "partners" | "years";

type BoardDef = {
  key: BoardKey;
  pill: string;
  title: string;
  blurb: string;
  empty: string;
};

const BOARDS: BoardDef[] = [
  {
    key: "houses",
    pill: "Houses",
    title: "House vs house",
    blurb: `Sessions per member, so a big house can't win on size alone. A house needs ${MIN_GROUP_MEMBERS} members to appear.`,
    empty: "No house has enough members training yet.",
  },
  {
    key: "myHouse",
    pill: "My house",
    title: "Your house",
    blurb: "You against the people you live with.",
    empty: "Nobody in your house has logged a session yet.",
  },
  {
    key: "campus",
    pill: "Campus",
    title: "Campus",
    blurb: "Everyone, by sessions logged.",
    empty: "Nobody has logged a session yet.",
  },
  {
    key: "partners",
    pill: "Partners",
    title: "Most partners",
    blurb: "How many different people you trained with. Training alone doesn't count here.",
    empty: "Nobody has logged a session with a partner yet.",
  },
  {
    key: "years",
    pill: "Years",
    title: "Year vs year",
    blurb: `Class against class, also per member. A year needs ${MIN_GROUP_MEMBERS} members to appear.`,
    empty: "No class year has enough members training yet.",
  },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "semester", label: "This semester" },
  { key: "all", label: "All time" },
];

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/* ─────────────────────────  rows  ───────────────────────── */

/* The top three are marked with the theme's accent rather than gold/silver/
   bronze: medal colors would be three hardcoded hexes in a component, which is
   the one thing this codebase never does. */
function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
        top ? "bg-accent-tint text-accent" : "text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

function PersonRow({ row, showHouse }: { row: LeaderRow; showHouse: boolean }) {
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

function GroupRowItem({ row, kind }: { row: GroupRow; kind: "house" | "year" }) {
  const tint = kind === "house" ? houseColor(row.key) : null;
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
        row.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <RankBadge rank={row.rank} />
      <span
        className="h-8 w-1.5 flex-shrink-0 rounded-full bg-primary"
        style={tint ? { background: tint } : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {groupLabel(kind, row.key)}
          {row.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
        </div>
        <div className="truncate text-[11px] text-muted">
          {row.actives} of {row.members} training · {row.sessions} sessions
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[15px] font-semibold text-text">{row.avgSessions.toFixed(1)}</div>
        <div className="text-[8px] uppercase tracking-[0.08em] text-muted">per member</div>
      </div>
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */

export default function LeaderboardsPage() {
  const router = useRouter();
  const { userId } = useAppState();
  const [period, setPeriod] = useState<Period>("month");
  const [board, setBoard] = useState<BoardKey>("houses");

  const [standing, setStanding] = useState<Standing | null>(null);
  /*
    One piece of state holding the result AND which request produced it. Loading
    is then DERIVED — `result.for !== want` — instead of being switched on at the
    top of the effect, which would be a synchronous setState inside an effect
    (cascading renders, and React's lint rule rightly flags it).
  */
  const [result, setResult] = useState<{
    for: string;
    people: LeaderRow[];
    groups: GroupRow[];
  } | null>(null);

  const want = `${board}|${period}|${userId ?? ""}`;
  const loading = result?.for !== want;
  const people = result?.people ?? [];
  const groups = result?.groups ?? [];

  const def = useMemo(() => BOARDS.find((b) => b.key === board) ?? BOARDS[0], [board]);

  // The standing line reloads with the period, not with the board — the board
  // pills shouldn't make the header flicker.
  useEffect(() => {
    let active = true;
    fetchStanding(period).then((s) => active && setStanding(s));
    return () => {
      active = false;
    };
  }, [period, userId]);

  useEffect(() => {
    let active = true;
    const isGroup = board === "houses" || board === "years";
    const run = isGroup
      ? fetchGroupBoard(board === "houses" ? "house" : "year", period).then((rows) => ({
          for: want,
          people: [] as LeaderRow[],
          groups: rows,
        }))
      : fetchPeopleBoard(
          board === "myHouse" ? "house" : board === "partners" ? "partners" : "campus",
          period,
          50,
        ).then((rows) => ({ for: want, people: rows, groups: [] as GroupRow[] }));
    run
      .then((r) => active && setResult(r))
      // A failed read must still settle, or the board says "Counting…" forever.
      .catch(() => active && setResult({ for: want, people: [], groups: [] }));
    return () => {
      active = false;
    };
  }, [board, period, want]);

  const isGroupBoard = board === "houses" || board === "years";
  const nudge = nextUpLine(standing);

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-3">
        <button type="button" aria-label="Back" onClick={() => router.back()} className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-text">Leaderboards</span>
        <span className="w-[18px]" aria-hidden="true" />
      </div>

      {/* Your standing */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent">
              <IconTrophy size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text">
                {standing?.campusRank
                  ? `${ordinal(standing.campusRank)} of ${standing.campusTotal} on campus`
                  : "Not on the board yet"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {standing && standing.sessions > 0
                  ? `${standing.sessions} session${standing.sessions === 1 ? "" : "s"} ${
                      period === "all" ? "logged" : PERIODS.find((p) => p.key === period)?.label.toLowerCase()
                    }`
                  : "Log a session and you're on it."}
              </div>
            </div>
          </div>

          {/* The single most useful line on the screen. */}
          {nudge && (
            <div className="mt-2.5 rounded-xl border border-primary-line bg-primary-tint px-3 py-2 text-[11px] font-medium text-primary">
              {nudge}
            </div>
          )}

          {standing?.residence && (
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <div className="text-[13px] font-semibold text-text">
                  {standing.houseRankIn ? ordinal(standing.houseRankIn) : "—"}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted">
                  in {residenceLabel(standing.residence)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <div className="text-[13px] font-semibold text-text">
                  {standing.houseRank ? `#${standing.houseRank} of ${standing.houseTotal}` : "—"}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted">
                  {residenceLabel(standing.residence)} overall
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Period */}
      <div className="border-b border-border px-3.5 py-2.5">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
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
      </div>

      {/* Board pills — five of them, so they scroll sideways on a phone */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border px-3.5 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBoard(b.key)}
            className={`tap44 flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              board === b.key
                ? "border-text bg-text text-background"
                : "border-border bg-surface text-muted"
            }`}
          >
            {b.pill}
          </button>
        ))}
      </div>

      {/* The board */}
      <div className="px-3.5 pt-3">
        <h2 className="text-[15px] font-semibold text-text">{def.title}</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{def.blurb}</p>

        {loading ? (
          <div className="px-4 py-16 text-center text-[12px] text-muted">Counting…</div>
        ) : isGroupBoard ? (
          groups.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
              {def.empty}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {groups.map((g) => (
                <GroupRowItem key={g.key} row={g} kind={board === "houses" ? "house" : "year"} />
              ))}
            </div>
          )
        ) : people.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
            {def.empty}
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-1.5">
              {people.map((r) => (
                <PersonRow key={r.userId} row={r} showHouse={board !== "myHouse"} />
              ))}
            </div>
            <div className="mt-2.5 px-0.5 text-[11px] text-muted">
              {board === "partners"
                ? scoreLabel("partners", people[0].score) + " leads"
                : `Top ${people.length}`}
            </div>
          </>
        )}
      </div>

      {/* How scoring works — said once, plainly, so nobody has to guess. */}
      <div className="mt-4 px-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How it works
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted">
            <li>One logged session = one point. A single day counts twice at most.</li>
            <li>Team boards rank by sessions per member, not by total.</li>
            <li>Monthly and semester boards reset, so everyone starts level again.</li>
            <li>Only your name, house, year and totals are ever shown — never your workouts.</li>
          </ul>
        </div>
      </div>

      {/* Straight back to the tab you came from. */}
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-4 flex w-full items-center justify-center gap-1 px-3.5 text-[12px] font-medium text-primary"
      >
        Back to your profile
        <IconChevronRight size={13} />
      </button>
    </div>
  );
}
