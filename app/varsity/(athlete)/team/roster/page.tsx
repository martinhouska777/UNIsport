import { redirect } from "next/navigation";

/*
  THE ROSTER MOVED to /varsity/profile/team (audit, 2026-09-27), so the
  Profile tab stays lit while you are in it. This address is kept only so an
  old link or a page the app cached lands on the new one.
*/
export default function OldRosterPage() {
  redirect("/varsity/profile/team");
}
