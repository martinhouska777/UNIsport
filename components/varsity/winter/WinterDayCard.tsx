"use client";

/*
  ONE DAY OF WINTER POINTS: the sessions, what each scored, and why one scored
  nothing (No heart rate, Under 60 min, 4th this week). The standings draw it
  for a person's week; the Calendar draws it under a day's sessions.
*/
import { fmtDay, fmtNum, fmtPoints, type DayScore, type SessionScore, type Tag } from "@/lib/varsity/winterPoints";

/* A team's or an activity's colour (content colour, from the event's data). */
export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} />;
}

export function Tags({ tags }: { tags: Tag[] }) {
  if (!tags.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {tags.map((t, i) => (
        <span
          key={i}
          className={`whitespace-nowrap rounded-full border bg-surface px-[7px] py-px text-[11px] font-semibold leading-[1.5] ${
            t.bad ? "border-danger text-danger" : "border-border text-text"
          }`}
        >
          {t.label}
        </span>
      ))}
    </span>
  );
}

const amount = (s: SessionScore) =>
  s.act.per === "km"
    ? s.log.metres
      ? `${fmtNum(s.log.metres / 1000)} km`
      : ""
    : s.log.minutes
      ? `${s.log.minutes} min`
      : "";

export default function WinterDayCard({ day, head = true }: { day: DayScore; head?: boolean }) {
  const dayTags: Tag[] = [];
  if (day.sessions.length) {
    if (!day.counted && day.total > 0) dayTags.push({ label: "Not counted", bad: false });
    else if (day.capped) dayTags.push({ label: "Daily cap", bad: false });
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-border">
      {(head || dayTags.length > 0) && (
        <div className="flex min-h-[48px] items-center gap-2.5 px-4 py-2.5">
          {head && <span className="text-[15px] font-bold text-text">{fmtDay(day.date)}</span>}
          <span className="min-w-0 flex-1">
            <Tags tags={dayTags} />
          </span>
          {head && day.sessions.length > 0 && (
            <span className="text-[15px] font-bold tabular-nums text-text">{fmtPoints(day.total)}</span>
          )}
        </div>
      )}
      {day.sessions.map((s) => {
        const am = amount(s);
        return (
          <div key={s.log.id} className="flex min-h-[44px] items-center gap-3 px-4 py-2">
            <Dot color={s.act.color} />
            <span className="min-w-0 flex-1">
              <span className="text-[14px] text-text">{s.act.name}</span>
              {am && <span className="ml-1 text-[13px] text-text">{am}</span>}
              <Tags tags={s.tags} />
            </span>
            <span className="text-[14px] font-semibold tabular-nums text-text">{fmtPoints(s.pts)}</span>
          </div>
        );
      })}
    </div>
  );
}
