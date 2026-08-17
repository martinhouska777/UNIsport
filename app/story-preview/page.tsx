import { instrumentSerif } from "@/components/landing/fonts";
import ScrollStory from "@/components/landing/ScrollStory";
import { studentStory, varsityStory } from "@/lib/landingCopy";

/*
  SCRATCH ROUTE — the two scroll stories, native, so they can be reviewed in a
  browser without touching the live landing page at "/". Same chrome the
  landing provides (the serif variable, the grid, the dark ground).

  A spacer above and between: the stories are meant to be arrived at, not
  started on. Delete this route when the stories move into app/page.tsx.
*/
export default function StoryPreviewPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-clip bg-l-bg font-sans text-l-text`}
    >
      <main className="relative">
        <div className="flex h-[60svh] items-center justify-center font-mono text-[11px] tracking-[0.12em] uppercase text-l-text-3">
          Scroll
        </div>
        <ScrollStory id="story1" beats={studentStory} accent="accent" />
        <div className="flex h-[60svh] items-center justify-center font-mono text-[11px] tracking-[0.12em] uppercase text-l-text-3">
          Keep going
        </div>
        <ScrollStory id="story2" beats={varsityStory} accent="varsity" />
        <div className="h-[40svh]" />
      </main>
    </div>
  );
}
