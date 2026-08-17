import type { Match } from "@/lib/supabase/matching";
import { matchTier } from "@/lib/matchTier";
import { topMatchReasons } from "@/lib/matchReasons";
import { IconUser } from "@/components/icons";
import Button from "@/components/ui/Button";

/*
  One result card in the Match grid: avatar block with a compatibility badge,
  name, "house · level" subtitle, the reasons this person ranked where they did,
  and a View Profile button. All colors are theme tokens.

  The reasons are the point of the card. They are the actual things the two
  people share, straight out of the matching engine — "Economics", "Czechia",
  "Climbing, Coffee" — in the order those things moved the score. The mockup had
  a made-up AI sentence here instead; a real fact is both more useful and
  something we can stand behind. The full list lives on their profile.
*/
export default function MatchCard({
  match,
  max,
  onView,
}: {
  match: Match;
  max: number; // 100 for browse, 92 for session search
  onView?: (m: Match) => void;
}) {
  // A qualitative tier, not a raw percentage — see lib/matchTier.ts for why.
  const tier = matchTier(match.score, max);
  const subtitle = [match.residence, levelLabel(match.level)]
    .filter(Boolean)
    .join(" · ");
  const reasons = topMatchReasons(match);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Avatar block + compatibility badge */}
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-surface-2 to-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary-tint text-primary">
          <IconUser size={20} />
        </div>
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

const levelLabel = (l: string | null) =>
  l ? l.charAt(0).toUpperCase() + l.slice(1) : null;
