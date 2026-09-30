"use client";

/*
  MATCH — who the Match tab puts you in front of.

  "Train alone" is the switch that takes you off the Match tab altogether, so it
  comes first and, when it is on, the rest goes away: nobody is being matched
  with you, so there is nothing left to tune. Then the mentorship switches,
  then Partner — the owner's order (2026-09-30).

  The rest used to live in the "Edit your answers" sheet, which repeated half of
  Training and half of the profile. Sorted by what each answer is for (owner,
  2026-09-30), these two are about matching: which partner you'd train with, and
  the mentorship switches — the SAME rows onboarding showed you, picked by your
  class year and your gym level, because matching reads them
  (db/matching.sql: give_mentor / receive_mentor).

  Everything saves the moment it changes. Option lists are onboarding data.
*/
import {
  freshmanClassYear,
  gymMentorship,
  partnerPreferences,
  peerAdvising,
  type OnboardingProfile,
} from "@/lib/onboarding";
import { ChoiceRow, Group, ToggleRow } from "@/components/settings/SettingsShell";

export default function MatchSettings({
  answers,
  onSave,
}: {
  answers: Partial<OnboardingProfile>;
  onSave: (patch: Partial<OnboardingProfile>) => void;
}) {
  // trainingType carries "solo" end-to-end (matching drops it). Everyone else
  // is "either" — or "partner", which the old sheet could still set.
  const trainsAlone = answers.trainingType === "solo";

  // Peer advising: a freshman can only be mentored, anyone older only mentors.
  const isFreshman = answers.classYear === freshmanClassYear;
  const peerRows = peerAdvising.filter((r) =>
    isFreshman ? r.key === "beMentored" : r.key === "mentorFreshmen",
  );
  // Gym mentorship is a lifting question, asked by level exactly as onboarding
  // does: a beginner can only get help, an advanced lifter can only give it.
  const level = answers.primaryActivity === "gym" ? answers.experienceLevel : "";
  const gymRows = level
    ? gymMentorship.filter((r) => {
        if (level === "beginner") return r.key === "getHelp";
        if (level === "advanced") return r.key === "helpOthers";
        return true;
      })
    : [];

  return (
    <Group title="Match">
      <ToggleRow
        label="Train alone"
        on={trainsAlone}
        onChange={() => onSave({ trainingType: trainsAlone ? "either" : "solo" })}
      />
      {!trainsAlone && (
        <>
          {[...peerRows, ...gymRows].map((row) => (
            <ToggleRow
              key={row.key}
              label={row.label}
              on={Boolean(answers[row.key])}
              onChange={() => onSave({ [row.key]: !answers[row.key] })}
            />
          ))}
          <ChoiceRow
            label="Partner"
            options={partnerPreferences}
            // An empty answer is "any" to matching (db/matching.sql).
            value={answers.partnerPreference || "any"}
            onPick={(key) => onSave({ partnerPreference: key })}
          />
        </>
      )}
    </Group>
  );
}
