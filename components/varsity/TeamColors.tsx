"use client";

/*
  Paints the squad's own training colours onto every screen under it — the
  colours the coach picks in Training settings (see lib/varsity/teamColors.ts).
  Mounted by both shells: the athlete's and the Coach Console's (which also
  shows a teammate's calendar).

  The last colours seen for this team are applied in the SAME render, before
  any screen draws, so a returning athlete never sees the old palette flash.
  Only when the database answers with something different (first visit, or
  the coach just changed a colour) are the screens remounted to pick it up.
*/
import { useEffect, useState } from "react";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import {
  applyTeamColors,
  cacheTeamColors,
  readCachedTeamColors,
  teamColorMap,
} from "@/lib/varsity/teamColors";

export default function TeamColors({ teamId, children }: { teamId: string; children: React.ReactNode }) {
  const [seen, setSeen] = useState<{ teamId: string; json: string } | null>(null);

  // Same-render seed from the cache (React's adjust-state-on-change pattern).
  if (seen?.teamId !== teamId) {
    const cached = readCachedTeamColors(teamId);
    applyTeamColors(cached);
    setSeen({ teamId, json: JSON.stringify(cached) });
  }

  useEffect(() => {
    let active = true;
    fetchTrainingConfig(teamId).then((cfg) => {
      if (!active) return;
      const map = teamColorMap(cfg);
      const json = JSON.stringify(map);
      cacheTeamColors(teamId, map);
      applyTeamColors(map);
      setSeen({ teamId, json });
    });
    return () => {
      active = false;
    };
  }, [teamId]);

  // Keyed by the colours themselves: an unchanged answer keeps every screen
  // mounted; a changed one redraws them in the new colours.
  return (
    <div key={seen?.json ?? "shipped"} className="contents">
      {children}
    </div>
  );
}
