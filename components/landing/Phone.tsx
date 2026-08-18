import type { HTMLAttributes, ReactNode, Ref } from "react";

/*
  THE PHONE FRAME every landing section draws its screens in — the coach
  screens, both closers, and the two scroll stories.

  One frame, so a reader meets the same object everywhere, and so the flying
  phone of the stories can land on a closer's phone to the pixel: the shell,
  status bar, island and gesture bar here are the story phone's proportions
  (a 360px shell with a 338px screen), expressed as fractions of the shell's
  width — so at 300px, 272px or 84vw it is the same phone, just smaller.

  Colours: the shell uses the landing surface tokens; the phone's own chrome
  (light screen, status-bar ink, island, gesture bar) has its own l-phone-*
  tokens in globals.css. No hex here (rule 1).

  Children go where the app's screen is — a single <Image>, or a stack. The
  caller sets the width (`className`); everything inside follows it. `ref`
  lands on the outer box, whose rect is the shell's.
*/
export default function Phone({
  children,
  className = "",
  ref,
  ...rest
}: { children: ReactNode; className?: string; ref?: Ref<HTMLDivElement> } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div ref={ref} className={`@container ${className}`} {...rest}>
      <div className="rounded-[12.2cqw] border border-l-border-hover bg-l-bg-elevated p-[2.78cqw] shadow-2xl">
        <div className="overflow-hidden rounded-[9.44cqw] bg-l-phone-screen">
          <div className="flex items-center justify-between bg-l-phone-screen px-[6.11cqw] pt-[3.33cqw] pb-[2.22cqw] font-mono text-[3.33cqw] leading-none text-l-phone-ink">
            <span>9:41</span>
            <i className="h-[6.1cqw] w-[23.3cqw] rounded-full border border-l-phone-island-line bg-l-phone-island" />
            <span className="text-[3.06cqw] text-l-phone-ink-2">5G</span>
          </div>
          {children}
          <div className="flex h-[6.67cqw] items-center justify-center bg-l-phone-screen">
            <i className="h-[1.1cqw] w-[38%] rounded-full bg-l-phone-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
