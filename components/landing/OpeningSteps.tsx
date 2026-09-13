import type { CSSProperties } from "react";
import FeatureIcon from "@/components/landing/FeatureIcon";
import type { OpeningStep } from "@/lib/landingCopy";

/*
  THE CONTENTS OF A STORY, on its title card — the numbered beats the reader
  is about to scroll, one word and one icon each (owner, 2026-08-30). It is
  not a second overview: it names the steps and nothing else, and the card's
  link points at the one real overview beside the closer.

  EVERY STEP IS A DOOR (owner, 2026-08-30: "chci aby i ty male nekam sly").
  Each links at its own beat's scroll marker in ScrollStory — `#story1-b3` —
  which is that beat's address on the page. Landing on a marker's top leaves
  the middle of the screen inside it, and a marker is at least a screen tall,
  so the beat you asked for is the one that lights up. Plain anchors, so they
  work before any script has run and a reader can open one in a new tab.

  Wraps rather than scrolls, so seven items on a phone become two or three
  tidy rows instead of a strip running off the side.

  THEY ARE PILLS (owner, 2026-09-13: "elliptical tabs, like they have
  borders"): a border on every step, not only on hover. Sized a step BELOW the
  card's "See every feature" button, which has to read as the bigger thing.

  TWO EVEN LINES from sm up (owner, same day: "center them better … it should
  be in two lines"): a full-width break after the first half, so seven read
  4 + 3 instead of 6 + 1. On a phone they simply wrap. The break is a line of
  its own, so the row gap is HALVED from sm up — two half-gaps make one.

  They arrive one after another when the card comes on screen: `delay` is when
  the first one lands, and each following one is 55ms behind the last (the
  card's entrance is .l-titlecard in app/globals.css).
*/
export default function OpeningSteps({
  steps,
  accent,
  storyId,
  delay = 0,
}: {
  steps: OpeningStep[];
  accent: "accent" | "varsity";
  /** The story whose markers these link at — "story1" / "story2". */
  storyId: string;
  /** When the first chip lands, in ms, once the card is on screen. */
  delay?: number;
}) {
  const tint = accent === "accent" ? "text-l-accent" : "text-l-varsity";
  const edge = accent === "accent" ? "hover:border-l-accent hover:bg-l-accent-dim" : "hover:border-l-varsity hover:bg-l-varsity-dim";

  return (
    <ol className="mt-1 flex max-w-[860px] flex-wrap items-center justify-center gap-2 sm:gap-x-2.5 sm:gap-y-[5px]">
      {steps.map((s, i) => [
        i === Math.ceil(steps.length / 2) && (
          <li key="break" aria-hidden className="hidden h-0 basis-full sm:block" />
        ),
        <li key={s.n} className="l-tc" style={{ "--d": `${delay + i * 55}ms` } as CSSProperties}>
          <a
            href={`#${storyId}-b${i}`}
            className={`flex items-center gap-2 rounded-full border border-l-line-hover bg-l-bg-elevated px-3.5 py-2 transition-colors sm:px-4 ${edge}`}
          >
            <FeatureIcon name={s.icon} className={`h-[18px] w-[18px] ${tint}`} />
            <span className="font-mono text-[12px] tracking-[0.12em] text-l-text-2">{s.n}</span>
            <span className="text-[14px] tracking-tight text-l-text sm:text-[15px]">{s.word}</span>
          </a>
        </li>,
      ])}
    </ol>
  );
}
