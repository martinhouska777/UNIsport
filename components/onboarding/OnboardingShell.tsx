"use client";

import type { ReactNode } from "react";
import { IconArrowLeft } from "@/components/icons";

/*
  Shared shell for all onboarding screens:
  - top progress segments (done = dim crimson, current = crimson, upcoming = border)
  - back arrow (hidden on the first screen) + optional Skip
  - serif heading + subtext
  - scrollable body
  - bottom CTA (primary crimson by default, or gold) + optional secondary link
  All colors come from theme variables.
*/
export default function OnboardingShell({
  step,
  total,
  showBack,
  onBack,
  skippable,
  onSkip,
  title,
  subtitle,
  centered,
  children,
  primaryLabel,
  primaryVariant = "primary",
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  step: number; // 1-based
  total: number;
  showBack: boolean;
  onBack: () => void;
  skippable: boolean;
  onSkip: () => void;
  title: string;
  subtitle?: string;
  centered?: boolean;
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

      {/* Progress segments */}
      <div className="my-4 flex gap-1" aria-label={`Step ${step} of ${total}`}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-sm ${
              i === step - 1
                ? "bg-primary"
                : i < step - 1
                  ? "bg-primary/50"
                  : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Scrollable body */}
      <div className={`flex-1 overflow-y-auto ${centered ? "text-center" : ""}`}>
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
              : "bg-primary text-primary-contrast"
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
