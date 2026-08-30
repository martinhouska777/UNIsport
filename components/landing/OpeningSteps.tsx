import FeatureIcon from "@/components/landing/FeatureIcon";
import type { OpeningStep } from "@/lib/landingCopy";

/*
  THE CONTENTS OF A STORY, on its title card — the numbered beats the reader
  is about to scroll, one word and one icon each (owner, 2026-08-30). It is
  not a second overview: it names the steps and nothing else, and the card's
  link points at the one real overview beside the closer.

  It also gives the card something to stand on. Before this it was a lead-in,
  a headline and one line on a whole screen.

  Wraps rather than scrolls, so seven items on a phone become two or three
  tidy rows instead of a strip running off the side.
*/
export default function OpeningSteps({
  steps,
  accent,
}: {
  steps: OpeningStep[];
  accent: "accent" | "varsity";
}) {
  return (
    <ol className="mt-1 flex max-w-[620px] flex-wrap items-center justify-center gap-x-5 gap-y-3">
      {steps.map((s) => (
        <li key={s.n} className="flex items-center gap-1.5">
          <FeatureIcon
            name={s.icon}
            className={`h-[17px] w-[17px] ${accent === "accent" ? "text-l-accent" : "text-l-varsity"}`}
          />
          <span className="font-mono text-[10px] tracking-[0.12em] text-l-text-2">{s.n}</span>
          <span className="text-[13px] tracking-tight text-l-text-2">{s.word}</span>
        </li>
      ))}
    </ol>
  );
}
