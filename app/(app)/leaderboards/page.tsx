"use client";

/*
  THE LEAGUE — three sections behind one switch.
  ---------------------------------------------------------------------------
    CHALLENGES    you | your house — each with its level on top of its ladder.
                  This is the tab that answers "what do I do tonight", so it
                  opens first.
    LEADERBOARDS  who is doing what: the all-time level boards, and the session
                  boards that reset.
    STATISTICS    the whole campus as one number set, not you.

  ONE ROUND OF READS. Everything on this screen — your level, the people board,
  every house and year level, and the campus statistics — is worked out from a
  single read of the per-person counters plus two small group reads. The
  sections are views of one loaded moment, not four separate queries.

  Colors are theme tokens (rule 1). The only per-item colors are each house's
  identity color, which lives in lib/gyms.ts as DATA and is applied inline.
*/
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/components/AppState";
import HonorCode, { HonorCodeFooter, useHonorCode } from "@/components/leaderboards/HonorCode";
import { HouseChallenges, YouChallenges } from "@/components/leaderboards/ChallengesSection";
import BoardsSection from "@/components/leaderboards/BoardsSection";
import CampusStatsSection from "@/components/leaderboards/CampusStats";
import { Segmented } from "@/components/leaderboards/pieces";
import { schoolShortName } from "@/lib/honorCode";
import { fetchLeague, type LeagueData } from "@/lib/league";

type Section = "challenges" | "boards" | "stats";
type Side = "you" | "house";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "challenges", label: "Challenges" },
  { key: "boards", label: "Leaderboards" },
  { key: "stats", label: "Statistics" },
];

export default function LeaguePage() {
  const { userId, universityKey } = useAppState();
  const { accepted, accept } = useHonorCode(userId);

  const [section, setSection] = useState<Section>("challenges");
  const [side, setSide] = useState<Side>("you");
  const [data, setData] = useState<LeagueData | null>(null);

  useEffect(() => {
    let active = true;
    fetchLeague(universityKey)
      .then((d) => active && setData(d))
      // A failed read must still settle, or every section says "Counting…"
      // forever with no way to tell that anything went wrong.
      .catch(
        () =>
          active &&
          setData({
            me: null,
            people: [],
            houses: [],
            years: [],
            stats: {
              people: 0,
              sessions: 0,
              withPartner: 0,
              km: 0,
              partnerships: 0,
              topLevel: 1,
              busiestHouse: null,
              avgSessions: 0,
              totalXp: 0,
            },
          }),
      );
    return () => {
      active = false;
    };
  }, [universityKey, userId]);

  const me = data?.me ?? null;
  const myHouse = useMemo(
    () => data?.houses.find((h) => h.key === me?.residence) ?? null,
    [data, me],
  );
  // A rank is only worth showing to somebody who is actually on the board.
  // "#74 on campus" for a person who has logged nothing is a discouraging lie.
  const campusRank = me && me.counters.sessions > 0 ? me.rank : null;

  // Hooks are all above this line, so the honour code can gate the screen.
  if (accepted === false) {
    return <HonorCode universityKey={universityKey} onAgree={accept} />;
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3.5 py-3">
        <div className="mb-2.5 text-center text-sm font-medium text-text">League</div>
        <Segmented value={section} options={SECTIONS} onChange={setSection} />
      </div>

      {section === "challenges" && (
        <>
          <div className="border-b border-border px-3.5 py-2.5">
            <Segmented
              value={side}
              onChange={setSide}
              options={[
                { key: "you", label: "You" },
                { key: "house", label: "Your house" },
              ]}
            />
          </div>
          {side === "you" ? (
            <YouChallenges me={me} universityKey={universityKey} campusRank={campusRank} />
          ) : (
            <HouseChallenges
              house={myHouse}
              universityKey={universityKey}
              residence={me?.residence ?? null}
            />
          )}
        </>
      )}

      {section === "boards" && (
        <BoardsSection
          people={data?.people ?? null}
          houses={data?.houses ?? null}
          years={data?.years ?? null}
          universityKey={universityKey}
          userId={userId}
        />
      )}

      {section === "stats" && (
        <CampusStatsSection
          stats={data?.stats ?? null}
          schoolName={schoolShortName(universityKey)}
        />
      )}

      {/* How it works — said once, plainly, so nobody has to guess. */}
      <div className="mt-4 px-3.5">
        <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How it works
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted">
            <li>Every session earns XP. A single day counts twice at most.</li>
            <li>Training with someone is worth more. Someone new is worth most of all.</li>
            <li>Finishing a challenge pays XP too, and each level costs more than the last.</li>
            <li>Everything you earn also counts for your house.</li>
            <li>Levels and challenges never reset. The session boards do, every month.</li>
            <li>Only names, houses, years and totals are ever shown — never anyone&rsquo;s workouts.</li>
          </ul>
        </div>
      </div>

      <div className="mt-3 px-3.5">
        <HonorCodeFooter universityKey={universityKey} />
      </div>
    </div>
  );
}
