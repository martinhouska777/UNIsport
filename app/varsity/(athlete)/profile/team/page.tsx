import TeamScreen from "@/components/varsity/team/TeamScreen";

/*
  THE SQUAD, from the Profile. The same roster the Team tab used to hold
  behind a switch and the same one the coach reads — one component, asked for
  one of its halves (owner, 2026-09-21).

  IT LIVES UNDER /varsity/profile (audit, 2026-09-27). It was
  /varsity/team/roster, which lit the WORKOUTS tab — the bottom tab that used
  to be called Team — while you were in a screen you had opened from the
  Profile, and it had no way back. Under the Profile's own route the Profile
  tab stays lit, and the screen carries a back arrow to it.
*/
export default function VarsityRosterPage() {
  return <TeamScreen only="roster" back="/varsity/profile" />;
}
