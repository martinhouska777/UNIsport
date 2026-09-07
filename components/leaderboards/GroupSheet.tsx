"use client";

/*
  INSIDE ONE HOUSE — who actually earned its points.
  ---------------------------------------------------------------------------
  A house's score is not the house's: it is the sum of what the people living
  there logged, divided by how many of them there are. So the row on the team
  board opens, and this is what is underneath — the same people, ranked by what
  each of them put in.

  That is the whole argument for it. A number you cannot look inside is a
  number you have to take on trust, and "we're fourth" means something quite
  different once you can see it came from three people out of forty. It is also
  the only screen in the app that says, without saying it, "we need more of you
  logging" — which is the thing the interhouse competition will be gated on.

  ANY house, not just yours. There is no reason to hide Kirkland's table from
  somebody in Adams; the rivalry is the point.

  Same chrome as the other sheets on this screen. Colors are theme tokens; the
  one exception is the house's own identity colour, which is DATA in
  lib/gyms.ts, applied inline (rule 1's content-colour exception).
*/
import { useEffect, useState } from "react";
import { IconX } from "@/components/icons";
import { pointsLabel, sessionsOf } from "@/lib/points";
import {
  fetchPeopleBoard,
  groupLabel,
  houseColor,
  type GroupRow,
  type LeaderRow,
  type Period,
} from "@/lib/leaderboards";
import { classYearLabel } from "@/lib/onboarding";

export default function GroupSheet({
  row,
  kind,
  period,
  periodLabel,
  onClose,
}: {
  row: GroupRow;
  kind: "house" | "year";
  period: Period;
  /** "This month" — so the sheet can say what window it is counting. */
  periodLabel: string;
  onClose: () => void;
}) {
  const [people, setPeople] = useState<LeaderRow[] | null>(null);
  const tint = kind === "house" ? houseColor(row.key) : null;

  useEffect(() => {
    let active = true;
    fetchPeopleBoard("campus", period, 100, row.key)
      .then((rows) => active && setPeople(rows))
      // A failed read must still settle, or it says "Counting…" forever.
      .catch(() => active && setPeople([]));
    return () => {
      active = false;
    };
  }, [row.key, period]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative flex max-h-[85%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-9 w-1.5 flex-shrink-0 rounded-full bg-primary"
                style={tint ? { background: tint } : undefined}
              />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium text-text">
                  {groupLabel(kind, row.key)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  #{row.rank} · {row.avgPoints.toFixed(1)} per member ·{" "}
                  {periodLabel.toLowerCase()}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {/* Where the number on the board came from, in one line. */}
          <div className="mb-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
            <span className="text-text">{pointsLabel(row.points)}</span> from{" "}
            <span className="text-text">
              {row.actives} of {row.members}
            </span>{" "}
            {row.members === 1 ? "member" : "members"} training
            {row.actives < row.members && (
              <>
                {" "}
                — the score is divided by all {row.members}, so the fastest way up the
                board is more of them logging.
              </>
            )}
          </div>

          {people === null ? (
            <div className="px-4 py-12 text-center text-[12px] text-muted">Counting…</div>
          ) : people.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] text-muted">
              Nobody here has logged a session in this period.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {people.map((p) => {
                const sessions = sessionsOf(p.kinds);
                // Their share of what the house scored — the actual question
                // this screen exists to answer.
                const share = row.points > 0 ? Math.round((p.score / row.points) * 100) : 0;
                return (
                  <div
                    key={p.userId}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                      p.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
                        p.rank <= 3 ? "bg-accent-tint text-accent" : "text-muted"
                      }`}
                    >
                      {p.rank}
                    </span>
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[11px] font-semibold text-primary">
                      {p.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-text">
                        {p.name}
                        {p.isMe && <span className="ml-1.5 text-[11px] text-primary">You</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {[
                          p.classYear ? classYearLabel(p.classYear) : "",
                          `${sessions} session${sessions === 1 ? "" : "s"}`,
                          share > 0 ? `${share}% of the total` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[15px] font-semibold leading-none text-text">
                        {p.score.toLocaleString("en-US")}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.08em] text-muted">
                        pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
