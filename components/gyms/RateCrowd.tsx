"use client";

/*
  Shared rating + crowd UI, reused by the gyms list, the gym profile, and the
  post-workout check-in prompt. All color is theme tokens (rule 1): gold stars
  (text-accent) and the green→gold→amber→red crowd tones from CROWD_LEVELS.
*/
import {
  CROWD_LEVELS,
  crowdLabel,
  crowdTone,
  timeAgo,
  type CrowdLevel,
  type GymCrowd,
  type GymRating,
} from "@/lib/gymSocial";
import { IconStar, IconUser } from "@/components/icons";

// Five stars. Tappable when `onRate` is given; read-only (just a display) when not.
export function StarRater({
  value,
  onRate,
  size = 22,
}: {
  value: number;
  onRate?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onRate}
          onClick={() => onRate?.(n)}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          className={`${n <= value ? "text-accent" : "text-muted/30"} ${
            onRate ? "active:scale-95" : "cursor-default"
          }`}
        >
          <IconStar size={size} />
        </button>
      ))}
    </div>
  );
}

// Four "how busy right now" buttons; the current fresh report is highlighted.
export function CrowdPicker({
  value,
  onReport,
}: {
  value: CrowdLevel | null;
  onReport: (level: CrowdLevel) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {CROWD_LEVELS.map((c) => {
        const active = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onReport(c.key)}
            aria-pressed={active}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-[11px] font-semibold ${
              active ? `border-current bg-surface-2 ${c.tone}` : "border-border bg-surface text-muted"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-current" : "bg-border"}`} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// Compact rating for rows: gold star + value (or "n/a"), optional "· 2d ago".
export function RatingValue({
  rating,
  showAgo = false,
}: {
  rating: GymRating | null;
  showAgo?: boolean;
}) {
  return (
    <span className="flex items-center gap-1">
      <IconStar size={13} className={rating ? "text-accent" : "text-muted"} />
      <span className={rating ? "text-text" : "text-muted"}>
        {rating ? rating.value.toFixed(1) : "n/a"}
      </span>
      {rating && showAgo && <span className="text-muted/70">· {timeAgo(rating.at)}</span>}
    </span>
  );
}

// Compact crowd for rows: person glyph + level (toned), or a muted "n/a".
export function CrowdChip({
  crowd,
  showAgo = false,
}: {
  crowd: GymCrowd | null;
  showAgo?: boolean;
}) {
  if (!crowd) {
    return (
      <span className="flex items-center gap-1 text-muted">
        <IconUser size={12} /> n/a
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1 ${crowdTone(crowd.level)}`}>
      <IconUser size={12} /> {crowdLabel(crowd.level)}
      {showAgo && <span className="text-muted/70">· {timeAgo(crowd.at)}</span>}
    </span>
  );
}
