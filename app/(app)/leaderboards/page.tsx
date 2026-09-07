"use client";

/*
  THE LEAGUE — statistics, challenges and the boards, in that order.
  ---------------------------------------------------------------------------
  The order is the argument. Your own numbers come first, because they are what
  you actually came to look at. Those numbers feed the CHALLENGES, the
  challenges pay the XP that decides your LEVEL, and the level is what ranks you
  on the BOARDS. Each section explains the one below it.

  TWO CLOCKS RUN HERE, on purpose:
    • Levels and challenges are ALL TIME and never reset. There is always
      something being built, even in a month you are losing.
    • The session boards reset monthly and each semester. That reset is what
      keeps them winnable — a table nobody can still win is a table nobody
      plays.

  Everything is real. db/league.sql and db/leaderboards.sql count actual logged
  sessions; there are no placeholder numbers anywhere on this screen, and a
  board with nothing in it says so.

  Colors are theme tokens (rule 1). The only per-item colors are each house's
  identity color, which lives in lib/gyms.ts as DATA and is applied inline —
  the same exception the gym and lineup screens use.
*/
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import { IconTrophy } from "@/components/icons";
import LevelAvatar from "@/components/ui/LevelAvatar";
import HonorCode, { HonorCodeFooter, useHonorCode } from "@/components/leaderboards/HonorCode";
import { residenceLabel } from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import { sessionXp, PARTNER_MULTIPLIER, NEW_PARTNER_MULTIPLIER, multiplierLabel } from "@/lib/xp";
import { ladderProgress, type ChallengeProgress } from "@/lib/challenges";
import {
  fetchLeagueBoard,
  fetchMyLeague,
  toNextLevelLine,
  type LeagueRow,
} from "@/lib/league";
import {
  fetchGroupBoard,
  fetchPeopleBoard,
  groupLabel,
  houseColor,
  MIN_GROUP_MEMBERS,
  type GroupRow,
  type LeaderRow,
  type Period,
} from "@/lib/leaderboards";

/* ─────────────────────────  the boards, as data  ───────────────────────── */

type BoardKey = "levels" | "houses" | "myHouse" | "campus" | "partners" | "years";

type BoardDef = {
  key: BoardKey;
  pill: string;
  title: string;
  blurb: string;
  empty: string;
};

