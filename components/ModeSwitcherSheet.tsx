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
    • the mode you're IN wears a ring in the theme's primary colour
    • a varsity box you can't use yet (no squad, or not approved) is dimmed

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

export default function ModeSwitcherSheet({
  current,
  onClose,
}: {
  current: "student" | "varsity";
  onClose: () => void;
}) {
  const router = useRouter();
  const { studentReady } = useAppState();
  const { isMember, isPending, loading: squadLoading } = useMembership();

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

  // The ring that says "this is the mode you're in".
  const box = (on: boolean) =>
    `press-icon flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left active:opacity-70 ${
      on ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
    }`;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-start">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-ceiling relative rounded-b-3xl border-b border-border bg-surface [animation:sheet-down_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex flex-col gap-2.5 px-4 pb-4 pt-5">
          {/* Student mode — the plain crest. */}
          <button
            type="button"
            onClick={() => go("student")}
            aria-pressed={current === "student" && studentReady}
            className={box(current === "student" && studentReady)}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface">
              <UniversityCrest size={22} />
            </span>
            <span className="text-[15px] font-medium text-text">Student mode</span>
          </button>

          {/* Varsity mode — the oars. Dimmed until it's actually yours. */}
          <button
            type="button"
            onClick={() => go("varsity")}
            aria-pressed={current === "varsity" && isMember}
            className={`${box(current === "varsity" && isMember)} ${isMember ? "" : "opacity-60"}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
              <VarsityCrest size={32} />
            </span>
            <span className="text-[15px] font-medium text-text">Varsity mode</span>
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
