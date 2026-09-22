"use client";

/*
  HOUSE VS HOUSE — the duels, on the Events tab.
  ---------------------------------------------------------------------------
  A ranked table of twelve houses told you where everybody stood and gave
  nobody anything to do. This is the same competition cut into fights: every
  house that is in is drawn against ONE other house, both chase the same
  finish line, and the first over it wins (the rules, and the draw, are
  lib/duels.ts).

  YOUR DUEL IS THE SCREEN. It sits at the top, opened out — two crests, two
  bars, the gap between them — and the other fixtures follow underneath as one
  line each, because they are gossip and yours is the fight. Houses that have
  not qualified come last, with the number of people they still need.

  The numbers are real: kilometres, sessions and new people come from
  db/events.sql, points from the month's campus board — the same two reads the
  rest of this tab already makes. Colours are theme tokens; a house's own
  colours are DATA from lib/gyms.ts, applied inline (rule 1's exception).
*/
import { useEffect, useState } from "react";
import { HouseShield, IconTrophy } from "@/components/icons";
import { useProfileData } from "@/components/profile/useProfileData";
import { houses } from "@/lib/onboarding";
import { fetchPeopleBoard, groupLabel, houseCrest, type LeaderRow } from "@/lib/leaderboards";
import {
  INTERHOUSE,
  interhouseStandings,
  monthEndsLabel,
  monthNumber,
  monthStartIso,
} from "@/lib/events";
import { drawDuels, duelNow, duelResult } from "@/lib/duels";
import { fetchHouseEventCounts, type HouseCounts } from "@/lib/supabase/events";

/** A number as it is written on a row: "128 km", "600 pts". */
const amount = (n: number, unit: string) =>
  `${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(1)} ${unit}`;

