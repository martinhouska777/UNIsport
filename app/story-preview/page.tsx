import { instrumentSerif } from "@/components/landing/fonts";
import StoryCloser from "@/components/landing/StoryCloser";
import Interlude from "@/components/landing/Interlude";
import { cues, studentStory, varsityStory } from "@/lib/landingCopy";

/*
  SCRATCH ROUTE — the middle of the landing page, native: the student story
  flying into Campus Colours, the interlude, the varsity story flying into
  Blade Lock. Reviewed here without touching the live page at "/". Same
  chrome the landing provides (the serif variable, the grid, the dark ground).

  A spacer above: the first story is meant to be arrived at, not started on.
  Delete this route when the sequence moves into app/page.tsx.
*/
export default function StoryPreviewPage() {
  return (
    <div
      className={`${instrumentSerif.variable} l-grid relative min-h-screen overflow-x-clip bg-l-bg font-sans text-l-text`}
    >
      <main className="relative">
        <div className="flex h-[60svh] items-end justify-center pb-10">
          <div className="l-cue">{cues.hero}</div>
        </div>
        <StoryCloser
          storyId="story1"
          beats={studentStory}
          accent="accent"
          closer="campus"
          closerId="campus-colours"
          fromBeat={6}
          toBeat={0}
        />
        <Interlude />
        <StoryCloser
          storyId="story2"
          beats={varsityStory}
          accent="varsity"
          closer="blades"
          closerId="blade-lock"
          fromBeat={5}
          toBeat={0}
        />
        <div className="h-[40svh]" />
      </main>
    </div>
  );
}
