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
*/
export default function OpeningSteps({
  steps,
  accent,
  storyId,
}: {
  steps: OpeningStep[];
  accent: "accent" | "varsity";
  /** The story whose markers these link at — "story1" / "story2". */
  storyId: string;
}) {
  const tint = accent === "accent" ? "text-l-accent" : "text-l-varsity";
  const edge = accent === "accent" ? "hover:border-l-accent-soft hover:bg-l-accent-dim" : "hover:border-l-varsity-soft hover:bg-l-varsity-dim";

  return (
    <ol className="mt-1 flex max-w-[660px] flex-wrap items-center justify-center gap-2">
      {steps.map((s, i) => (
        <li key={s.n}>
          <a
            href={`#${storyId}-b${i}`}
            className={`flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 transition-colors ${edge}`}
          >
            <FeatureIcon name={s.icon} className={`h-[17px] w-[17px] ${tint}`} />
            <span className="font-mono text-[10px] tracking-[0.12em] text-l-text-2">{s.n}</span>
            <span className="text-[13px] tracking-tight text-l-text-2">{s.word}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
