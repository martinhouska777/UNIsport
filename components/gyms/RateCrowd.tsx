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
  crowdPeople,
  crowdSentence,
  crowdSummary,
  type CrowdLevel,
  type GymCrowd,
} from "@/lib/gymSocial";
import { predictedLabel, predictedLevel, nextHours } from "@/lib/gymBusyness";
import type { GymKind } from "@/lib/gyms";
import type { Clock } from "@/lib/gymHours";
import { useState } from "react";
import { IconStar, IconUser } from "@/components/icons";

/*
  Five stars. Tappable when `onRate` is given; read-only (just a display) when
  not. Rating something is one of the two taps in the app worth celebrating, so
  the stars fill in SEQUENCE rather than all at once — `rated` holds the value
  you just chose (not the saved value), which is what keeps the animation from
  replaying every time this re-renders with a rating already on it.
*/
export function StarRater({
  value,
  onRate,
  size = 22,
}: {
  value: number;
  onRate?: (n: number) => void;
  size?: number;
}) {
  const [rated, setRated] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onRate}
          onClick={() => {
            setRated(n);
            onRate?.(n);
          }}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          className={`tap44 press-icon ${n <= value ? "text-accent" : "text-text-3"} ${
            onRate ? "" : "cursor-default"
          }`}
        >
          <span
            key={`${rated}-${n <= value}`}
            className={rated > 0 && n <= rated ? "react-star block" : "block"}
            style={rated > 0 && n <= rated ? { animationDelay: `${(n - 1) * 45}ms` } : undefined}
          >
            <IconStar size={size} />
          </span>
        </button>
      ))}
    </div>
  );
}

// Four "how busy right now" buttons. The highlighted one is YOUR OWN current
// answer (not the campus's) — the campus's answer is the sentence above them.
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
  Compact rating for rows: gold star + an average and how many people gave it.
  PARKED — not rendered anywhere right now. The only averages the app has are
  the placeholder numbers in lib/gyms.ts, and showing "4.8 (142)" on a real gym
  nobody has rated is a claim nobody made. This comes back the day real ratings
  exist; the display already refuses to draw when `count` is zero.
*/
export function RatingValue({ value, count }: { value: number; count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-1">
      <IconStar size={13} className="text-accent" />
      <span className="text-text">{value.toFixed(1)}</span>
      <span className="text-text-3">({count})</span>
    </span>
  );
}

/*
  Compact crowd for rows: person glyph + level + HOW MANY said so ("Busy · 2
  people"). The count is not decoration — one voice and twelve voices are
  different facts, and a card that hid the number was claiming the campus had
  spoken when one person had. The full sentence rides in the title / aria-label
  for anyone who wants the "when". An unknown or stale crowd renders NOTHING —
  "how busy is it" with no answer is noise, and thirty of them across a list
  reads as "this app has no data".
*/
export function CrowdChip({ crowd }: { crowd: GymCrowd | null }) {
  if (!crowd) return null;
  const summary = crowdSummary(crowd);
  return (
    <span
      className={`flex items-center gap-1 ${crowdTone(crowd.level)}`}
      title={summary}
      aria-label={summary}
    >
      <IconUser size={12} /> {crowdLabel(crowd.level)}
      <span className="text-text-3">· {crowdPeople(crowd)}</span>
    </span>
  );
}

/*
  The honest sentence for a gym page: "2 people said Busy in the last hour" /
  "1 person said Quiet 20 min ago". Only the level word is coloured, so the
  eye lands on the answer and the sample size stays legible beside it.
*/
export function CrowdSentence({ crowd }: { crowd: GymCrowd }) {
  const s = crowdSentence(crowd);
  return (
    <span className="text-text-2">
      {s.who} <span className={`font-medium ${crowdTone(crowd.level)}`}>{s.level}</span> {s.when}
    </span>
  );
}

/*
  What it's USUALLY like at this hour, for the rows where nobody has reported.
  Deliberately muted rather than green/amber/red: colour on this line would make
  a guess look like the live reading above it. Nothing is drawn until the browser
  knows the time, and nothing is drawn for a gym with a fresh report — that one
  shows CrowdChip instead.
*/
export function PredictedChip({ kind, now }: { kind: GymKind; now: Clock | null }) {
  if (!now) return null;
  const level = predictedLevel(kind, now.weekday, Math.floor(now.minutes / 60));
  return (
    <span className="flex items-center gap-1 text-text-3">
      <IconUser size={12} /> {predictedLabel(level)}
    </span>
  );
}

/*
  The next six hours as bars — "come back at nine". Same muted treatment and the
  same source as PredictedChip, so the row and the chip can never disagree. The
  current hour is marked so you can see where you're standing on it.
*/
export function BusyBars({ kind, now }: { kind: GymKind; now: Clock | null }) {
  if (!now) return null;
  const fromHour = Math.floor(now.minutes / 60);
  return (
    <div className="flex items-end gap-1.5">
      {nextHours(kind, now.weekday, fromHour).map((h, i) => (
        <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
          <span className="flex h-8 w-full items-end">
            <span
              className={`w-full rounded-sm ${i === 0 ? "bg-text-3" : "bg-border"}`}
              style={{ height: `${Math.round(h.height * 100)}%` }}
            />
          </span>
          <span className={`text-[10px] ${i === 0 ? "text-text-2" : "text-text-3"}`}>{h.label}</span>
        </div>
      ))}
    </div>
  );
}
