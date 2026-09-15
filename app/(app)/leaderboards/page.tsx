"use client";

/*
  LEADERBOARDS — reached from the strip on the Profile tab.
  ---------------------------------------------------------------------------
  TWO TABS, in the header where the title was — the same pill-in-a-capsule
  switch as Match and Messages (owner, 2026-09-13: no "Leaderboards" title, and
  "proper tabs"). EVENTS is the challenges, this week's and this month's; the
  interhouse race was cut from it the same day, to be rethought later
  (components/leaderboards/HouseRace.tsx is kept, unused, for that). RANKINGS is
  your one line plus the board.

  THE BOARD IS THE SCREEN. It had drifted under four things that were all, in
  the end, explanation: a nudge line, two house tiles, a paragraph saying what
  "Houses" means, and a footnote saying the numbers are self-reported. The
  owner cut every one of them ("cut all that extra text"), and the top three
  houses are on screen the moment it opens. The two pickers say what is being
  ranked and over what; anything longer lives behind the ⓘ.

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
  25 — the rates live in lib/points.ts as data. The rows are kept bare (owner,
  2026-09-15): a house says how many of its people are training, a person their
  house and class, a partners row and a class year only the name — the session
  counts live inside a house and on the person's profile. The full rules sit
  behind the ⓘ in the header.

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
import HonorCode, { useHonorCode } from "@/components/leaderboards/HonorCode";
import GroupSheet from "@/components/leaderboards/GroupSheet";
import WeekEventLine from "@/components/leaderboards/WeekEventLine";
import MonthChallenges from "@/components/leaderboards/MonthChallenges";
import Podium, { type PodiumEntry } from "@/components/leaderboards/Podium";
import Medal from "@/components/leaderboards/Medal";
import ScoringSheet from "@/components/leaderboards/ScoringSheet";
import YouSheet from "@/components/leaderboards/YouSheet";
import OptionPickerSheet from "@/components/profile/OptionPickerSheet";
import SectionLabel from "@/components/ui/SectionLabel";
import { useProfileData } from "@/components/profile/useProfileData";
import { houses, residenceLabel, yardDorms } from "@/lib/onboarding";
import { pointsLabel } from "@/lib/points";
import {
  fetchGroupBoard,
  fetchPeopleBoard,
  fetchStanding,
  groupLabel,
  groupScoreLabel,
  houseColor,
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

/** Which half of the screen you are on. */
type TabKey = "rankings" | "events";

type Competition = {
  key: CompetitionKey;
  label: string;
  /** One line in the picker, saying what the board actually measures. */
  note: string;
  empty: string;
};

const COMPETITIONS: Competition[] = [
  {
    key: "houses",
    label: "Houses",
    note: "House vs house",
    empty: "No houses to show.",
  },
  {
    key: "dorms",
    label: "Dorms",
    note: "First-year Yard dorms",
    empty: "No dorms to show.",
  },
  {
    key: "everyone",
    label: "Everyone",
    note: "The whole campus, by points",
    empty: "Nobody has logged a session yet.",
  },
  {
    key: "partners",
    label: "Most partners",
    note: "Who trained with the most people",
    empty: "Nobody has logged a session with a partner yet.",
  },
  {
    key: "years",
    label: "Years",
    note: "Class year vs class year",
    empty: "No class years to show.",
  },
];

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
    <div className="flex gap-1 rounded-full border border-border bg-surface p-0.5">
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

/* THE TWO TABS. Rankings is the boards; Events is the challenges with a
   deadline — this week's and this month's. They used to be stacked on one
   screen, which pushed the leaderboard itself below the fold. */
const TABS: { key: TabKey; label: string }[] = [
  { key: "rankings", label: "Rankings" },
  { key: "events", label: "Events" },
];

/* The same capsule as the Match and Messages tabs: the chosen tab is a pill
   inside it. It sits in the header between Back and ⓘ, where the title was. */
