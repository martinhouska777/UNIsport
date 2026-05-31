import { redirect } from "next/navigation";

// The Coach Console opens on the Training Plan.
export default function CoachIndex() {
  redirect("/varsity/coach/plan");
}
