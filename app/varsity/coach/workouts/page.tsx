"use client";

/*
  Workouts tab of the Coach Console, in two halves (owner, 2026-09-19):

  • RESULTS — the team workouts and everyone's erg and water results, the same
    boards the athletes see under Team → Workouts. It took the place of the
    Notes tab; the Team tab next to it is now just the roster.
  • KILOMETRES — who trained and how far, a week at a time, added up from the
    boats themselves (components/varsity/coach/workouts/MileageScreen).

  The switch is the same one the Team tab uses for Team | Seat races, so the
  console has one way of showing two halves of a tab.
*/
import { useState } from "react";
import TeamScreen from "@/components/varsity/team/TeamScreen";
import MileageScreen from "@/components/varsity/coach/workouts/MileageScreen";

export default function CoachWorkoutsPage() {
  const [view, setView] = useState<"results" | "km">("results");

  return (
    <>
      <div className="mx-auto w-full max-w-screen-sm px-4 pt-4">
        <div className="flex overflow-hidden rounded-xl border border-border bg-surface">
          {(
            [
              ["results", "Results"],
              ["km", "Kilometres"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
                view === k ? "bg-text text-background" : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "km" ? <MileageScreen /> : <TeamScreen only="workouts" inConsole />}
    </>
  );
}
