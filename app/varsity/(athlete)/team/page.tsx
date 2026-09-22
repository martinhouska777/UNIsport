import TeamScreen from "@/components/varsity/team/TeamScreen";

/*
  THE TEAM TAB IS THE WORKOUTS (owner, 2026-09-21).

  It used to open on a Roster | Workouts switch, so the half anyone actually
  comes here for — the boards — cost two taps, and the squad list cost the
  top of the screen every time. The roster is one row on the Profile now
  (/varsity/team/roster), where you go to look someone up.
*/
export default function VarsityTeamPage() {
  return <TeamScreen only="workouts" />;
}
