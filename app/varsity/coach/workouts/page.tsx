"use client";

/*
  Workouts tab of the Coach Console — the team workouts and everyone's results,
  the same boards the athletes see under Team → Workouts. It took the place of
  the Notes tab; the Team tab next to it is now just the roster.
*/
import TeamScreen from "@/components/varsity/team/TeamScreen";

export default function CoachWorkoutsPage() {
  return <TeamScreen only="workouts" inConsole />;
}
