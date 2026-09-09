"use client";

/*
  THE PODIUM — the top three, standing up.
  ---------------------------------------------------------------------------
  Every board on this screen used to open as a list, which meant first place
  looked exactly like eleventh place with a different number beside it. A
  leaderboard's whole job is to make the top of it worth wanting, so the first
  three now come out of the list and stand on pedestals — second on the left,
  first in the middle and higher, third on the right — the shape every quiz and
  every game show has used for the same reason.

  The rest of the board carries on underneath from fourth, so nobody is listed
  twice.

  A HOUSE gets its crest — the shield in its own two colours (lib/gyms.ts) —
  where a person gets an avatar, and each of the three wears its MEDAL on the
  shoulder of that avatar: gold, silver, bronze, with the place stamped on it
  (components/leaderboards/Medal.tsx). The pedestal underneath is therefore
  bare colour now; the number used to be printed on it, and printing it twice
  in one column is how a screen starts repeating itself.

  COLOURS. The pedestals are gold, silver and bronze — the only colours in the
  app that aren't the school's, which is why they are TOKENS (`--podium-1..3`
  in globals.css) rather than three hexes typed in here (rule 1). Everything
  else on the card is theme tokens, and a house's own identity colour — DATA
  from lib/gyms.ts — tints its avatar, the same exception the gym and lineup
  screens use.

  The blocks grow up out of the floor when a board lands, one after another. It
  is the one place on this screen worth a beat of movement, and it turns itself
  off for anyone who asks for reduced motion.
*/
import { IconUser, HouseShield } from "@/components/icons";
import Medal from "@/components/leaderboards/Medal";

export type PodiumEntry = {
  /** React key — a user id or a house name. */
  id: string;
  /*
    WHICH PEDESTAL it stands on — first, second or third from the top of the
    board. Kept apart from the number printed on the block, because ranks TIE:
    two houses level on points are both 1st and the next one is 3rd, and the
    podium has to show that honestly rather than renumbering them 1-2-3.
  */
  place: 1 | 2 | 3;
  /** The number written on the block. Usually the place; not when there's a tie. */
  rank: number;
  title: string;
  /** One short line under the name: a house, a class year, a session count. */
  subtitle?: string;
  /*
    WHAT THE AVATAR IS. A person's is a tinted circle with a plain figure on
    it; a group's is its colour and nothing else — no letter, no number
    (owner, 2026-09-06: "ty hausy taky bez inicialu, jen ty jejich tabs at
    jsou v barvach"). A group with no colour to show has no circle at all,
    because an empty grey ring says less than the name under it already does.
  */
  kind?: "person" | "group";
  /** The score, already formatted. */
  value: string;
  unit: string;
  /** A house's identity colour, applied inline (rule 1's content exception). */
  tint?: string | null;
  /** A house's TWO colours — its crest stands in for the avatar (data, again). */
  crest?: { primary: string; secondary: string } | null;
  /** "You" on a people board, "Yours" on a house board. */
  mineLabel?: string;
  onOpen?: () => void;
};

/* Per place: how tall the block is, which medal it is, and how late it rises.
   Kept as data so the three columns are one piece of markup, not three. */
const PLACE = {
  1: {
    block: "h-[62px]",
    bg: "bg-podium-1",
    tintBg: "bg-podium-1-tint",
    line: "border-podium-1-line",
    delay: "180ms",
    avatar: "h-14 w-14 text-[15px]",
    crest: 56,
    medal: 26,
  },
  2: {
    block: "h-[44px]",
    bg: "bg-podium-2",
    tintBg: "bg-podium-2-tint",
    line: "border-podium-2-line",
    delay: "60ms",
    avatar: "h-12 w-12 text-[13px]",
    crest: 46,
    medal: 22,
  },
  3: {
    block: "h-[32px]",
    bg: "bg-podium-3",
    tintBg: "bg-podium-3-tint",
    line: "border-podium-3-line",
    delay: "300ms",
    avatar: "h-12 w-12 text-[13px]",
    crest: 46,
    medal: 22,
  },
} as const;

function Place({ entry }: { entry: PodiumEntry }) {
  const p = PLACE[entry.place];
  // A place that opens something is a button; one that doesn't stays a div, so
  // nothing on screen invites a tap that does nothing.
  const Tag = entry.onOpen ? "button" : "div";

  return (
    <Tag
      {...(entry.onOpen ? { type: "button" as const, onClick: entry.onOpen } : {})}
      className={`flex min-w-0 flex-1 flex-col items-center ${
        entry.onOpen ? "tap44" : ""
      }`}
    >
      <div
        className="podium-card-in flex w-full min-w-0 flex-col items-center"
        style={{ animationDelay: p.delay }}
      >
        {/* A house shows its crest, a person a tinted circle — and whichever it
            is, the medal hangs on its shoulder. A group with no colours at all
            (a class year) has no shape, so the medal stands on its own. */}
        <div className="relative">
          {entry.kind === "group" ? (
            entry.crest && (
              <HouseShield
                primary={entry.crest.primary}
                secondary={entry.crest.secondary}
                size={p.crest}
              />
            )
          ) : (
            <span
              className={`flex flex-shrink-0 items-center justify-center rounded-full border-2 text-text ${p.avatar} ${p.tintBg} ${p.line}`}
              style={
                entry.tint
                  ? { background: `${entry.tint}2e`, borderColor: entry.tint }
                  : undefined
              }
            >
              <IconUser size={entry.place === 1 ? 22 : 19} />
            </span>
          )}
          <span
            className={
              entry.kind === "group" && !entry.crest
                ? "block"
                : "absolute -bottom-1 -right-1.5"
            }
          >
            <Medal place={entry.place} rank={entry.rank} size={p.medal} />
          </span>
        </div>

        <div className="mt-1.5 w-full truncate px-0.5 text-center text-[12px] font-medium leading-tight text-text">
          {entry.title}
        </div>
        {entry.mineLabel && (
          <div className="text-[10px] font-medium text-primary">{entry.mineLabel}</div>
        )}
        {entry.subtitle && (
          <div className="w-full truncate px-0.5 text-center text-[10px] leading-tight text-muted">
            {entry.subtitle}
          </div>
        )}

        <div className="mt-1 text-[15px] font-semibold leading-none text-text">{entry.value}</div>
        <div className="mt-0.5 text-[8px] uppercase tracking-[0.08em] text-muted">{entry.unit}</div>
      </div>

      {/* The pedestal. NO TROPHY on it — one floated above the winner's avatar,
          then sat on the block as a sticker, and the owner's verdict on both was
          "to je strasne" (2026-09-06). The gold block is already the thing that
          says first, and the medal above it says which place. */}
      <div
        className={`podium-rise mt-1.5 w-full rounded-t-xl ${p.block} ${p.bg}`}
        style={{ animationDelay: p.delay }}
      />
    </Tag>
  );
}

export default function Podium({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  // Second, first, third — left to right, as a podium stands. A board with
  // only one or two rows on it simply shows the places it has.
  const order = [2, 1, 3]
    .map((place) => entries.find((e) => e.place === place))
    .filter((e): e is PodiumEntry => !!e);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-2 px-2.5 pt-3.5">
      <div className="flex items-end justify-center gap-2">
        {order.map((e) => (
          <Place key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}
