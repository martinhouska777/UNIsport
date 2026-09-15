"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { IconX, IconPlus } from "@/components/icons";
import { useDragToDismiss } from "@/components/useDragToDismiss";
import { Pill, FieldLabel } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import {
  interestOptions,
  languageOptions,
  concentrations,
  countries,
  campusLanguage,
  MIN_INTERESTS,
  MAX_INTEREST_LENGTH,
  type OnboardingProfile,
} from "@/lib/onboarding";

/*
  "About you" sheet — the pencil in the profile's More about you block.

  It edits EXACTLY the five things that block shows: interests, languages,
  concentration and the hometown (city + country). It deliberately does NOT
  reach any further: the pencil sits beside those chips, so tapping it used to
  open the whole "Edit your answers" sheet (activity, gyms, mentorship…) and
  you had to scroll past your training setup to change a hobby. Everything
  else still lives in Settings, in PreferencesSheet.

  Same order as the block on the page, so what you tap is the first thing you
  see. Edits a local draft and hands the patch back on Save. Colors are theme
  variables only; inputs use 16px text so phones don't auto-zoom.
*/

// Only what the block on the profile page prints.
type Editable = Pick<
  OnboardingProfile,
  "interests" | "languages" | "concentration" | "hometownCity" | "hometownCountry"
>;

export default function AboutYouSheet({
  profile,
  onSave,
  onClose,
}: {
  profile: Editable;
  onSave: (patch: Editable) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Editable>({
    interests: profile.interests ?? [],
    languages: profile.languages ?? [],
    concentration: profile.concentration ?? "",
    hometownCity: profile.hometownCity ?? "",
    hometownCountry: profile.hometownCountry ?? "",
  });
  // null = the "add your own interest" box is closed.
  const [newInterest, setNewInterest] = useState<string | null>(null);
  const { dragProps, sheetStyle } = useDragToDismiss(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleInterest = (i: string) =>
    set(
      "interests",
      draft.interests.includes(i)
        ? draft.interests.filter((x) => x !== i)
        : [...draft.interests, i]
    );

  // Anything picked that isn't one of our ready-made pills was typed here.
  const ownInterests = draft.interests.filter((i) => !interestOptions.includes(i));

  const addInterest = () => {
    const value = (newInterest ?? "").trim();
    setNewInterest(null);
    if (value === "" || draft.interests.includes(value)) return;
    set("interests", [...draft.interests, value]);
  };

  // The same floor onboarding asks for: a profile with fewer interests is one
  // the match has nothing to say about, so Save waits.
  const enough = draft.interests.length >= MIN_INTERESTS;

  const save = () => {
    if (!enough) return;
    onSave({ ...draft, hometownCity: draft.hometownCity.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div
        style={sheetStyle}
        className="sheet-floor relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]"
      >
        {/* Grab area: handle + title. Drag it down to close. It stops here —
            over the scrolling body it would fight every scroll. */}
        <div {...dragProps} className="cursor-grab active:cursor-grabbing">
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">About you</div>
              <div className="mt-0.5 text-[11px] text-muted">
                What other people see on your profile
              </div>
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

        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* Interests first — it's the line somebody else matches with you on,
              and the first thing the block on the page shows. */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <FieldLabel>Interests</FieldLabel>
              <span
                className={`mb-2 text-[11px] tabular-nums ${
                  enough ? "text-success" : "text-muted"
                }`}
              >
                {enough
                  ? `${draft.interests.length} picked`
                  : `pick ${MIN_INTERESTS - draft.interests.length} more`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {interestOptions.map((i) => (
                <Pill
                  key={i}
                  label={i}
                  variant="gold"
                  selected={draft.interests.includes(i)}
                  onClick={() => toggleInterest(i)}
                />
              ))}

              {/* Whatever was typed here, always on and removable. */}
              {ownInterests.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInterest(i)}
                  aria-label={`Remove ${i}`}
                  className="tap44 flex items-center gap-1.5 rounded-full border border-accent bg-accent-tint px-3.5 py-2 text-[13px] text-accent"
                >
                  {i}
                  <IconX size={13} />
                </button>
              ))}

              {newInterest === null && (
                <button
                  type="button"
                  onClick={() => setNewInterest("")}
                  className="tap44 flex items-center gap-1 rounded-full border border-dashed border-border bg-surface-2 px-3.5 py-2 text-[13px] text-muted"
                >
                  <IconPlus size={13} />
                  Add
                </button>
              )}
            </div>

            {newInterest !== null && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  autoFocus
                  value={newInterest}
                  maxLength={MAX_INTEREST_LENGTH}
                  onChange={(e) => setNewInterest(e.target.value)}
                  /* Enter adds it, Escape backs out. */
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest();
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      setNewInterest(null);
                    }
                  }}
                  placeholder="Your own interest"
                  aria-label="Your own interest"
                  className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  disabled={newInterest.trim() === ""}
                  className="tap44 flex-shrink-0 rounded-full border border-accent bg-accent-tint px-4 py-2 text-[13px] text-accent disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Languages — English stays on, you're at Harvard. */}
          <div>
            <FieldLabel>Languages</FieldLabel>
            <SearchableDropdown
              multiple
              hideSelected
              locked={[campusLanguage]}
              options={languageOptions}
              value={draft.languages}
              onChange={(v) => set("languages", v)}
              placeholder="Add a language…"
              searchPlaceholder="Search languages…"
              ariaLabel="Languages"
            />
          </div>

          {/* Concentration */}
          <div>
            <FieldLabel>Concentration</FieldLabel>
            <SearchableDropdown
              options={concentrations}
              value={draft.concentration}
              onChange={(v) => set("concentration", v)}
              placeholder="Select a concentration…"
              searchPlaceholder="Search concentrations…"
              ariaLabel="Concentration"
            />
          </div>

          {/* Where you're from — city above the country, the same way the
              profile prints it. */}
          <div>
            <FieldLabel>Where you&apos;re from</FieldLabel>
            <input
              value={draft.hometownCity}
              maxLength={40}
              onChange={(e) => set("hometownCity", e.target.value)}
              placeholder="Your city or town"
              aria-label="City or town"
              className="mb-2 w-full rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <SearchableDropdown
              options={countries}
              value={draft.hometownCountry}
              onChange={(v) => set("hometownCountry", v)}
              placeholder="Select your country"
              searchPlaceholder="Search countries…"
              ariaLabel="Country"
            />
          </div>

          {/* The rest of your answers still live in Settings — say so, so the
              shorter sheet doesn't read as a missing feature. */}
          <p className="text-[11px] leading-relaxed text-muted">
            Your activity, gyms, who you train with and mentorship are in
            Settings → Edit your answers.
          </p>
        </div>

        <div className="flex gap-2.5 border-t border-border bg-surface px-4 py-3">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="lg" onClick={save} disabled={!enough} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
