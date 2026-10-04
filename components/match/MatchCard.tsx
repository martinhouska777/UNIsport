"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Match, PersonCard } from "@/lib/supabase/matching";
import { cardChips, type CardChip, type ReasonRarity } from "@/lib/matchReasons";
import { classYearWord } from "@/lib/onboarding";
import { markColor } from "@/lib/colorMarks";
import Button from "@/components/ui/Button";
import ProfileBadge from "@/components/ProfileBadge";
import { IconCheck } from "@/components/icons";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { useAppState } from "@/components/AppState";
import { teamFor } from "@/lib/cohorts";

/*
  One result card in the Match grid: avatar block, name, an identity line, the reasons this person ranked where they did, and a
  View Profile button. All colors are theme tokens.

  Under the name, WHO THEY ARE, in two short lines (owner picked look "B",
  2026-10-04): "Junior in Dunster" with the house in its own colour, then
  everything they train — the main activity first, then their extras
  ("Lifts, Climbing"). VARSITY / MENTOR sit under the photo, the same small
  pair as on their profile. Badges and extras come from `card`
  (db/people_cards_2026-10-04.sql); without it the card shows the main
  activity alone and no badges.

  The chips answer two questions at once. What you SHARE comes first, in the
  school's colour with a tick — rarest first (see lib/matchReasons.ts), because
  a fact 90% of the list also has tells you nothing however many points it
  scored. Then WHO THEY ARE, in grey: their concentration and what they're
  into. Every card fills its rows either way, and nothing on it is invented.

  Experience level lives on the full profile: it was on nine cards in ten. So
  does "Both lift" — the identity line above already says what they train.
*/
export default function MatchCard({
  match,
  card,
  onView,
  rarity,
  chipCount = 14,
  tour,
}: {
  match: Match;
  /** Badges + everything they train — fetched by the grid, may be missing. */
  card?: PersonCard;
  onView?: (m: Match) => void;
  // How common each kind of reason is across the list this card belongs to.
  // Without it the chips fall back to strongest-first.
  rarity?: ReasonRarity;
  /** How many chips to CONSIDER. The card shows as many as fit its three
      rows (see packRows), so this is a pool, not the number on screen. */
  chipCount?: number;
  /** A `data-tour` for the walk to light — the first card on the board. */
  tour?: string;
}) {
  // Their TEAM's colours: the house when they have one, the first-year cohort
  // when they don't (lib/cohorts.ts) — so a first-year's card is never grey.
  const { universityKey } = useAppState();
  const houseColors = teamFor(universityKey, match.residence, match.classYear)?.colors ?? null;

  // "Junior in Dunster" — either half alone when the other was never answered.
  // The house wears its colour, darkened where it would not read on the card
  // (Mather's silver, Adams' gold — lib/colorMarks.ts).
  const year = match.classYear ? classYearWord(match.classYear) : null;
  const houseInk = markColor(houseColors?.primary);
  const trains = trainsList(match.mainActivity, card);
  const chips = useMemo(() => cardChips(match, chipCount, rarity), [match, chipCount, rarity]);

  /*
    PACKED, NOT WRAPPED (owner, 2026-09-16: "so many empty spaces"). Wrapping in
    order left a hole at the end of a row whenever the next chip was long
    ("Malkin Athletic Center"), and pushed everything after it past the third
    row. Now every candidate chip is measured once, hidden, and placed in the
    first of the three rows it still fits — so short chips fill the gaps and
    the card holds as many as it has room for. Shared ones are placed first and
    lead each row.
  */
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<CardChip[][] | null>(null);
  useLayoutEffect(() => {
    const pack = () => {
      const box = boxRef.current;
      const measure = measureRef.current;
      if (!box || !measure) return;
      const widths = [...measure.children].map((el) => el.getBoundingClientRect().width);
      setRows(packRows(chips, widths, box.clientWidth));
    };
    pack();
    document.fonts?.ready.then(pack);
    window.addEventListener("resize", pack);
    return () => window.removeEventListener("resize", pack);
  }, [chips]);

  return (
    <div data-tour={tour} className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/*
        Avatar block. No fit badge ("Strong fit" etc. — cut, owner 2026-10-04);
        the chips below say what you share. The head is a SUNKEN panel with a
        hairline under it, so the card reads as two parts — the person, then
        the facts. It used to be a diagonal gradient that started lighter than
        the card and ended darker, which averaged out to the card's own tone
        and left the top of the card looking like a smudge on the dark theme
        (owner, 2026-09-14).
      */}
      <div className="flex h-24 flex-col items-center justify-center gap-1.5 border-b border-border bg-sunken">
        <InitialsAvatar name={match.name} size={48} colors={houseColors} />
        {(card?.varsity || card?.mentor) && (
          <div className="flex gap-1">
            {card.varsity && <ProfileBadge kind="varsity" small />}
            {card.mentor && <ProfileBadge kind="mentor" small />}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="truncate text-[13px] font-semibold text-text">
          {match.name || "Member"}
        </div>
        {/* Both lines are always there (a blank one holds its place), so every
            card in the grid stays the same height. */}
        <div className="truncate text-[11px] text-muted">
          {year}
          {year && match.residence && " in "}
          {match.residence && (
            <span className={`font-semibold ${houseInk ? "" : "text-text"}`} style={houseInk ? { color: houseInk } : undefined}>
              {match.residence}
            </span>
          )}
          {!year && !match.residence && "\u00a0"}
        </div>
        <div className="truncate text-[11px] text-muted">{trains.join(", ") || "\u00a0"}</div>

        {/*
          WHO THEY ARE AND WHAT YOU SHARE — always exactly three rows tall.

          The chips used to wrap freely, so a person with four overlaps made a
          card half again as tall as the person beside them with one, and the
          grid came out ragged. The block is a fixed height and clips, which is
          what keeps the grid even.

          What it does NOT do any more is pad the leftover room with blank grey
          boxes. A card with two overlaps and four empty slots looked broken and
          said nothing; it now fills up with facts about the person instead (see
          cardChips in lib/matchReasons.ts).

          SHARED things wear the school's own colour and a tick, so what is
          TRUE about the two of you is always the thing with colour on it.
          Everything else is plainly theirs, in grey — it is never dressed up as
          something you have in common.
        */}
        {/* 68px, not 64: a chip is 19.35px tall and the gap 4px, so three rows
            come to 66px and the old box sliced 2px off the bottom row — which
            read as the button sitting on top of the chips. A fourth row would
            start at 70px, so it stays hidden and the grid stays even. */}
        <div ref={boxRef} className="relative mb-2 mt-1.5 flex h-[68px] flex-col gap-1 overflow-hidden">
          {/* The measuring copy: every candidate, unwrapped and invisible. */}
          <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex whitespace-nowrap">
            {chips.map((c) => (
              <Chip key={c.key} c={c} />
            ))}
          </div>
          {(rows ?? [chips.slice(0, 6)]).map((row, r) => (
            <div key={r} className={`flex gap-1 ${rows ? "" : "flex-wrap"}`}>
              {row.map((c) => (
                <Chip key={c.key} c={c} />
              ))}
            </div>
          ))}
        </div>

        {/* Was 22px tall with 10px text — the only action on the card and the
            hardest thing on it to hit. Now a real 32px control.
            data-tour: the walk opens the first card's profile (lib/tour.ts). */}
        <Button
          size="sm"
          full
          onClick={() => onView?.(match)}
          data-tour={tour ? `${tour}-view` : undefined}
        >
          View profile
        </Button>
      </div>
    </div>
  );
}

/*
  What they train, as words for the card. Kept beside the card because it is
  presentation — lib/onboarding.ts owns the keys themselves. "Other" is shown as
  what it actually is ("Climbing"); an "Other" with no name says nothing and is
  left out.
*/
const ACTIVITY_WORD: Record<string, string> = { gym: "Lifts", running: "Runs", cardio: "Cardio" };

function trainsList(main: string | null, card: PersonCard | undefined): string[] {
  const out: string[] = [];
  const add = (key: string | null, note: string | null | undefined) => {
    const word = key === "other" ? note?.trim() || null : key ? ACTIVITY_WORD[key] ?? null : null;
    if (word && !out.includes(word)) out.push(word);
  };
  add(main, card?.activityOther);
  card?.otherActivities.forEach((o) => add(o.key, o.note));
  return out;
}

function Chip({ c }: { c: CardChip }) {
  return (
    <span
      title={c.full}
      className={`flex max-w-full flex-shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${
        c.shared ? "border-primary-line bg-primary-tint text-primary" : "border-border bg-surface-2 text-muted"
      }`}
    >
      {c.shared && (
        <span className="flex-shrink-0" aria-label="You share this">
          <IconCheck size={10} />
        </span>
      )}
      <span className="truncate">{c.label}</span>
    </span>
  );
}

const ROWS = 3;
const GAP = 4; // gap-1
/** First-fit: each chip, in priority order, goes in the first row it fits. */
function packRows(chips: CardChip[], widths: number[], width: number): CardChip[][] {
  const used = Array<number>(ROWS).fill(0);
  const rows: CardChip[][] = Array.from({ length: ROWS }, () => []);
  chips.forEach((c, i) => {
    const w = Math.min(widths[i] ?? 0, width);
    for (let r = 0; r < ROWS; r++) {
      const next = used[r] ? used[r] + GAP + w : w;
      if (next <= width + 0.5) {
        used[r] = next;
        rows[r].push(c);
        return;
      }
    }
  });
  return rows.map((row) => [...row.filter((c) => c.shared), ...row.filter((c) => !c.shared)]);
}
