"use client";

/*
  LEADERBOARDS — reached from the strip on the Profile tab.
  ---------------------------------------------------------------------------
  TWO CONTROLS, NOT EIGHT. This screen used to carry three period buttons and
  five board pills in two stacked rows — eleven tap targets before a single
  name. Now there are two dropdowns that SAY what they are showing
  ("Competition: Houses", "Period: This month"), which is how every app people
  already use handles the same job. The list of competitions can grow without
  the screen growing.

  THE PODIUM. Every board opens with its top three standing on gold, silver and
  bronze pedestals (components/leaderboards/Podium.tsx) and the list carries on
  underneath from fourth, so nobody appears twice. A leaderboard whose first
  place looks exactly like its eleventh is a table, not a competition.

  TWO WAYS TO READ A TEAM BOARD. Houses, dorms and years each rank two honest
  ways, and the segmented control above the board says which one is on screen:
  POINTS PER MEMBER (a big house can't win on size alone — it measures whether
  a house is actually using the app) or TOTAL POINTS (the raw pile it put on
  the board, which is the number people shout about). Both come back in the
  same read, so switching is instant.

  THE COMPETITIONS
    • Houses      — the twelve upperclassman Houses, per member or by total
    • Dorms       — the first-year Yard dorms, same way, kept separate because
                    a dorm of four freshmen has no business being ranked
                    against a house of four hundred
    • Everyone    — the whole campus
    • Most partners — who trained with the most DIFFERENT people
    • Years       — class year vs class year, also per member

  Houses opens first, on purpose. Everyone is an anonymous list of names; house
  vs house is the thing people already argue about at dinner, and it is the
  only board with a chance of making somebody drag a friend in.

  A HOUSE OR DORM OPENS. Its score is nothing but the points of the people
  living in it, so tapping the row shows exactly who earned them and what share
  each of them is (GroupSheet). There is no separate "my house" competition —
  your own house is one of the rows, and opening it answers the same question
  without a second entry in the list. Year rows do not open: a class year is
  not somewhere you live, and nobody is going to scroll four hundred people.

  THREE PERIODS. Month, semester, all time. The month is the short race, the
  semester the long one, all time the record that never resets. (Worth knowing
  when reading the screen in the first days of a term: until October, "this
  semester" and "this month" are the same window and will show the same
  numbers. That is honest, not a bug.)

  SCORED IN POINTS. A session alone is 10, with a partner 15, with somebody new
  25 — the rates live in lib/points.ts as data. Every row still says how many
  sessions it took, because a score nobody can check is a score nobody trusts.
  The full rules sit behind the ⓘ in the header.

  Everything is real: db/leaderboards.sql counts actual logged sessions. There
  are no placeholder numbers anywhere on this screen — a board with nothing in
  it says so.

  Colors are theme tokens (rule 1). The only per-item colors are each house's
  identity color, which lives in lib/gyms.ts as DATA and is applied inline —
  the same exception the gym and lineup screens use.
*/
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronRight,
  IconInfo,
  IconTrophy,
  IconUser,
  HouseShield,
} from "@/components/icons";
import HonorCode, { HonorCodeFooter, useHonorCode } from "@/components/leaderboards/HonorCode";
import GroupSheet from "@/components/leaderboards/GroupSheet";
import HouseRace from "@/components/leaderboards/HouseRace";
import Podium, { type PodiumEntry } from "@/components/leaderboards/Podium";
import Medal from "@/components/leaderboards/Medal";
import ScoringSheet from "@/components/leaderboards/ScoringSheet";
import OptionPickerSheet from "@/components/profile/OptionPickerSheet";
import { houses, residenceLabel, yardDorms } from "@/lib/onboarding";
import { pointsLabel, sessionsOf } from "@/lib/points";
import {
  fetchGroupBoard,
  fetchPeopleBoard,
  fetchStanding,
  groupLabel,
  groupScoreLabel,
  houseColor,
  nextUpLine,
  rankGroups,
  houseCrest,
  nobodyYet,
  GROUP_METRICS,
  type GroupMetric,
  type GroupRow,
  type LeaderRow,
  type Period,
  type Standing,
} from "@/lib/leaderboards";

