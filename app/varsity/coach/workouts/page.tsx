"use client";

/*
  Workouts tab of the Coach Console — the team workouts and everyone's results,
  the same boards the athletes see under Team → Workouts. It took the place of
  the Notes tab; the Team tab next to it is the roster.

  The squad's KILOMETRES were here for a day (a Results | Kilometres switch) and
  moved to the Team tab on the owner's call: the team's numbers and the people
  who made them belong on one screen, not two (components/varsity/team/
  TeamWeekStats.tsx).
*/
import TeamScreen from "@/components/varsity/team/TeamScreen";

export default function CoachWorkoutsPage() {
  return <TeamScreen only="workouts" inConsole />;
}
