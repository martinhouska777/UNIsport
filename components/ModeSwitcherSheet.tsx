"use client";

/*
  MODE SWITCHER — the "switch accounts" sheet, but for this app's two modes:
  the normal student app and Varsity Mode.

  IT DROPS FROM THE TOP, and it is TWO BOXES stacked — Student mode on top,
  Varsity mode underneath — each one the mode's mark with its name beside it
  (owner, 2026-09-14). Between these two there was a version that was only the
  two icons side by side; the owner wanted the names back, without the old
  sheet's title, hint line, close button and description lines.

  WHAT THE BOXES SAY BESIDES THE NAME:
    • Varsity mode has your team's own name under it ("Harvard Rowing" — the
      name the team was saved with, so another school shows its own); Student
      mode has nothing under it (owner, 2026-10-11: "just do the student mode
      and then varsity mode, Harvard crew under it")
    • the mode you're IN wears a ring in the theme's primary colour and a tick
      on the right; the other one has an arrow, because tapping it goes there
    • a varsity box you can't use yet (no squad, or not approved) is dimmed

  THE BOXES ARE WHITE CARDS with a hairline and the app's card shadow (owner,
  same day: "make the button better") — they were grey boxes, the one mode you
  were in tinted. The sheet stays white: on the page's grey it would melt into
  the dimmed screen behind it.

  Tapping does exactly what it always did: the student side sends someone who
  never set it up to onboarding, and the varsity side sends a non-member to the
  invite or waiting screen rather than into a section that isn't theirs.

  Opened from the name in the Profile top bar (student side) and from the
  varsity mark in the Varsity top bar. Colors are theme tokens (rule 1) so the
  same sheet reads correctly in both modes' themes.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import UniversityCrest from "@/components/UniversityCrest";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { IconCheck, IconChevronRight } from "@/components/icons";

export default function ModeSwitcherSheet({
  current,
  onClose,
}: {
  current: "student" | "varsity";
  onClose: () => void;
}) {
  const router = useRouter();
  const { studentReady } = useAppState();
  const { membership, isMember, isPending, loading: squadLoading } = useMembership();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (mode: "student" | "varsity") => {
    // Nothing to act on yet — the squad lookup hasn't answered, so the varsity
    // box is inert and the sheet stays open rather than quietly closing on a
    // tap that would send a real member to the wrong place.
    if (mode === "varsity" && squadLoading) return;
    onClose();
    if (mode === "student") {
      // Never set up? This box is the offer to do it.
      if (!studentReady) router.push("/onboarding");
      else if (current !== "student") router.push("/profile");
      return;
    }
    // Varsity only opens for an approved member; everyone else is pointed at
    // the step that would actually get them in.
    if (isMember) {
      if (current !== "varsity") router.push(VARSITY_HOME);
    } else {
      router.push(isPending ? "/varsity/waiting" : "/join");
    }
  };

  // The ring that says "this is the mode you're in" (1px border + 1px ring, so
  // the box doesn't grow when it's the current one).
  const box = (on: boolean) =>
    `press-icon flex w-full items-center gap-3 rounded-2xl border bg-surface px-3.5 py-3 text-left shadow-card active:opacity-70 ${
      on ? "border-primary ring-1 ring-primary" : "border-border"
    }`;

  // Right-hand end of a box: a tick where you are, an arrow where you'd go.
  const end = (on: boolean) =>
    on ? (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
        <IconCheck size={14} />
      </span>
    ) : (
      <IconChevronRight size={18} className="shrink-0 text-faint" />
    );

  const studentOn = current === "student" && studentReady;
  const varsityOn = current === "varsity" && isMember;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-start">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-panel sheet-ceiling relative rounded-b-3xl border-b border-border bg-surface [animation:sheet-down_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex flex-col gap-2.5 px-4 pb-4 pt-5">
          {/* Student mode — the plain crest. */}
          <button
            type="button"
            onClick={() => go("student")}
            aria-pressed={studentOn}
            className={box(studentOn)}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
              <UniversityCrest size={22} />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-text">Student mode</span>
            {end(studentOn)}
          </button>

          {/* Varsity mode — the oars, the team's name under it. Dimmed until
              it's actually yours. */}
          <button
            type="button"
            onClick={() => go("varsity")}
            aria-pressed={varsityOn}
            className={`${box(varsityOn)} ${isMember ? "" : "opacity-60"}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
              <VarsityCrest size={32} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-tight text-text">Varsity mode</span>
              {membership?.teamName && (
                <span className="mt-0.5 block truncate text-[13px] leading-tight text-muted">{membership.teamName}</span>
              )}
            </span>
            {end(varsityOn)}
          </button>
        </div>

        {/* The grab bar, on the sheet's own edge — the one thing left that says
            "this is a sheet and it came from up there". */}
        <div className="flex justify-center pb-2">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}
