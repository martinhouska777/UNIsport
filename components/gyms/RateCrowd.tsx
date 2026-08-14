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

/*
  Compact rating for rows: gold star + THE GYM'S average and how many people
  rated it. This reads the gym's own rating — the same source the profile's
  "Ratings Breakdown" derives from — so the two can never contradict each other.
  (It used to show YOUR private rating here, which is why a gym could read "n/a"
  at the top while showing 4.6 / 4.8 / 4.4 bars at the bottom.)

  A gym nobody has rated renders NOTHING rather than a placeholder — the
  remaining stats close up and take the space.
*/
export function RatingValue({ value, count }: { value: number; count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-1">
      <IconStar size={13} className="text-accent" />
      <span className="text-text">{value.toFixed(1)}</span>
      <span className="text-muted/70">({count})</span>
    </span>
  );
}

/*
  Compact crowd for rows: person glyph + level. An unknown or stale crowd
  renders NOTHING — "how busy is it" with no answer is noise, and thirty of
  them across a list reads as "this app has no data".
*/
export function CrowdChip({
  crowd,
  showAgo = false,
}: {
  crowd: GymCrowd | null;
  showAgo?: boolean;
}) {
  if (!crowd) return null;
  return (
    <span className={`flex items-center gap-1 ${crowdTone(crowd.level)}`}>
      <IconUser size={12} /> {crowdLabel(crowd.level)}
      {showAgo && <span className="text-muted/70">· {timeAgo(crowd.at)}</span>}
    </span>
  );
}
