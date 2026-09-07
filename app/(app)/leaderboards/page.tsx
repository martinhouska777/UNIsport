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
import { IconInfo } from "@/components/icons";
import HonorCode, { HonorCodeFooter, useHonorCode } from "@/components/leaderboards/HonorCode";
import HowItWorks from "@/components/leaderboards/HowItWorks";
import { HouseChallenges, YouChallenges } from "@/components/leaderboards/ChallengesSection";
import BoardsSection from "@/components/leaderboards/BoardsSection";
import EventsSection from "@/components/leaderboards/EventsSection";
import { Segmented } from "@/components/leaderboards/pieces";
import { emptyLeague, fetchLeague, type LeagueData } from "@/lib/league";

type Section = "challenges" | "rankings" | "events";
type Side = "you" | "house";

/*
  Three, in the order you meet them: what you are chasing, where you stand,
  and what has a deadline on it. The campus statistics are not a fourth tab —
  nobody opens an app to read them, so they sit behind the chart icon on
  Rankings, where the question actually occurs to people.
*/
const SECTIONS: { key: Section; label: string }[] = [
  { key: "challenges", label: "Challenges" },
  { key: "rankings", label: "Rankings" },
  { key: "events", label: "Events" },
];

export default function LeaguePage() {
  const { userId, universityKey } = useAppState();
  const { accepted, accept } = useHonorCode(userId);

  const [section, setSection] = useState<Section>("challenges");
  const [side, setSide] = useState<Side>("you");
  const [explaining, setExplaining] = useState(false);
  const [data, setData] = useState<LeagueData | null>(null);

  useEffect(() => {
    let active = true;
    fetchLeague(universityKey)
      .then((d) => active && setData(d))
      // A failed read must still settle, or every section says "Counting…"
      // forever with no way to tell that anything went wrong.
      .catch(() => active && setData(emptyLeague()));
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
        <div className="mb-2.5 flex items-center justify-between">
          {/* A spacer the same width as the button, so the title stays centred. */}
          <span className="w-7" aria-hidden="true" />
          <span className="text-sm font-medium text-text">League</span>
          <button
            type="button"
            onClick={() => setExplaining(true)}
            aria-label="How the League works"
            className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconInfo size={14} />
          </button>
        </div>
        <Segmented value={section} options={SECTIONS} onChange={setSection} />
      </div>

      {explaining && (
        <HowItWorks universityKey={universityKey} onClose={() => setExplaining(false)} />
      )}

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
            <YouChallenges
              me={me}
              now={data?.now ?? null}
              universityKey={universityKey}
              campusRank={campusRank}
            />
          ) : (
            <HouseChallenges
              house={myHouse}
              universityKey={universityKey}
              residence={me?.residence ?? null}
            />
          )}
        </>
      )}

      {section === "events" && (
        <EventsSection
          week={data?.week.mine ?? null}
          month={data?.month.mine ?? null}
          houses={data?.week.houses ?? null}
          residence={me?.residence ?? null}
        />
      )}

      {section === "rankings" && (
        <BoardsSection
          people={data?.people ?? null}
          houses={data?.houses ?? null}
          stats={data?.stats ?? null}
          universityKey={universityKey}
          userId={userId}
          residence={me?.residence ?? null}
        />
      )}


      {/* The rules now live behind the ⓘ in the corner, where they can be
          complete instead of a six-line summary under every screen. */}
      <div className="mt-4 px-3.5">
        <button
          type="button"
          onClick={() => setExplaining(true)}
          className="tap44 w-full text-center text-[12px] font-medium text-primary"
        >
          How the League works
        </button>
      </div>

      <div className="mt-3 px-3.5">
        <HonorCodeFooter universityKey={universityKey} />
      </div>
    </div>
  );
}
