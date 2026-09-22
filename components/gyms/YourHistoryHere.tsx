"use client";

/*
  "You've trained here 9 times" — the gym page saying something back to you.

  Every number is read out of YOUR OWN logged sessions (lib/supabase/workouts
  gymHistory), matched to this gym by name. Nothing is invented and nothing is
  anybody else's: this is the one part of the page that is about you.

  Before you have logged anything here the block still draws — an empty gym
  page was the reason this exists — with the count at zero.
*/
import { useEffect, useState } from "react";
import { gymHistory, type GymHistory } from "@/lib/supabase/workouts";
import { dateLabel } from "@/lib/schedule";

export default function YourHistoryHere({
  userId,
  gymName,
}: {
  userId: string | null;
  gymName: string;
}) {
  const [history, setHistory] = useState<GymHistory | null>(null);

  useEffect(() => {
    let active = true;
    gymHistory(userId ?? "", gymName).then((h) => {
      if (active) setHistory(h);
    });
    return () => {
      active = false;
    };
  }, [userId, gymName]);

  // Nothing at all until the read lands, so the block never flashes "0 times"
  // at somebody who trains here every day.
  if (!history) return null;

  const { count, last, partners } = history;
  return (
    <div className="border-b border-border px-3.5 py-3.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Your sessions here
      </h2>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text">{count}</span>
        <span className="text-[13px] text-muted">
          {count === 1 ? "session logged" : "sessions logged"}
        </span>
      </div>
      {last && (
        <div className="mt-1 text-[13px] text-muted">Last one {dateLabel(last)}</div>
      )}
      {partners.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {partners.slice(0, 6).map((p) => (
            <span
              key={p.name}
              className="rounded-full border border-primary-line bg-primary-tint px-2.5 py-1 text-[11px] text-text"
            >
              {p.name}
              {p.count > 1 && <span className="text-muted"> · {p.count}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
