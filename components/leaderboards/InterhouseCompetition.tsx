"use client";

/*
  HOUSE VS HOUSE — the interhouse competition, under the challenges on the
  Events tab (owner, 2026-09-15).
  ---------------------------------------------------------------------------
  The rules are data (INTERHOUSE in lib/events.ts): a house is IN once
  `minMembers` of its people have at least `qualifyPoints` this month, and its
  score is the points of its top `countedMembers` people — the same number for
  every house, so a big house can't win on size.

  Houses that are in are ranked, top three with a medal. Houses that aren't
  stay on the list with how many of their people have qualified so far,
  because a door with a number on it is a reason to drag a friend in.

  It is built from the month's campus board (the same read the Rankings tab
  uses), so it needs no database of its own. Colours are theme tokens; a
  house's colours are data from lib/gyms.ts, applied inline (rule 1's
  exception).
*/
import { useEffect, useState } from "react";
import { HouseShield } from "@/components/icons";
import Medal from "@/components/leaderboards/Medal";
import { useProfileData } from "@/components/profile/useProfileData";
import { houses } from "@/lib/onboarding";
import { fetchPeopleBoard, groupLabel, houseCrest, type LeaderRow } from "@/lib/leaderboards";
import { INTERHOUSE, interhouseStandings, monthEndsLabel } from "@/lib/events";

export default function InterhouseCompetition() {
  const { data: profile } = useProfileData();
  const myHouse = typeof profile?.residence === "string" ? profile.residence : null;
  const [people, setPeople] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    let active = true;
    // Everyone who scored this month — the board already leaves out zeros.
    fetchPeopleBoard("campus", "month", 10000)
      .then((rows) => active && setPeople(rows))
      .catch(() => active && setPeople([]));
    return () => {
      active = false;
    };
  }, []);

  const standings = interhouseStandings(people ?? [], houses, myHouse);
  const racing = standings.filter((h) => h.inRace);
  const waiting = standings.filter((h) => !h.inRace);

  return (
    <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[14px] font-semibold text-text">This month</div>
        <div className="flex-shrink-0 text-[11px] text-muted">{monthEndsLabel()}</div>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        A house is in once {INTERHOUSE.minMembers} of its people have {INTERHOUSE.qualifyPoints}+ pts
        this month. Its score is its top {INTERHOUSE.countedMembers} people&rsquo;s points.
      </p>

      {people === null ? (
        <div className="py-6 text-center text-[12px] text-muted">Counting…</div>
      ) : (
        <>
          {racing.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-1.5">
              {racing.map((h) => {
                const crest = houseCrest(h.key);
                return (
                  <div
                    key={h.key}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                      h.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
                    }`}
                    style={
                      crest
                        ? {
                            background: `${crest.primary}${h.isMine ? "24" : "14"}`,
                            ...(h.isMine ? {} : { borderColor: `${crest.primary}66` }),
                          }
                        : undefined
                    }
                  >
                    {h.rank && h.rank <= 3 ? (
                      <Medal place={h.rank as 1 | 2 | 3} rank={h.rank} size={28} />
                    ) : (
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-semibold text-muted">
                        {h.rank}
                      </span>
                    )}
                    {crest && <HouseShield primary={crest.primary} secondary={crest.secondary} size={28} />}
                    <div className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                      {groupLabel("house", h.key)}
                      {h.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[15px] font-semibold leading-none text-text">
                        {h.score.toLocaleString("en-US")}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.08em] text-muted">pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {waiting.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-medium text-muted">
                {racing.length === 0 ? "No house is in yet" : "Not in yet"}
              </div>
              <ul className="flex flex-col gap-2">
                {waiting.map((h) => {
                  const crest = houseCrest(h.key);
                  const share = Math.min(h.qualified / INTERHOUSE.minMembers, 1);
                  return (
                    <li key={h.key} className="flex items-center gap-2.5">
                      {crest && <HouseShield primary={crest.primary} secondary={crest.secondary} size={20} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 text-[12px]">
                          <span
                            className={`min-w-0 flex-1 truncate ${h.isMine ? "font-medium text-text" : "text-text"}`}
                          >
                            {groupLabel("house", h.key)}
                            {h.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
                          </span>
                          <span className="flex-shrink-0 tabular-nums text-muted">
                            {h.qualified} of {INTERHOUSE.minMembers}
                          </span>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-sm bg-border">
                          <span
                            className="block h-full rounded-sm bg-accent"
                            style={{
                              width: `${Math.round(share * 100)}%`,
                              ...(crest ? { background: crest.primary } : {}),
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
