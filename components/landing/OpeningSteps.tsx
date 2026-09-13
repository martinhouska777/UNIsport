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

  THEY ARE PILLS (owner, 2026-09-13: "make them so they are elliptical tabs,
  like they have borders, and make them bigger so it fills the page"): a
  border on every step, not only on hover, and a size up in every part.

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
    <ol className="mt-3 flex max-w-[980px] flex-wrap items-center justify-center gap-2.5 sm:gap-3">
      {steps.map((s, i) => (
        <li key={s.n} className="l-tc" style={{ "--d": `${delay + i * 55}ms` } as CSSProperties}>
          <a
            href={`#${storyId}-b${i}`}
            className={`flex items-center gap-2 rounded-full border border-l-line-hover bg-l-bg-elevated px-4 py-2.5 transition-colors sm:gap-2.5 sm:px-5 sm:py-3 ${edge}`}
          >
            <FeatureIcon name={s.icon} className={`h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] ${tint}`} />
            <span className="font-mono text-[12px] tracking-[0.12em] text-l-text-2 sm:text-[13px]">{s.n}</span>
            <span className="text-[15px] tracking-tight text-l-text sm:text-[17px]">{s.word}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