const BOARDS: BoardDef[] = [
  {
    key: "levels",
    pill: "Levels",
    title: "By level",
    blurb: "Everyone, by XP earned all time. This one never resets.",
    empty: "Nobody has earned any XP yet.",
  },
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

/* ─────────────────────────  small pieces  ───────────────────────── */

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

/** A bar that fills. Used by both the level card and every challenge row. */
function Bar({ fraction, tint }: { fraction: number; tint?: string | null }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`,
          ...(tint ? { background: tint } : {}),
        }}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-center">
      <div className="text-[17px] font-medium leading-none text-text">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.07em] text-muted">{label}</div>
    </div>
  );
}

function ChallengeRow({ p, highlight }: { p: ChallengeProgress; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        highlight ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`truncate text-[13px] font-medium ${
            p.done ? "text-muted line-through" : "text-text"
          }`}
        >
          {p.challenge.title}
        </span>
        <span className="flex-shrink-0 text-[11px] font-semibold text-muted">
          {p.done ? "Done" : `${p.have} / ${p.target}`}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] text-muted">{p.challenge.blurb}</span>
        <span className="flex-shrink-0 text-[11px] text-primary">+{p.challenge.xp} XP</span>
      </div>
      {!p.done && <Bar fraction={p.fraction} />}
    </div>
  );
}

function LevelRow({ row, universityKey }: { row: LeagueRow; universityKey: string }) {
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

export default function LeaguePage() {
  const { userId, universityKey } = useAppState();
  const { accepted, accept } = useHonorCode(userId);

  const [period, setPeriod] = useState<Period>("month");
  const [board, setBoard] = useState<BoardKey>("levels");
  const [showAll, setShowAll] = useState(false);

  const [me, setMe] = useState<LeagueRow | null>(null);
  const [levels, setLevels] = useState<LeagueRow[] | null>(null);

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
  const def = useMemo(() => BOARDS.find((b) => b.key === board) ?? BOARDS[0], [board]);

  // Your own row and the level board are all-time, so neither reloads with the
  // period toggle — the pills must not make the header flicker.
  useEffect(() => {
    let active = true;
    fetchMyLeague(universityKey).then((r) => active && setMe(r));
    fetchLeagueBoard(universityKey).then((rows) => active && setLevels(rows));
    return () => {
      active = false;
    };
  }, [universityKey, userId]);

  useEffect(() => {
    if (board === "levels") return; // served by the effect above
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
      // A failed read must still settle, or the board says "Counting…" forever.
      .then((r) => active && setResult(r))
      .catch(() => active && setResult({ for: want, people: [], groups: [] }));
    return () => {
      active = false;
    };
  }, [board, period, want]);

  const ladder = useMemo(
    () => (me ? ladderProgress(me.counters, universityKey) : []),
    [me, universityKey],
  );
  const next = ladder.find((p) => !p.done) ?? null;
  const doneCount = ladder.filter((p) => p.done).length;
  const myColors = houseColorsFor(universityKey, me?.residence);
  const myRank = levels?.find((r) => r.isMe)?.rank ?? null;

  // Hooks are all above this line, so the honour code can gate the screen.
  if (accepted === false) {
    return <HonorCode universityKey={universityKey} onAgree={accept} />;
  }

  const loading = result?.for !== want;
  const people = result?.people ?? [];
  const groups = result?.groups ?? [];
  const isGroupBoard = board === "houses" || board === "years";
  const shownLadder = showAll ? ladder : ladder.slice(0, Math.max(4, doneCount + 3));

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b border-border bg-surface px-3 py-3">
        <span className="text-sm font-medium text-text">League</span>
      </div>

      {/* ── 1. Your level ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <LevelAvatar
              name={me?.name ?? ""}
              level={me?.progress.level ?? 1}
              size={44}
              colors={myColors}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-text">
                Level {me?.progress.level ?? 1}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {me
                  ? `${me.xp.toLocaleString()} XP${
                      myRank ? ` · ${ordinal(myRank)} on campus` : ""
                    }`
                  : "Counting…"}
              </div>
            </div>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent">
              <IconTrophy size={16} />
            </span>
          </div>

          <Bar fraction={me?.progress.fraction ?? 0} tint={myColors?.primary} />

          {/* The single most useful line on the screen. */}
          {me && (
            <div className="mt-2.5 rounded-xl border border-primary-line bg-primary-tint px-3 py-2 text-[11px] font-medium text-primary">
              {toNextLevelLine(me.progress)}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Statistics ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-3.5 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Your statistics
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Stat value={`${me?.counters.sessions ?? 0}`} label="Sessions" />
          <Stat value={`${me?.counters.partners ?? 0}`} label="Partners" />
          <Stat value={`${me?.counters.gyms ?? 0}`} label="Gyms" />
          <Stat value={`${me?.counters.weeks3 ?? 0}`} label="Good weeks" />
          <Stat value={`${me?.counters.km ?? 0}`} label="Km" />
          <Stat value={`${doneCount}`} label="Challenges" />
        </div>
        <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-muted">
          A session is worth {sessionXp.solo} XP. Training with someone is{" "}
          {multiplierLabel(PARTNER_MULTIPLIER)} that, and with someone you have never trained
          with before it is {multiplierLabel(NEW_PARTNER_MULTIPLIER)}.
        </p>
      </div>

      {/* ── 3. Challenges ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Challenges
          </h2>
          <span className="text-[11px] text-muted">
            {doneCount} of {ladder.length} done
          </span>
        </div>

        {next && (
          <p className="mt-1.5 text-[13px] font-medium text-text">
            Next up: {next.challenge.blurb}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1.5">
          {shownLadder.map((p) => (
            <ChallengeRow
              key={p.challenge.key}
              p={p}
              highlight={next?.challenge.key === p.challenge.key}
            />
          ))}
        </div>

        {ladder.length > shownLadder.length && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="tap44 mt-2 w-full text-center text-[12px] font-medium text-primary"
          >
            Show all {ladder.length} challenges
          </button>
        )}
      </div>

      {/* ── 4. The boards ─────────────────────────────────────────────── */}
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

      {/* The period toggle belongs to the boards that RESET. Levels are all-time
          and showing a toggle that does nothing would be a lie. */}
      {board !== "levels" && (
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
      )}

      <div className="px-3.5 pt-3">
        <h2 className="text-[15px] font-semibold text-text">{def.title}</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{def.blurb}</p>

        {board === "levels" ? (
          levels === null ? (
            <div className="px-4 py-16 text-center text-[12px] text-muted">Counting…</div>
          ) : levels.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
              {def.empty}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-1.5">
              {levels.slice(0, 50).map((r) => (
                <LevelRow key={r.userId} row={r} universityKey={universityKey} />
              ))}
            </div>
          )
        ) : loading ? (
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
          <div className="mt-3 flex flex-col gap-1.5">
            {people.map((r) => (
              <PersonRow key={r.userId} row={r} showHouse={board !== "myHouse"} />
            ))}
          </div>
        )}
      </div>

      {/* How it works — said once, plainly, so nobody has to guess. */}
      <div className="mt-4 px-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How it works
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted">
            <li>Every session earns XP. A single day counts twice at most.</li>
            <li>Finishing a challenge pays XP too, and each level costs more than the last.</li>
            <li>Levels and challenges are all-time and never reset.</li>
            <li>The session boards reset monthly and each semester, so everyone starts level.</li>
            <li>Only your name, house, year and totals are ever shown — never your workouts.</li>
          </ul>
        </div>
      </div>

      <div className="mt-3 px-3.5">
        <HonorCodeFooter universityKey={universityKey} />
      </div>
    </div>
  );
}
