import { instrumentSerif } from "@/components/landing/fonts";
import CampusColours from "@/components/landing/CampusColours";

/*
  SCRATCH ROUTE — the two closers on their own, so they can be reviewed in a
  browser without touching the live landing page at "/". Same chrome the
  landing provides (the serif variable, the grid, the dark ground), so what
  you see here is what they will look like once slotted in after each story.

  Delete this route when the closers move into app/page.tsx.
*/
export default function ClosersPreviewPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-hidden bg-l-bg font-sans text-l-text`}
    >
      <main className="relative">
        <CampusColours id="campus-colours" />
      </main>
    </div>
  );
}
