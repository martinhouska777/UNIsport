import { redirect } from "next/navigation";

// Varsity Mode opens on the Home tab.
export default function VarsityIndex() {
  redirect("/varsity/home");
}
