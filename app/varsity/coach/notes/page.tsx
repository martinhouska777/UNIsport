import { redirect } from "next/navigation";

/*
  The Notes tab is gone: a technical note now lives on the athlete's own screen
  (Team → a rower). Anything still pointing here lands on Team.
*/
export default function CoachNotesPage() {
  redirect("/varsity/coach/team");
}
