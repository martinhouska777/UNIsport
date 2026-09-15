"use client";

/*
  MODE SWITCHER — the "switch accounts" sheet, but for this app's two modes:
  the normal student app and Varsity Mode.

  IT DROPS FROM THE TOP, and it is TWO ICONS AND NOTHING ELSE (owner,
  2026-09-14). It used to rise from the floor with a title, a hint line, a
  close button and a named, described row per mode — a whole page of words for
  a choice between two things you already recognise by their mark. Now it falls
  out of the top bar you just tapped and shows the crest (the normal app) and
  the oars (Varsity). Left is where you are now or where you'd go back to;
  right is the team side.

  WHAT THE ICONS STILL SAY WITHOUT WORDS:
    • the mode you're IN wears a ring in the theme's primary colour
    • a varsity mark you can't use yet (no squad, or not approved) is dimmed

  Tapping still does exactly what it always did, so nothing is lost by the
  words going: the student side sends someone who never set it up to
  onboarding, and the varsity side sends a non-member to the invite or waiting
  screen rather than into a section that isn't theirs.

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
    // mark is inert and the sheet stays open rather than quietly closing on a
    // tap that would send a real member to the wrong place.
    if (mode === "varsity" && squadLoading) return;
    onClose();
    if (mode === "student") {
      // Never set up? This icon is the offer to do it.
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
  const ring = (on: boolean) =>
    on ? "border-primary bg-primary-tint" : "border-border bg-surface-2";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-start">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-ceiling relative rounded-b-3xl border-b border-border bg-surface [animation:sheet-down_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex items-center justify-center gap-10 px-4 pb-4 pt-5">
          {/* Normal mode — the plain crest. */}
          <button
            type="button"
            onClick={() => go("student")}
            aria-label="Normal mode"
            className={`tap44 press-icon flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 active:opacity-70 ${ring(
              current === "student" && studentReady,
            )}`}
          >
            <UniversityCrest size={30} />
          </button>

          {/* Varsity mode — the oars. Dimmed until it's actually yours. */}
          <button
            type="button"
            onClick={() => go("varsity")}
            aria-label="Varsity mode"
            className={`tap44 press-icon flex h-16 w-16 items-center justify-center rounded-full border-2 active:opacity-70 ${ring(
              current === "varsity" && isMember,
            )} ${isMember ? "" : "opacity-60"}`}
          >
            <VarsityCrest size={44} />
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
