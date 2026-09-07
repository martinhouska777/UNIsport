"use client";

/*
  HOW IT WORKS — the whole League explained once, behind the ⓘ in the corner.

  This used to be a bullet list stuck at the bottom of the screen, under every
  section, where it was both in the way and too short to actually answer
  anything. A rules panel is something you want ONCE, on the day you first
  wonder why a number moved — so it belongs behind a button, and it can then
  afford to be complete.

  Every number in here is READ FROM THE DATA, never typed twice: the
  multipliers and the level step come from lib/xp.ts, the house factor and the
  event gate from lib/xp.ts and lib/events.ts. Change a rule and this screen
  changes with it, which is the only way a rules screen stays true.
*/
import { useEffect } from "react";
import { IconX } from "@/components/icons";
import { useDragToDismiss } from "@/components/useDragToDismiss";
import { honorCodeFor } from "@/lib/honorCode";
import {
  HOUSE_LEVEL_FACTOR,
  LEVEL_STEP,
  NEW_PARTNER_MULTIPLIER,
  PARTNER_MULTIPLIER,
  multiplierLabel,
  sessionXp,
  xpForLevel,
} from "@/lib/xp";
import { HOUSE_EVENT_MIN_LEVEL } from "@/lib/events";

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-4 py-3.5 last:border-b-0">
      <h3 className="text-[13px] font-semibold text-text">{title}</h3>
      <div className="mt-1 flex flex-col gap-1.5 text-[12px] leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function HowItWorks({
  universityKey,
  onClose,
}: {
  universityKey: string;
  onClose: () => void;
}) {
  const { dragProps, sheetStyle } = useDragToDismiss(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div
        style={sheetStyle}
        className="relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        {/* Grab area: handle and title. Stops here on purpose — extending it
            over the scrolling body would make every scroll fight the drag. */}
        <div {...dragProps} className="cursor-grab active:cursor-grabbing">
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">How the League works</div>
              <div className="mt-0.5 text-[11px] text-muted">Every rule, in one place</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <Rule title="XP — where it comes from">
            <p>
              A logged session is worth <strong className="text-text">{sessionXp.solo} XP</strong>.
              Train with someone and it is {multiplierLabel(PARTNER_MULTIPLIER)} that (
              {sessionXp.partner} XP). Train with someone you have{" "}
              <strong className="text-text">never trained with before</strong> and it is{" "}
              {multiplierLabel(NEW_PARTNER_MULTIPLIER)} ({sessionXp.newPartner} XP).
            </p>
            <p>
              So Level 2 is ten sessions on your own — or four with new people. The social route
              is faster on purpose.
            </p>
            <p>
              A single day counts <strong className="text-text">twice at most</strong>, so nobody
              can level up by tapping Log Session fifteen times on a Tuesday.
            </p>
          </Rule>

          <Rule title="Levels">
            <p>
              Every level costs <strong className="text-text">{LEVEL_STEP} XP more</strong> than
              the one before: Level 2 at {xpForLevel(2)}, Level 3 at {xpForLevel(3)}, Level 4 at{" "}
              {xpForLevel(4)}, Level 5 at {xpForLevel(5)}, and on upwards.
            </p>
            <p>
              Early levels arrive quickly, later ones are a grind — but the bigger challenges pay
              much more, so it never stalls.
            </p>
            <p>
              Your level shows as the ring around your picture, everywhere you appear in the app.
            </p>
          </Rule>

          <Rule title="Challenges">
            <p>
              The ladder is permanent and it <strong className="text-text">never resets</strong>.
              Finishing one pays XP. There is always exactly one next thing — the app shows you
              that one, part filled.
            </p>
            <p>
              They mix four kinds on purpose: how much you train, how many people you train with,
              how consistent you are, and how much you get around. Level 6 should mean something
              more interesting than &ldquo;trains a lot&rdquo;.
            </p>
          </Rule>

          <Rule title="Your house">
            <p>
              Everything you earn also counts for your house — your sessions{" "}
              <em>and</em> the challenges you finish.
            </p>
            <p>
              A house needs <strong className="text-text">{HOUSE_LEVEL_FACTOR}×</strong> one
              person&rsquo;s XP for the same level, and it is ranked on its{" "}
              <strong className="text-text">total, not its average</strong>. A bigger house does
              climb faster — that is deliberate. A quiet house catches up by getting more people
              logging, not by making the same three train harder.
            </p>
            <p>
              Houses have their own challenges too, at a size no one person could reach alone.
            </p>
          </Rule>

          <Rule title="Events">
            <p>
              Two run every week, Monday to Sunday, and then they are gone: one for you, one a
              race between houses. Which two it is changes on its own every Monday.
            </p>
            <p>
              Your own event always runs. The house race needs your house to be{" "}
              <strong className="text-text">Level {HOUSE_EVENT_MIN_LEVEL}</strong> — a house below
              that can watch the race and see exactly how far off the door it is.
            </p>
          </Rule>

          <Rule title="The two clocks">
            <p>
              Levels, challenges and XP are <strong className="text-text">all time</strong>. They
              never reset, so there is always something being built.
            </p>
            <p>
              The session boards <strong className="text-text">do</strong> reset — every month and
              every semester. That is the point of them: a table nobody can still win is a table
              nobody plays.
            </p>
          </Rule>

          <Rule title="What other people can see">
            <p>
              Only your name, your house, your year and your totals. Never a workout, never an
              exercise, never a note, never a photo, never a date. A leaderboard cannot be read
              backwards into what anybody actually did.
            </p>
          </Rule>

          <Rule title="Honesty">
            <p>{honorCodeFor(universityKey).footer}</p>
            <p>
              Two things do get checked: only two sessions a day ever count, and the big
              new-partner bonus needs a partner picked from the people list on a session they
              confirmed. Everything else is on you.
            </p>
          </Rule>
        </div>
      </div>
    </div>
  );
}
