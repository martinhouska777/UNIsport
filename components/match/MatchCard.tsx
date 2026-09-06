import type { Match } from "@/lib/supabase/matching";
import { matchTier } from "@/lib/matchTier";
import { topMatchReasons, type ReasonRarity } from "@/lib/matchReasons";
import { classYearLabel } from "@/lib/onboarding";
import Button from "@/components/ui/Button";
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

  The chips are WHY THEM RATHER THAN ANYONE ELSE, so they carry only what
  differs: concentration, interests, where they're from, the gym you share.
  Rarest first (see lib/matchReasons.ts) — a fact 90% of the list also has tells
  you nothing, however many points it scored. Experience level lives on the full
  profile for exactly that reason: it was on nine cards in ten.

  Every chip is a real overlap out of the matching engine. The mockup had a
  made-up AI sentence here; a fact is more useful and we can stand behind it.
*/
export default function MatchCard({
  match,
  max,
  onView,
  rarity,
  reasonCount = 5,
}: {
  match: Match;
  max: number; // 100 for browse, 92 for session search
  onView?: (m: Match) => void;
  // How common each kind of reason is across the list this card belongs to.
  // Without it the chips fall back to strongest-first.
  rarity?: ReasonRarity;
  reasonCount?: number;
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
  const reasons = topMatchReasons(match, reasonCount, rarity);

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

        {/* Why they're here. Chips wrap, so a person with three overlaps gets a
            slightly taller card than one with a single overlap — better than
            truncating the reason someone actually cares about. */}
        <div className="mb-2 mt-1.5 flex min-h-[18px] flex-wrap gap-1">
          {reasons.length > 0 ? (
            reasons.map((r) => (
              <span
                key={r.key}
                title={r.full}
                className="max-w-full truncate rounded-md border border-accent-line bg-accent-tint px-1.5 py-0.5 text-[11px] leading-tight text-text"
              >
                {r.short}
              </span>
            ))
          ) : (
            <span className="text-[11px] italic text-muted">
              A possible workout partner.
            </span>
          )}
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