/* ──────────────────  the competitions, as data  ────────────────── */

type CompetitionKey = "houses" | "dorms" | "everyone" | "partners" | "years";

type Competition = {
  key: CompetitionKey;
  label: string;
  /** One line in the picker, saying what the board actually measures. */
  note: string;
  /** The same thing said under the bar, once it is the board on screen. */
  blurb: string;
  empty: string;
};

const COMPETITIONS: Competition[] = [
  {
    key: "houses",
    label: "Houses",
    note: "House vs house",
    blurb: "House against house — all twelve, always. A house nobody has joined yet reads “nobody yet”.",
    empty: "No houses to show.",
  },
  {
    key: "dorms",
    label: "Dorms",
    note: "First-year Yard dorms",
    blurb: "The first-year dorms, kept apart from the Houses. Every dorm is on the board.",
    empty: "No dorms to show.",
  },
  {
    key: "everyone",
    label: "Everyone",
    note: "The whole campus, by points",
    blurb: "Everyone on campus, by points earned.",
    empty: "Nobody has logged a session yet.",
  },
  {
    key: "partners",
    label: "Most partners",
    note: "Who trained with the most people",
    blurb: "How many different people you trained with. Training alone doesn't count here.",
    empty: "Nobody has logged a session with a partner yet.",
  },
  {
    key: "years",
    label: "Years",
    note: "Class year vs class year",
    blurb: "Class against class. Every year is on the board.",
    empty: "No class years to show.",
  },
];

/* What the metric switch means, said in one line under the bar. */
const METRIC_BLURB: Record<GroupMetric, string> = {
  perMember:
    "Ranked by points per member, so size alone can't win it — it says how many of you are actually training.",
  total: "Ranked by every point the group put on the board, so the bigger ones have the advantage.",
};

const PERIODS: { key: Period; label: string; note: string }[] = [
  { key: "month", label: "This month", note: "Resets on the 1st" },
  { key: "semester", label: "This semester", note: "Resets each term" },
  { key: "all", label: "All time", note: "Never resets — the record" },
];

const GROUP_BOARDS: CompetitionKey[] = ["houses", "dorms", "years"];

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/* ─────────────────────────  pieces  ───────────────────────── */

/* The top three wear an actual medal (components/leaderboards/Medal.tsx) rather
   than a number in a gold square. Everything below third gets a quiet tile, so
   a rank still reads as a rank without pretending to be a prize. This is what
   the member list inside a house uses; the three at the top of a board itself
   are lifted out onto the podium. */
function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <Medal place={rank as 1 | 2 | 3} rank={rank} size={28} />;
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-semibold text-muted">
      {rank}
    </span>
  );
}

/* The one control that changes what a team board MEANS, so it sits above the
   board itself rather than inside a sheet: two words, both always visible. */
function MetricSwitch({
  value,
  onPick,
}: {
  value: GroupMetric;
  onPick: (m: GroupMetric) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full border border-border bg-surface-2 p-0.5">
      {GROUP_METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onPick(m.key)}
          aria-pressed={value === m.key}
          aria-label={m.label}
          className={`tap44 flex-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
            value === m.key ? "bg-text text-background" : "text-muted"
          }`}
        >
          {m.short}
        </button>
      ))}
    </div>
  );
}

/* A score with its unit under it, so a bare number never has to be guessed at. */
function Score({ value, unit }: { value: string; unit?: string }) {
  return (
    <div className="flex-shrink-0 text-right">
      <div className="text-[15px] font-semibold leading-none text-text">{value}</div>
      {unit && (
        <div className="mt-1 text-[8px] uppercase tracking-[0.08em] text-muted">{unit}</div>
      )}
    </div>
  );
}

