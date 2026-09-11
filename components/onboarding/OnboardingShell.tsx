"use client";

import type { ReactNode } from "react";
import { IconArrowLeft } from "@/components/icons";

/*
  Shared shell for all onboarding screens:
  - top progress: one segment per CHAPTER (done = dim crimson, current = crimson
    filling as you move through its screens, upcoming = border), with the
    chapter's name and place above it — "How you train · 2 of 3"
  - back arrow (hidden on the first screen) + optional Skip
  - serif heading + subtext
  - scrollable body
  - bottom CTA (primary crimson by default, or gold) + optional secondary link
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
  subtitle,
  centered,
  headerSlot,
  children,
  primaryLabel,
  primaryVariant = "primary",
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
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
  subtitle?: string;
  centered?: boolean;
  headerSlot?: ReactNode;
  children: ReactNode;
  primaryLabel: string;
  primaryVariant?: "primary" | "gold";
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
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
        <div className="mb-4 mt-4">
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
        <h1 className="mb-2 font-serif text-[22px] font-medium leading-tight text-text">
          {title}
        </h1>
        {subtitle && <p className="mb-5 text-[13px] leading-relaxed text-muted">{subtitle}</p>}
        {children}
      </div>

      {/* CTA */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className={`w-full rounded-xl py-3.5 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
            primaryVariant === "gold"
              ? "bg-accent text-background"
              : "bg-primary-live text-primary-contrast"
          }`}
        >
          {primaryLabel}
        </button>
        {secondaryLabel && (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-3.5 w-full text-center text-[13px] text-muted"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
