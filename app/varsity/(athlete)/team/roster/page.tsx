import TeamScreen from "@/components/varsity/team/TeamScreen";

/*
  THE SQUAD, from the Profile. The same roster the Team tab used to hold
  behind a switch and the same one the coach reads — one component, asked for
  one of its halves (owner, 2026-09-21). It lives under /varsity/team so the
  Team tab stays lit while you are in it.
*/
export default function VarsityRosterPage() {
  return <TeamScreen only="roster" />;
}