/* One of the two dropdowns. It names the choice above the value, so the bar
   explains itself instead of being two mystery words with chevrons. */
function Picker({
  caption,
  value,
  onOpen,
}: {
  caption: string;
  value: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap44 flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] uppercase tracking-[0.1em] text-muted">{caption}</span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-text">{value}</span>
      </span>
      <span className="flex-shrink-0 text-muted">
        <IconChevronDown size={15} />
      </span>
    </button>
  );
}

function PersonRow({
  row,
  competition,
  onOpen,
}: {
  row: LeaderRow;
  competition: CompetitionKey;
  /** Opens this person's profile — their bio, interests and training. */
  onOpen: () => void;
}) {
  const sessions = sessionsOf(row.kinds);
  const tint = houseColor(row.residence);
  // House, year and what the score was made of, in one line that survives a
  // narrow phone by simply dropping the parts that are missing.
  const detail =
    [
      row.residence ? residenceLabel(row.residence) : "",
      row.classYear ?? "",
      sessions > 0 ? plural(sessions, "session") : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    /* A NAME ON A BOARD IS A PERSON — tapping one opens their profile, which is
       where the bio, the interests and the training actually are (owner,
       2026-09-06: "make so you can click their profile and see the bio and
       interests etc"). Your own row goes to your own tab instead. */
    <button
      type="button"
      onClick={onOpen}
      className={`tap44 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left active:bg-surface-2 ${
        row.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <RankBadge rank={row.rank} />
      <span
        /* NO INITIALS (owner, same day). The tile stays, because it is what
           carries their house's colour down a list of fifty names — content
           data from lib/gyms.ts, applied inline — but what sits in it is a
           plain figure, and the name beside it does the naming. */
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary"
        style={tint ? { background: `${tint}26`, color: tint } : undefined}
      >
        <IconUser size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {row.name}
          {row.isMe && <span className="ml-1.5 text-[11px] text-primary">You</span>}
        </div>
        <div className="truncate text-[11px] text-muted">{detail}</div>
      </div>
      {competition === "partners" ? (
        <Score value={String(row.score)} unit="people" />
      ) : (
        <Score value={row.score.toLocaleString("en-US")} unit="pts" />
      )}
    </button>
  );
}

function GroupRowItem({
  row,
  kind,
  metric,
  onOpen,
}: {
  row: GroupRow;
  kind: "house" | "year";
  metric: GroupMetric;
  /** Omitted for year rows, which have nothing worth opening. */
  onOpen?: () => void;
}) {
  const crest = kind === "house" ? houseCrest(row.key) : null;
  const unit = GROUP_METRICS.find((m) => m.key === metric)?.unit ?? "pts";
  // A row that opens is a button; a row that does not stays a div, so nothing
  // on screen invites a tap that does nothing.
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag
      {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left ${
        onOpen ? "tap44 active:bg-surface-2" : ""
      } ${row.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"}`}
      /*
        THE WHOLE TILE IN THE HOUSE'S COLOUR — a wash of it inside and the edge
        drawn in it (owner, 2026-09-09). Twelve houses in a column all wearing
        the same grey card made the crest the only thing telling them apart; now
        the row itself is the house. A wash rather than a fill, because the text
        on it is theme ink and has to stay readable in both themes; YOUR house
        keeps the theme's own border on top of the wash, so "mine" still reads.
        Content colour from lib/gyms.ts, applied inline (rule 1's exception).
      */
      style={
        crest
          ? {
              background: `${crest.primary}${row.isMine ? "24" : "14"}`,
              ...(row.isMine ? {} : { borderColor: `${crest.primary}66` }),
            }
          : undefined
      }
    >
      <RankBadge rank={row.rank} />
      {/* THE HOUSE'S CREST, in its own two colours and with no initial on it
          (owner, 2026-09-06: "ty hausy taky bez inicialu, jen ty jejich tabs at
          jsou v barvach"). It was a plain filled square — the colours ARE the
          information on a board of twelve houses, but a square of colour is a
          swatch and a shield is a house. Content data from lib/gyms.ts.
          A class-year board has no colours, so it has no crest: an empty grey
          shield says less than the year already written beside it. */}
      {crest && (
        <HouseShield primary={crest.primary} secondary={crest.secondary} size={32} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {groupLabel(kind, row.key)}
          {row.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
        </div>
        <div className="truncate text-[11px] text-muted">
          {/* A house nobody has joined says so, instead of "0 of 0 training". */}
          {nobodyYet(row)
            ? "0 pts · nobody yet"
            : row.points === 0
              ? `${row.members} signed up · nobody has trained yet`
              : `${row.actives} of ${row.members} training · ${
                  /* Always the OTHER number, so the view you're not in is still there. */
                  metric === "total" ? `${row.avgPoints.toFixed(1)} per member` : pointsLabel(row.points)
                }`}
        </div>
      </div>
      {!nobodyYet(row) && <Score value={groupScoreLabel(row, metric)} unit={unit} />}
      {onOpen && (
        <span className="flex-shrink-0 text-muted">
          <IconChevronRight size={15} />
        </span>
      )}
    </Tag>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */

export default function LeaderboardsPage() {
  const router = useRouter();
  const { userId, universityKey } = useAppState();
  const { accepted, accept } = useHonorCode(userId);

  const [period, setPeriod] = useState<Period>("month");
  const [competition, setCompetition] = useState<CompetitionKey>("houses");
  /*
    Which number a team board is ranked on. Per member opens first — it is the
    fairer race, and the one the interhouse competition is gated on — but total
    is one tap away and never hidden, because "we scored the most points in the
    whole college" is a real claim a big house has every right to make.
  */
  const [metric, setMetric] = useState<GroupMetric>("perMember");
  // Only one of these is ever open, but they are separate so neither has to
  // know the other exists.
  const [picking, setPicking] = useState<"competition" | "period" | null>(null);
  const [explaining, setExplaining] = useState(false);
  // The house or dorm whose people are being looked at, if any.
  const [openGroup, setOpenGroup] = useState<GroupRow | null>(null);

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

  const want = `${competition}|${period}|${userId ?? ""}`;
  const loading = result?.for !== want;
  const people = result?.people ?? [];
  // The metric decides the ORDER, not the read: the database hands back every
  // qualifying group with both numbers on it, so switching is a re-sort.
  const groups = useMemo(
    () => rankGroups(result?.groups ?? [], metric),
    [result?.groups, metric],
  );

  const def = useMemo(
    () => COMPETITIONS.find((c) => c.key === competition) ?? COMPETITIONS[0],
    [competition],
  );

  /*
    One label for everybody. It used to read "My dorm" for a first-year, on the
    grounds that a dorm is not a house — but the owner's call is that a
    changing label is worse than a slightly loose one: two people comparing
    screens should be looking at the same words.
  */
  const competitionOptions = useMemo(
    () => COMPETITIONS.map((c) => ({ value: c.key, label: c.label, note: c.note })),
    [],
  );

  // The standing line reloads with the period, not with the board — changing
  // the competition shouldn't make the header flicker.
  useEffect(() => {
    let active = true;
    fetchStanding(period).then((s) => active && setStanding(s));
    return () => {
      active = false;
    };
  }, [period, userId]);

  useEffect(() => {
    let active = true;
    const asGroups = (rows: GroupRow[]) => ({
      for: want,
      people: [] as LeaderRow[],
      groups: rows,
    });
    const asPeople = (rows: LeaderRow[]) => ({ for: want, people: rows, groups: [] as GroupRow[] });

    const run =
      competition === "houses"
        ? fetchGroupBoard("house", period, houses).then(asGroups)
        : competition === "dorms"
          ? fetchGroupBoard("house", period, yardDorms).then(asGroups)
          : competition === "years"
            ? fetchGroupBoard("year", period).then(asGroups)
            : fetchPeopleBoard(
                competition === "partners" ? "partners" : "campus",
                period,
                50,
              ).then(asPeople);

    run
      .then((r) => active && setResult(r))
      // A failed read must still settle, or the board says "Counting…" forever.
      .catch(() => active && setResult({ for: want, people: [], groups: [] }));
    return () => {
      active = false;
    };
  }, [competition, period, want]);

  /* Where a name goes when it is tapped. Somebody else's row opens the public
     profile the Match tab already uses (bio, interests, training, follow);
     your own goes to your own tab, because /people is written for someone
     else's profile and reading your own there would be a stranger's view of
     yourself. */
  const openPerson = (p: { userId: string; isMe: boolean }) =>
    router.push(p.isMe ? "/profile" : `/people/${p.userId}`);

  const isGroupBoard = GROUP_BOARDS.includes(competition);
  const groupKind: "house" | "year" = competition === "years" ? "year" : "house";
  const nudge = nextUpLine(standing);
  const metricUnit = GROUP_METRICS.find((m) => m.key === metric)?.unit ?? "pts";

  /*
    The top three, lifted out of whichever board is on screen and handed to the
    podium in one shape. The list below then carries everyone else, so nobody
    is shown twice. Only groups that have SCORED stand on a pedestal: a podium
    of three houses at zero is not a podium, so on a campus with one active
    house the pedestal has one house on it and the other eleven are the list.
  */
  const scoredGroups = groups.filter((g) => g.points > 0);
  const podiumGroups = scoredGroups.slice(0, 3);
  const listGroups = groups.filter((g) => !podiumGroups.includes(g));
  const podium: PodiumEntry[] = isGroupBoard
    ? podiumGroups.map((g, i) => ({
        id: g.key,
        place: (i + 1) as 1 | 2 | 3,
        // The board's own rank, which is not the place when two are level.
        rank: g.rank,
        title: groupLabel(groupKind, g.key),
        // Always the number the board is NOT ranked on — the other half of
        // the argument, without having to flip the switch to see it.
        subtitle:
          metric === "total"
            ? `${g.avgPoints.toFixed(1)} per member`
            : pointsLabel(g.points),
        kind: "group" as const,
        value: groupScoreLabel(g, metric),
        unit: metricUnit,
        tint: groupKind === "house" ? houseColor(g.key) : null,
        crest: groupKind === "house" ? houseCrest(g.key) : null,
        mineLabel: g.isMine ? "Yours" : undefined,
        onOpen: groupKind === "year" ? undefined : () => setOpenGroup(g),
      }))
    : people.slice(0, 3).map((p, i) => ({
        id: p.userId,
        place: (i + 1) as 1 | 2 | 3,
        rank: p.rank,
        title: p.name,
        subtitle: p.residence ? residenceLabel(p.residence) : (p.classYear ?? undefined),
        kind: "person" as const,
        value: competition === "partners" ? String(p.score) : p.score.toLocaleString("en-US"),
        unit: competition === "partners" ? "people" : "pts",
        tint: houseColor(p.residence),
        mineLabel: p.isMe ? "You" : undefined,
        onOpen: () => openPerson(p),
      }));

  // Hooks are all above this line, so the honour code can gate the screen.
  if (accepted === false) {
    return <HonorCode universityKey={universityKey} onAgree={accept} />;
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {/* Reached from the strip on the Profile tab, so it pushes and pops. */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-3">
        <button type="button" aria-label="Back" onClick={() => router.back()} className="text-muted">
          <IconArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-text">Leaderboards</span>
        <button
          type="button"
          onClick={() => setExplaining(true)}
          aria-label="How points work"
          className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          <IconInfo size={14} />
        </button>
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
                {standing && standing.points > 0
                  ? pointsLabel(standing.points)
                  : "Not on the board yet"}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                {standing && standing.points > 0
                  ? [
                      standing.campusRank
                        ? `${ordinal(standing.campusRank)} of ${standing.campusTotal} on campus`
                        : "",
                      plural(standing.sessions, "session"),
                      standing.kinds.newPartner > 0
                        ? `${standing.kinds.newPartner} with someone new`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
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

      {/* The two controls. */}
      <div className="border-b border-border px-3.5 py-2.5">
        <div className="flex gap-2">
          <Picker
            caption="Competition"
            value={def.label}
            onOpen={() => setPicking("competition")}
          />
          <Picker
            caption="Period"
            value={PERIODS.find((p) => p.key === period)?.label ?? ""}
            onOpen={() => setPicking("period")}
          />
        </div>
      </div>

      {/* The board */}
      <div className="px-3.5 pt-3">
        {/* THE RACE, above the Houses board: this month's interhouse event,
            who is in, and — for the houses that aren't — exactly how many more
            active people would put them in (the one minimum left anywhere). */}
        {competition === "houses" && (
          <div className="mb-3">
            <HouseRace />
          </div>
        )}
        {/* On a team board the switch above the words is what the words are
            about, so it goes first and the line under it explains the choice
            that is currently made. */}
        {isGroupBoard && (
          <div className="mb-2">
            <MetricSwitch value={metric} onPick={setMetric} />
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-muted">
          {def.blurb}
          {isGroupBoard && ` ${METRIC_BLURB[metric]}`}
        </p>

        {loading ? (
          <div className="px-4 py-16 text-center text-[12px] text-muted">Counting…</div>
        ) : isGroupBoard ? (
          groups.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
              {def.empty}
            </div>
          ) : (
            <>
              {podium.length > 0 ? (
                <Podium entries={podium} />
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
                  Nobody has logged a session this period. The first one puts a{" "}
                  {groupKind === "year" ? "year" : "house"} on the podium.
                </div>
              )}
              {listGroups.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {listGroups.map((g) => (
                    <GroupRowItem
                      key={g.key}
                      row={g}
                      kind={groupKind}
                      metric={metric}
                      onOpen={groupKind === "year" || nobodyYet(g) ? undefined : () => setOpenGroup(g)}
                    />
                  ))}
                </div>
              )}
            </>
          )
        ) : people.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
            {def.empty}
          </div>
        ) : (
          <>
            <Podium entries={podium} />
            {people.length > 3 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {people.slice(3).map((r) => (
                  <PersonRow
                    key={r.userId}
                    row={r}
                    competition={competition}
                    onOpen={() => openPerson(r)}
                  />
                ))}
              </div>
            )}
            <div className="mt-2.5 px-0.5 text-[11px] text-muted">
              {competition === "partners"
                ? `${plural(people[0].score, "partner")} leads`
                : `Top ${people.length}`}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 px-3.5">
        <HonorCodeFooter universityKey={universityKey} />
      </div>

      {picking === "competition" && (
        <OptionPickerSheet
          title="Competition"
          hint="What the board is measuring."
          options={competitionOptions}
          selected={[competition]}
          onSave={(values) => setCompetition(values[0] as CompetitionKey)}
          onClose={() => setPicking(null)}
        />
      )}

      {picking === "period" && (
        <OptionPickerSheet
          title="Period"
          hint="How far back the board counts."
          options={PERIODS.map((p) => ({ value: p.key, label: p.label, note: p.note }))}
          selected={[period]}
          onSave={(values) => setPeriod(values[0] as Period)}
          onClose={() => setPicking(null)}
        />
      )}

      {explaining && (
        <ScoringSheet universityKey={universityKey} onClose={() => setExplaining(false)} />
      )}

      {openGroup && (
        <GroupSheet
          row={openGroup}
          kind="house"
          // So the sheet's header says the same rank and the same number the
          // row that opened it did.
          metric={metric}
          period={period}
          periodLabel={PERIODS.find((p) => p.key === period)?.label ?? ""}
          onClose={() => setOpenGroup(null)}
        />
      )}
    </div>
  );
}
