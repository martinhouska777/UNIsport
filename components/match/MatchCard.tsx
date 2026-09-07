import type { Match } from "@/lib/supabase/matching";
import { matchTier } from "@/lib/matchTier";
import { cardChips, type ReasonRarity } from "@/lib/matchReasons";
import { classYearLabel } from "@/lib/onboarding";
import Button from "@/components/ui/Button";
import { IconCheck } from "@/components/icons";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { useAppState } from "@/components/AppState";
import { houseColorsFor } from "@/lib/gyms";

/*
  One result card in the Match grid: avatar block with a compatibility badge,
  name, an identity line, the reasons this person ranked where they did, and a
  View Profile button. All colors are theme tokens.

  The line under the name is WHO THEY ARE — year, house, what they train. Three
  facts every member has, so it reads the same on every card and you learn to
  scan it.

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
  max,
  onView,
  rarity,
  chipCount = 6,
}: {
  match: Match;
  max: number; // 100 for browse, 92 for session search
  onView?: (m: Match) => void;
  // How common each kind of reason is across the list this card belongs to.
  // Without it the chips fall back to strongest-first.
  rarity?: ReasonRarity;
  /** How many chips to fill the rows with. Six fits the three rows. */
  chipCount?: number;
}) {
  // Their house's own colours, when they gave a house — see InitialsAvatar.
  const { universityKey } = useAppState();
  const houseColors = houseColorsFor(universityKey, match.residence);

  // A qualitative tier, not a raw percentage — see lib/matchTier.ts for why.
  const tier = matchTier(match.score, max);
  // Year · house · what they train. Anything they never answered drops out
  // rather than leaving a stray separator.
  const subtitle = [
    match.classYear ? classYearLabel(match.classYear) : null,
    match.residence,
    activityLabel(match.mainActivity),
  ]
    .filter(Boolean)
    .join(" · ");
  const chips = cardChips(match, chipCount, rarity);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Avatar block + compatibility badge */}
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-surface-2 to-background">
        <InitialsAvatar name={match.name} size={48} colors={houseColors} />
        {tier && (
          <span className="absolute right-2 top-2 rounded-lg border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-text">
            {tier.label}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="truncate text-xs font-medium text-text">
          {match.name || "Member"}
        </div>
        {subtitle && (
          <div className="truncate text-[11px] text-muted">{subtitle}</div>
        )}

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
        <div className="mb-2 mt-1.5 flex h-[64px] flex-wrap content-start gap-1 overflow-hidden">
          {chips.map((c) => (
            <span
              key={c.key}
              title={c.full}
              className={`flex max-w-full items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${
                c.shared
                  ? "border-primary-line bg-primary-tint text-primary"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              {c.shared && (
                <span className="flex-shrink-0" aria-label="You share this">
                  <IconCheck size={10} />
                </span>
              )}
              <span className="truncate">{c.label}</span>
            </span>
          ))}
        </div>

        {/* Was 22px tall with 10px text — the only action on the card and the
            hardest thing on it to hit. Now a real 32px control. */}
        <Button size="sm" full onClick={() => onView?.(match)}>
          View profile
        </Button>
      </div>
    </div>
  );
}

/*
  What they train, as a verb, for the identity line. Kept beside the card
  because it is presentation — lib/onboarding.ts owns the keys themselves.
*/
const activityLabel = (a: string | null) =>
  a ? { gym: "Lifts", running: "Runs", cardio: "Cardio", other: "Other" }[a] ?? null : null;
