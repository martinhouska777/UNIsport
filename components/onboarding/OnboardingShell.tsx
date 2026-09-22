"use client";

import type { ReactNode } from "react";
import { IconArrowLeft } from "@/components/icons";
import Button from "@/components/ui/Button";

/*
  Shared shell for all onboarding screens:
  - top progress: one segment per CHAPTER (done = dim crimson, current = crimson
    filling as you move through its screens, upcoming = border), with the
    chapter's name and place above it — "How you train · 2 of 3"
  - back arrow (hidden on the first screen) + optional Skip
  - the heading
  - scrollable body
  - the app's own Button, full width, at the bottom

  IT LOOKS LIKE THE APP NOW (owner, 2026-09-22). Three things were only ever
  true here and nowhere else in UNIsport: a serif heading, a line of grey text
  under it explaining why we were asking, and a button drawn from scratch. The
  serif is gone (the app's own heading size and weight instead), the subtitle
  is gone with every other caption in the flow, and the button is
  components/ui/Button — the same control as every other screen's main action.
  The Varsity setup screen went through exactly this and reads better for it.

  All colors come from theme variables.
*/
export default function OnboardingShell({
  step,
  total,
  chapterLabel,
  chapterIndex,
  chapterTotal,
  chapterProgress,
  showBack,
  onBack,
  skippable,
  onSkip,
  title,
  centered,
  headerSlot,
  children,
  primaryLabel,
  primaryDisabled,
  onPrimary,
}: {
  /*
    Two ways to say where you are. The student flow passes CHAPTERS (the four
    props below). The plain step/total pair is kept for the short varsity setup,
    which is one screen and has no chapters to count.
  */
  step?: number; // 1-based
  total?: number;
  /** "How you train · 2 of 3", or the tail's own label. */
  chapterLabel?: string;
  /** 0-based chapter; equal to chapterTotal on the tail (everything done). */
  chapterIndex?: number;
  chapterTotal?: number;
  /** 0..1 — how far through the current chapter's screens. */
  chapterProgress?: number;
  showBack: boolean;
  onBack: () => void;
  skippable: boolean;
  onSkip: () => void;
  title: string;
  centered?: boolean;
  headerSlot?: ReactNode;
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col bg-background px-5 pb-6 pt-4 text-text">
      {/* Top row */}
      <div className="flex min-h-6 items-center justify-between">
        {showBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className="text-muted">
            <IconArrowLeft size={18} />
          </button>
        ) : (
          <span />
        )}
        {skippable ? (
          <button type="button" onClick={onSkip} className="text-[13px] text-muted">
            Skip
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Progress: chapters, not screens. Ten equal ticks read as a form; three
          named steps read as a conversation with a shape. The current chapter's
          segment fills as its screens go by, so nothing feels stuck. */}
      {chapterLabel !== undefined && chapterIndex !== undefined && chapterTotal !== undefined ? (
        <div className="mb-3 mt-3">
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-primary">
            {chapterLabel}
          </div>
          <div className="flex gap-1" role="progressbar" aria-label={chapterLabel}>
            {Array.from({ length: chapterTotal }).map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-sm bg-border">
                {i < chapterIndex ? (
                  <span className="block h-full w-full bg-primary/50" />
                ) : i === chapterIndex ? (
                  <span
                    className="block h-full rounded-sm bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                    style={{
                      width: `${Math.round(Math.max(0.12, Math.min(1, chapterProgress ?? 1)) * 100)}%`,
                    }}
                  />
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* The plain per-screen segments, for a flow with no chapters. */
        <div className="my-4 flex gap-1" aria-label={`Step ${step ?? 1} of ${total ?? 1}`}>
          {Array.from({ length: total ?? 1 }).map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-sm ${
                i === (step ?? 1) - 1 ? "bg-primary" : i < (step ?? 1) - 1 ? "bg-primary/50" : "bg-border"
              }`}
            />
          ))}
        </div>
      )}

      {/* Scrollable body */}
      <div className={`flex-1 overflow-y-auto ${centered ? "text-center" : ""}`}>
        {headerSlot}
        <h1 className="mb-5 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-text">
          {title}
        </h1>
        {children}
      </div>

      {/* CTA */}
      <div className="pt-4">
        <Button size="lg" className="w-full" onClick={onPrimary} disabled={primaryDisabled}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