function TabBar({ value, onPick }: { value: TabKey; onPick: (t: TabKey) => void }) {
  return (
    <div role="tablist" aria-label="Leaderboards" className="flex min-w-0 flex-1 rounded-full border border-border bg-sunken p-1">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onPick(t.key)}
          className={`min-h-9 flex-1 rounded-full py-1.5 text-center text-[13px] font-semibold transition-colors ${
            value === t.key ? "bg-text text-background" : "text-muted"
          }`}
        >
          {t.label}
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

/* The small line under a person's name — the same on the podium and the list. */
function personDetail(row: LeaderRow, competition: CompetitionKey): string | undefined {
  if (competition === "partners") return undefined;
  return (
    [row.residence ? residenceLabel(row.residence) : "", row.classYear ?? ""]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

/* The small line under a house or dorm: just how many of its people are
   training. The other number ("400 pts" / "7.8 per member") was cut, and a
   class year has nothing under it at all (owner, 2026-09-15). */
function groupDetail(row: GroupRow, kind: "house" | "year"): string | undefined {
  if (kind === "year") return undefined;
  if (nobodyYet(row)) return "Nobody yet";
  return `${row.actives} of ${row.members} training`;
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
  const tint = houseColor(row.residence);
  /* Everyone: just their house and class, no session count. Most partners:
     only the name, nothing under it (owner, 2026-09-15). */
  const detail = personDetail(row, competition);

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
        {detail && <div className="truncate text-[11px] text-muted">{detail}</div>}
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
  const detail = groupDetail(row, kind);
  // A row that opens is a button; a row that does not stays a div, so nothing
  // on screen invites a tap that does nothing.
  const Tag = onOpen ? "button" : "div";
  /* NO SHARE BESIDE THE ROW (owner, 2026-09-12: "cut the share on the right,
     each house has it, it's strange"). A share icon repeated down twelve
     house rows reads as part of the house rather than as an invitation, and
     it put a second tap target on a row whose whole job is to open. The
     invite still lives on the Events tab, beside the houses that are NOT YET
     IN the interhouse race — which is the one place it is an answer to
     something on screen. */
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
        {detail && <div className="truncate text-[11px] text-muted">{detail}</div>}
      </div>
      {/* A class year always shows its number — with no line under the name,
          a blank row would otherwise say nothing at all. */}
      {(kind === "year" || !nobodyYet(row)) && (
        <Score value={groupScoreLabel(row, metric)} unit={unit} />
      )}
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
  // Your own photo, for the "You" line at the top of Rankings.
  const { data: myProfile } = useProfileData();
  const myPhoto = typeof myProfile?.photo === "string" ? myProfile.photo : "";

  const [tab, setTab] = useState<TabKey>("rankings");
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
  // Your own line, opened up: the ranks, the breakdown and your friends.
  const [openingSelf, setOpeningSelf] = useState(false);
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
        subtitle: groupDetail(g, groupKind),
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
        subtitle: personDetail(p, competition),
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
      <div className="sticky top-0 z-10 border-b border-border bg-surface">
        {/* No "Leaderboards" title — the tabs take its place. */}
        <h1 className="sr-only">Leaderboards</h1>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <button type="button" aria-label="Back" onClick={() => router.back()} className="tap44 flex-shrink-0 text-muted">
            <IconArrowLeft size={18} />
          </button>
          <TabBar value={tab} onPick={setTab} />
          <button
            type="button"
            onClick={() => setExplaining(true)}
            aria-label="How points work"
            className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconInfo size={14} />
          </button>
        </div>
      </div>

      {tab === "events" ? (
        <div className="flex flex-col gap-5 px-3.5 py-4">
          {/* THE CHALLENGES, WEEKLY AND MONTHLY — the week's one, then the
              month's two, each under its own heading (owner, 2026-09-13). The
              interhouse race that sat below them is cut for now. */}
          <div>
            <SectionLabel className="mb-2">This week</SectionLabel>
            <WeekEventLine />
          </div>
          <div>
            <SectionLabel className="mb-2">This month</SectionLabel>
            <MonthChallenges />
          </div>
        </div>
      ) : (
        <>
          {/*
            YOU, IN ONE LINE — AND IT OPENS. This was a card with a nudge line
            and two house tiles under it: four blocks of text before the board,
            on a screen whose whole job is the board. What is left on the line
            is the only part nobody can look up somewhere else — your points,
            and where that puts you — and everything that was cut, plus your
            ranks, what the points were made of and the small board of the
            people you follow, is behind a tap (YouSheet). One line at rest,
            the whole of your standing when you want it.
          */}
          <button
            type="button"
            onClick={() => setOpeningSelf(true)}
            className="tap44 flex w-full items-center gap-2.5 border-b border-border px-3.5 py-2.5 text-left active:bg-surface-2"
          >
            {/* YOU, as you: your own photo in a ring of the school colour, with
                a small gold trophy on its corner — it was a trophy in a little
                square, which said "leaderboard" but not "you". */}
            <span className="relative flex-shrink-0">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
                {myPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={myPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <IconUser size={18} />
                )}
              </span>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-background">
                <IconTrophy size={10} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text">
                {standing && standing.points > 0
                  ? `You · ${pointsLabel(standing.points)}`
                  : "Not on the board yet"}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted">
                {standing && standing.points > 0
                  ? [
                      standing.campusRank
                        ? `${ordinal(standing.campusRank)} of ${standing.campusTotal} on campus`
                        : "",
                      plural(standing.sessions, "session"),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Log a session and you're on it."}
              </div>
            </div>
            {/* The line looked like a label, so nobody would have tried
                tapping it. The chevron is the whole difference. */}
            <span className="flex-shrink-0 text-muted">
              <IconChevronRight size={15} />
            </span>
          </button>

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

          {/* The board. No paragraph explaining it: the two pickers above
              already say what is being ranked and over what, the switch says
              how, and everything longer than that is in the ⓘ. */}
          <div className="px-3.5 pt-2.5">
            {isGroupBoard && (
              <div className="mb-2.5">
                <MetricSwitch value={metric} onPick={setMetric} />
              </div>
            )}

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
        </>
      )}

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

      {openingSelf && (
        <YouSheet
          standing={standing}
          period={period}
          periodLabel={PERIODS.find((p) => p.key === period)?.label ?? ""}
          onClose={() => setOpeningSelf(false)}
        />
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