/* One house inside a duel: crest, name, its bar, its number. */
function Side({
  houseKey,
  value,
  target,
  unit,
  won,
  mine,
  big,
}: {
  houseKey: string;
  value: number;
  target: number;
  unit: string;
  won: boolean;
  mine: boolean;
  big?: boolean;
}) {
  const crest = houseCrest(houseKey);
  // Never a bar of nothing: a house on zero still gets a sliver, so the row
  // reads as a lane it has not run yet rather than as missing data.
  const pct = Math.max(2, Math.min(100, (value / target) * 100));
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {crest ? (
          <HouseShield primary={crest.primary} secondary={crest.secondary} size={big ? 26 : 20} />
        ) : (
          <span className="h-5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
        )}
        <span
          className={`min-w-0 flex-1 truncate ${big ? "text-[14px]" : "text-[12px]"} ${
            mine ? "font-semibold text-text" : "font-medium text-text"
          }`}
        >
          {groupLabel("house", houseKey)}
        </span>
        {won && (
          <span className="flex-shrink-0 text-accent">
            <IconTrophy size={big ? 15 : 12} />
          </span>
        )}
        <span
          className={`flex-shrink-0 tabular-nums text-text ${
            big ? "text-[14px] font-semibold" : "text-[12px] font-medium"
          }`}
        >
          {amount(value, unit)}
        </span>
      </div>
      <div className={`${big ? "mt-2" : "mt-1.5"} h-2 overflow-hidden rounded-full bg-surface-2`}>
        <div
          className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%`, background: crest?.primary ?? "var(--primary)" }}
        />
      </div>
    </div>
  );
}

export default function HouseDuels() {
  const { data: profile } = useProfileData();
  const myHouse = typeof profile?.residence === "string" ? profile.residence : null;
  const [people, setPeople] = useState<LeaderRow[] | null>(null);
  const [counts, setCounts] = useState<HouseCounts[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPeopleBoard("campus", "month", 10000).catch(() => [] as LeaderRow[]),
      fetchHouseEventCounts(monthStartIso(), houses).catch(() => [] as HouseCounts[]),
    ]).then(([p, c]) => {
      if (!active) return;
      setPeople(p);
      setCounts(c);
    });
    return () => {
      active = false;
    };
  }, []);

  const discipline = duelNow();
  const standings = interhouseStandings(people ?? [], houses, myHouse);
  const inKeys = standings.filter((h) => h.inRace).map((h) => h.key);
  const { duels, bye } = drawDuels(inKeys, monthNumber());

  const byKey = new Map((counts ?? []).map((c) => [c.key, c]));
  const scoreOf = new Map(standings.map((h) => [h.key, h.score]));

  /* The one number this round is fought over, for one house. */
  const valueOf = (key: string): number => {
    const c = byKey.get(key)?.counts;
    switch (discipline.key) {
      case "points":
        return scoreOf.get(key) ?? 0;
      case "distance":
        return Math.round((c?.distance ?? 0) * 10) / 10;
      case "newPeople":
        return c?.newPartners ?? 0;
      case "sessions":
        return (c?.gymSessions ?? 0) + (c?.cardioSessions ?? 0);
    }
  };

  // Yours first — the rest are somebody else's fight.
  const ordered = [...duels].sort(
    (x, y) =>
      Number(y.a === myHouse || y.b === myHouse) - Number(x.a === myHouse || x.b === myHouse),
  );
  const waiting = standings.filter((h) => !h.inRace);
  const loading = people === null || counts === null;

  return (
    <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[14px] font-semibold text-text">{discipline.title}</div>
        <div className="flex-shrink-0 text-[11px] text-muted">{monthEndsLabel()}</div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-[12px] text-muted">Counting…</div>
      ) : (
        <>
          {ordered.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {ordered.map((d, i) => {
                const a = { key: d.a, value: valueOf(d.a) };
                const b = { key: d.b, value: valueOf(d.b) };
                const { winner, leader, gap } = duelResult(a, b, discipline.target);
                const mine = d.a === myHouse || d.b === myHouse;
                /*
                  The first card is opened out: yours when you have one, and
                  otherwise the first fixture — so the section always leads
                  with a duel rather than with a list of them.
                */
                const big = i === 0;
                return (
                  <div
                    key={`${d.a}-${d.b}`}
                    className={`rounded-xl border px-3 py-2.5 ${
                      mine ? "border-primary bg-primary-tint" : "border-border bg-surface"
                    }`}
                  >
                    {big ? (
                      <div className="flex flex-col gap-2.5">
                        <Side
                          houseKey={a.key}
                          value={a.value}
                          target={discipline.target}
                          unit={discipline.unit}
                          won={winner === a.key}
                          mine={a.key === myHouse}
                          big
                        />
                        <Side
                          houseKey={b.key}
                          value={b.value}
                          target={discipline.target}
                          unit={discipline.unit}
                          won={winner === b.key}
                          mine={b.key === myHouse}
                          big
                        />
                        <div className="text-[11px] text-muted">
                          {winner
                            ? `${groupLabel("house", winner)} won it.`
                            : leader
                              ? `${groupLabel("house", leader)} by ${amount(gap, discipline.unit)}.`
                              : "Level."}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Side
                          houseKey={a.key}
                          value={a.value}
                          target={discipline.target}
                          unit={discipline.unit}
                          won={winner === a.key}
                          mine={a.key === myHouse}
                        />
                        <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.08em] text-muted">
                          vs
                        </span>
                        <Side
                          houseKey={b.key}
                          value={b.value}
                          target={discipline.target}
                          unit={discipline.unit}
                          won={winner === b.key}
                          mine={b.key === myHouse}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {bye && (
            <div className="mt-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-[12px] text-muted">
              <span className="text-text">{groupLabel("house", bye)}</span> drew nobody this month.
            </div>
          )}

          {waiting.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {waiting.map((h) => (
                <span
                  key={h.key}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    h.isMine ? "border-primary text-primary" : "border-border text-muted"
                  }`}
                >
                  {groupLabel("house", h.key)} · {INTERHOUSE.minMembers - h.qualified} more
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
