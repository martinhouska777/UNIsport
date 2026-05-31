import type { Match } from "@/lib/supabase/matching";
import { IconUser } from "@/components/icons";

/*
  One result card in the Match grid. Mirrors the mockup: avatar block with a
  compatibility badge, name, "house · level" subtitle, a short data-driven
  "why you match" line, and a View Profile button. All colors are theme tokens.
*/

// Turn the score breakdown into a plain-English reason, picking the two
// strongest signals. This replaces the mockup's faked AI sentence with real
// data so it can never claim something that isn't in the score.
function reasonFor(m: Match): string {
  const b = m.breakdown;
  const bits: { pts: number; text: string }[] = [
    { pts: b.gym, text: "trains at your gym" },
    { pts: b.schedule ?? 0, text: "free when you are" },
    { pts: b.concentration, text: "same concentration" },
    { pts: b.origin, text: "from near you" },
    { pts: b.interests, text: "shares your interests" },
    { pts: b.languages, text: "speaks your language" },
    { pts: b.level, text: "a level that fits" },
    { pts: b.training, text: "wants a partner too" },
  ];
  const top = bits
    .filter((x) => x.pts > 0)
    .sort((a, c) => c.pts - a.pts)
    .slice(0, 2)
    .map((x) => x.text);
  if (top.length === 0) return "A possible workout partner.";
  const s = top.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

const levelLabel = (l: string | null) =>
  l ? l.charAt(0).toUpperCase() + l.slice(1) : null;

export default function MatchCard({
  match,
  max,
  onView,
}: {
  match: Match;
  max: number; // 100 for browse, 92 for session search
  onView?: (m: Match) => void;
}) {
  const pct = Math.round((match.score / max) * 100);
  const subtitle = [match.residence, levelLabel(match.level)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Avatar block + compatibility badge */}
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-primary/25 to-surface-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/15 text-primary">
          <IconUser size={20} />
        </div>
        <span className="absolute right-2 top-2 rounded-lg bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-contrast">
          {pct}%
        </span>
      </div>

      {/* Details */}
      <div className="px-2.5 pb-2.5 pt-2">
        <div className="truncate text-xs font-medium text-text">
          {match.name || "Member"}
        </div>
        {subtitle && (
          <div className="mb-1.5 truncate text-[10px] text-muted">{subtitle}</div>
        )}
        <div className="mb-2 flex items-start gap-1">
          <span className="mt-px flex-shrink-0 text-[9px] text-accent">✦</span>
          <span className="text-[10px] italic leading-snug text-muted">
            {reasonFor(match)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onView?.(match)}
          className="w-full rounded-lg bg-primary py-1.5 text-[10px] font-medium text-primary-contrast"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
