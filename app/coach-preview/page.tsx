import { instrumentSerif } from "@/components/landing/fonts";
import CoachSection from "@/components/landing/CoachSection";

/*
  SCRATCH ROUTE — the coach section on its own, so it can be reviewed in a
  browser without touching the live landing page at "/". It carries the same
  chrome the landing provides (the serif variable, the grid, the dark ground)
  so what you see here is what it will look like once it is slotted in after
  the varsity story.

  Delete this route when the section moves into app/page.tsx.
*/
export default function CoachPreviewPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-hidden bg-l-bg font-sans text-l-text`}
    >
      <main className="relative">
        <CoachSection />
      </main>
    </div>
  );
}
