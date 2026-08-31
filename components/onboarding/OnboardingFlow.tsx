"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { Pill, FieldLabel, TextField, Toggle, Section } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import {
  IconBarbell,
  IconRun,
  IconActivity,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconCamera,
  IconBell,
  IconShield,
  IconMapPin,
  HouseSigil,
  IconMessage,
  IconCalendar,
  IconClock,
  IconHeart,
} from "@/components/icons";
import {
  classYears,
  sexOptions,
  freshmanClassYear,
  residenceOptions,
  primaryActivities,
  experienceLevels,
  gymStyles,
  gymSplits,
  cardioTypes,
  runningUnits,
  runningHints,
  runningExperiences,
  verifiedGyms,
  MAX_TOP_GYMS,
  weekDays,
  timeBlocks,
  concentrations,
  countries,
  languageOptions,
  campusLanguage,
  interestOptions,
  MAX_INTEREST_LENGTH,
  residenceKind,
  residenceGroup,
  partnerPreferences,
  TRAIN_ALONE_NOTE,
  peerAdvising,
  gymMentorship,
  notificationItems,
  emptyProfile,
  nameError,
  readOnboardingDraft,
  writeOnboardingDraft,
  clearOnboardingDraft,
  type OnboardingProfile,
} from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import { subscribeToPush, sendTestNotification } from "@/lib/push/client";

const activityIcons: Record<string, (p: { size?: number; className?: string }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  activity: IconActivity,
  plus: IconPlus,
};

const notifIcons: Record<string, (p: { size?: number; className?: string }) => React.ReactNode> = {
  heart: IconHeart,
  message: IconMessage,
  calendar: IconCalendar,
  clock: IconClock,
};

/*
  The emblem in front of a place in the residence picker.
    • a House  → its OWN two identity colours, which are gym data (lib/gyms.ts)
                 and reach the component as values, never as hardcoded hex.
    • a dorm   → the neutral shield, in the theme's gold.
    • anywhere
      else     → a pin. Off campus isn't a crest.
*/
function ResidenceEmblem({
  residence,
  universityKey,
}: {
  residence: string;
  universityKey: string;
}) {
  const kind = residenceKind(residence);
  const colors = kind === "house" ? houseColorsFor(universityKey, residence) : null;
  if (colors) {
    return <HouseSigil primary={colors.primary} secondary={colors.secondary} size={20} />;
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center text-accent">
      {kind === "other" ? <IconMapPin size={16} /> : <IconShield size={17} />}
    </span>
  );
}

type StepMeta = {
  key: string;
  title: string;
  subtitle?: string;
  skippable?: boolean;
  centered?: boolean;
};

// The 9 screens (structure per spec). Bodies are filled in screen by screen.
const STEPS: StepMeta[] = [
  { key: "basics", title: "Let's get to know you.", subtitle: "A few quick basics so other members can find you." },
  { key: "residence", title: "Where do you live on campus?", subtitle: "We'll connect you with people nearby." },
  { key: "activity", title: "What do you train?", subtitle: "Pick your main thing — you can do everything else too." },
  { key: "topgyms", title: "Your top gyms.", subtitle: "Where do you actually train? Pick and rank your top 3." },
  { key: "schedule", title: "When do you train?", subtitle: "Tap the days you train and pick your usual times." },
  { key: "background", title: "Who are you, outside the gym?", subtitle: "All optional — shared backgrounds make better gym friends.", skippable: true },
  { key: "preferences", title: "Your preferences.", subtitle: "Who you'd like to train with and how you want to help out." },
  { key: "finish", title: "Finish your profile.", subtitle: "All optional — add a little more about you.", skippable: true },
  { key: "notifications", title: "Stay in the loop.", subtitle: "Get notified the moment something matters.", centered: true },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const { saveOnboarding, userId, universityKey } = useAppState();

  const [step, setStep] = useState(0); // 0-based index into STEPS
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile);
  const [expandedDay, setExpandedDay] = useState<string | null>(null); // Screen 5 UI
  const [newInterest, setNewInterest] = useState<string | null>(null); // Screen 6 UI
  /*
    Nothing is written back to the draft until the draft has been READ. Without
    this the first render — an empty profile on screen 1 — would save itself
    over the answers we were about to restore.
  */
  const [restored, setRestored] = useState(false);

  // Coming back in: pick the flow up exactly where it was left. localStorage
  // can only be touched after mount, so this can't be the initial state.
  useEffect(() => {
    const draft = readOnboardingDraft(userId);
    if (draft) {
      setProfile(draft.profile);
      setStep(Math.min(Math.max(draft.step, 0), STEPS.length - 1));
    }
    setRestored(true);
  }, [userId]);

  // Going out: every answer and the screen it was given on, after every change.
  useEffect(() => {
    if (!restored) return;
    writeOnboardingDraft(userId, step, profile);
  }, [restored, userId, step, profile]);

  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const set = <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Keep the Screen 7 mentorship answers consistent with eligibility if the user
  // goes back and changes their class year or experience level.
  useEffect(() => {
    setProfile((p) => {
      const isFreshman = p.classYear === freshmanClassYear;
      const next = {
        ...p,
        mentorFreshmen: isFreshman ? false : p.mentorFreshmen,
        beMentored: isFreshman ? p.beMentored : false,
        helpOthers: p.experienceLevel === "beginner" ? false : p.helpOthers,
        getHelp: p.experienceLevel === "advanced" ? false : p.getHelp,
      };
      const same =
        next.mentorFreshmen === p.mentorFreshmen &&
        next.beMentored === p.beMentored &&
        next.helpOthers === p.helpOthers &&
        next.getHelp === p.getHelp;
      return same ? p : next;
    });
  }, [profile.classYear, profile.experienceLevel]);

  // Required-field gating per screen (only built screens enforce; rest pass for now).
  const canContinue = (): boolean => {
    switch (meta.key) {
      case "basics":
        return (
          nameError(profile.name) === null && profile.classYear !== "" && profile.sex !== ""
        );
      case "residence":
        return profile.residence !== "";
      case "topgyms":
        return profile.topGyms.length > 0;
      case "schedule":
        return Object.values(profile.trainingSchedule).some((blocks) => blocks.length > 0);
      case "preferences":
        // Someone training alone is never matched, so who they'd be matched
        // WITH is a question that no longer applies — and isn't asked.
        return profile.trainingType === "solo" || profile.partnerPreference !== "";
      case "activity": {
        // Each activity has its own required answers. Experience level is a
        // gym question; the split and how long you've run are optional.
        switch (profile.primaryActivity) {
          case "gym":
            return profile.experienceLevel !== "" && profile.gymStyle !== "";
          case "running":
            return profile.runningDistance.trim() !== "" && profile.runningPace.trim() !== "";
          case "cardio":
            return profile.cardioType !== "";
          case "other":
            return profile.activityOther.trim() !== "";
          default:
            return false; // nothing picked yet
        }
      }
      default:
        return true;
    }
  };

  const goNext = () => {
    if (isLast) finish();
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    // eslint-disable-next-line no-console
    console.log("UNIsport onboarding profile:", profile);
    await saveOnboarding(profile); // saves to the DB + marks this account onboarded
    clearOnboardingDraft(); // the answers live in the database now
    router.replace("/gyms");
  };

  // Last screen's gold CTA: ask the OS for notification permission, register the
  // push subscription, fire a welcome ping, then finish. Denied/unsupported still
  // completes onboarding — notifications are a nicety, never a blocker.
  const enableNotifications = async () => {
    const status = await subscribeToPush();
    if (status === "granted") {
      void sendTestNotification({
        title: "Welcome to UNIsport 🎉",
        body: "Notifications are on — we'll ping you the moment something matters.",
        url: "/gyms",
      });
    }
    await finish();
  };

  const renderBody = () => {
    switch (meta.key) {
      case "basics":
        return (
          <div>
            <FieldLabel>What should we call you?</FieldLabel>
            <div className="mb-4">
              <TextField
                value={profile.name}
                onChange={(v) => set("name", v)}
                placeholder="e.g. Martin Novák"
                ariaLabel="Your name"
              />
              {/* Only complains once something has been typed — an empty field
                  on arrival is not a mistake, it's the starting state. */}
              {profile.name.trim() !== "" && nameError(profile.name) && (
                <p className="mt-1.5 text-[11px] text-danger">{nameError(profile.name)}</p>
              )}
            </div>

            <FieldLabel>Class year</FieldLabel>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {classYears.map((y) => (
                <Pill
                  key={y}
                  label={y}
                  selected={profile.classYear === y}
                  onClick={() =>
                    // Changing class year clears a now-possibly-invalid residence.
                    setProfile((p) =>
                      p.classYear === y ? p : { ...p, classYear: y, residence: "" }
                    )
                  }
                />
              ))}
            </div>

            <FieldLabel>Sex</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {sexOptions.map((s) => (
                <Pill key={s} label={s} selected={profile.sex === s} onClick={() => set("sex", s)} />
              ))}
            </div>
          </div>
        );
      case "activity":
        return (
          <div>
            {/* Activity cards (pick one) */}
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {primaryActivities.map((a) => {
                const ActIcon = activityIcons[a.icon];
                const on = profile.primaryActivity === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => set("primaryActivity", a.key)}
                    aria-pressed={on}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-colors ${
                      on ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
                    }`}
                  >
                    <span className="text-accent">
                      <ActIcon size={22} />
                    </span>
                    <span className="text-[13px] font-medium text-text">{a.label}</span>
                  </button>
                );
              })}
            </div>

            {/* From here down, each activity asks its OWN questions.
                Experience level is one of the GYM ones — "advanced" says
                nothing about a cross-trainer, and a wrong answer would feed
                matching. */}
            {profile.primaryActivity === "gym" && (
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>How do you train?</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {gymStyles.map((g) => (
                      <Pill
                        key={g}
                        label={g}
                        selected={profile.gymStyle === g}
                        onClick={() => set("gymStyle", g)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Experience level</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {experienceLevels.map((lvl) => {
                      const on = profile.experienceLevel === lvl.key;
                      return (
                        <button
                          key={lvl.key}
                          type="button"
                          onClick={() => set("experienceLevel", lvl.key)}
                          aria-pressed={on}
                          className={`rounded-[10px] border p-3 text-left transition-colors ${
                            on ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
                          }`}
                        >
                          <div className="text-[13px] font-medium text-text">{lvl.name}</div>
                          <div className="text-[11px] text-muted">{lvl.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Your split — optional</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Tapping the chosen split again clears it: it's optional,
                        so there has to be a way back to no answer. */}
                    {gymSplits.map((sp) => (
                      <Pill
                        key={sp}
                        label={sp}
                        selected={profile.gymSplit === sp}
                        onClick={() => set("gymSplit", profile.gymSplit === sp ? "" : sp)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profile.primaryActivity === "running" && (
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>Kilometres or miles?</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {runningUnits.map((u) => (
                      <Pill
                        key={u.key}
                        label={u.label}
                        selected={profile.runningUnit === u.key}
                        onClick={() => set("runningUnit", u.key)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Usual distance</FieldLabel>
                    <TextField
                      value={profile.runningDistance}
                      onChange={(v) => set("runningDistance", v)}
                      placeholder={runningHints[profile.runningUnit].distance}
                      ariaLabel="Usual distance"
                    />
                  </div>
                  <div>
                    <FieldLabel>Usual pace</FieldLabel>
                    <TextField
                      value={profile.runningPace}
                      onChange={(v) => set("runningPace", v)}
                      placeholder={runningHints[profile.runningUnit].pace}
                      ariaLabel="Usual pace"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>How long have you been running? — optional</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {runningExperiences.map((r) => (
                      <Pill
                        key={r}
                        label={r}
                        selected={profile.runningExperience === r}
                        onClick={() =>
                          set("runningExperience", profile.runningExperience === r ? "" : r)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profile.primaryActivity === "cardio" && (
              <>
                <FieldLabel>What do you do most often?</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {cardioTypes.map((c) => (
                    <Pill key={c} label={c} selected={profile.cardioType === c} onClick={() => set("cardioType", c)} />
                  ))}
                </div>
              </>
            )}

            {profile.primaryActivity === "other" && (
              <>
                <FieldLabel>Tell us what</FieldLabel>
                <TextField
                  value={profile.activityOther}
                  onChange={(v) => set("activityOther", v)}
                  placeholder="e.g. Climbing, martial arts…"
                  ariaLabel="Your activity"
                />
              </>
            )}
          </div>
        );
      case "residence": {
        const isFreshman = profile.classYear === freshmanClassYear;
        return (
          <div>
            <FieldLabel>{isFreshman ? "Your Yard dorm" : "Your house"}</FieldLabel>
            <SearchableDropdown
              options={residenceOptions(profile.classYear)}
              value={profile.residence}
              onChange={(v) => set("residence", v)}
              placeholder={isFreshman ? "Select your dorm" : "Select your house"}
              searchPlaceholder={isFreshman ? "Search dorms…" : "Search houses…"}
              ariaLabel="Where you live"
              groupOf={residenceGroup}
              icon={(o) => <ResidenceEmblem residence={o} universityKey={universityKey} />}
            />
            <p className="mt-2 text-[11px] text-muted">
              Not in {isFreshman ? "a dorm" : "a House"}? The co-op and off-campus are at the
              bottom of the list.
            </p>
          </div>
        );
      }
      case "topgyms": {
        const top = profile.topGyms;
        const available = verifiedGyms.filter((g) => !top.includes(g));
        const move = (i: number, dir: -1 | 1) => {
          const j = i + dir;
          if (j < 0 || j >= top.length) return;
          const arr = [...top];
          [arr[i], arr[j]] = [arr[j], arr[i]];
          set("topGyms", arr);
        };
        const add = (g: string) => {
          if (top.length >= MAX_TOP_GYMS || top.includes(g)) return;
          set("topGyms", [...top, g]);
        };
        const remove = (g: string) => set("topGyms", top.filter((x) => x !== g));
        return (
          <div>
            {top.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {top.map((g, i) => (
                  <div
                    key={g}
                    className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-text">{g}</span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${g} up`}
                      className="text-muted disabled:opacity-30"
                    >
                      <IconChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === top.length - 1}
                      aria-label={`Move ${g} down`}
                      className="text-muted disabled:opacity-30"
                    >
                      <IconChevronDown size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(g)}
                      aria-label={`Remove ${g}`}
                      className="text-muted"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {top.length < MAX_TOP_GYMS ? (
              <SearchableDropdown
                options={available}
                value=""
                onChange={add}
                placeholder="Add a gym"
                searchPlaceholder="Search gyms…"
                ariaLabel="Add a gym"
              />
            ) : (
              <p className="text-[12px] text-muted">That&apos;s your top 3 — remove one to swap.</p>
            )}

            <p className="mt-2 text-[11px] text-muted">
              Pick up to 3, in order — your #1 is where you train most.
            </p>
          </div>
        );
      }
      case "schedule": {
        const schedule = profile.trainingSchedule;
        const blocksFor = (day: string) => schedule[day] ?? [];
        const toggleBlock = (day: string, b: string) => {
          const cur = blocksFor(day);
          const nextBlocks = cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b];
          const next = { ...schedule };
          if (nextBlocks.length === 0) delete next[day];
          else next[day] = nextBlocks;
          set("trainingSchedule", next);
        };
        const expandedMeta = weekDays.find((d) => d.key === expandedDay);
        return (
          <div>
            <div className="mb-4 grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => {
                const hasBlocks = blocksFor(d.key).length > 0;
                const open = expandedDay === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setExpandedDay(open ? null : d.key)}
                    aria-pressed={hasBlocks}
                    aria-expanded={open}
                    className={`flex aspect-square items-center justify-center rounded-lg border text-[13px] transition-colors ${
                      hasBlocks
                        ? "border-primary bg-primary-tint text-primary"
                        : open
                          ? "border-primary bg-surface-2 text-text"
                          : "border-border bg-surface-2 text-text"
                    }`}
                  >
                    {d.letter}
                  </button>
                );
              })}
            </div>

            {expandedMeta && (
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <FieldLabel>{expandedMeta.label} — free times</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {timeBlocks.map((b) => (
                    <Pill
                      key={b}
                      label={b}
                      selected={blocksFor(expandedMeta.key).includes(b)}
                      onClick={() => toggleBlock(expandedMeta.key, b)}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] text-muted">
              Tap a day to set the times you&apos;re usually free to train.
            </p>
          </div>
        );
      }
      case "background": {
        const toggleInterest = (i: string) =>
          set(
            "interests",
            profile.interests.includes(i)
              ? profile.interests.filter((x) => x !== i)
              : [...profile.interests, i]
          );
        // Anything chosen that isn't one of our ready-made pills was typed by
        // this person. Those get their own row, each with an × on it.
        const ownInterests = profile.interests.filter((i) => !interestOptions.includes(i));
        const addInterest = () => {
          const value = (newInterest ?? "").trim();
          setNewInterest(null);
          if (value === "" || profile.interests.includes(value)) return;
          set("interests", [...profile.interests, value]);
        };
        return (
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel>What are you studying?</FieldLabel>
              <SearchableDropdown
                options={concentrations}
                value={profile.concentration}
                onChange={(v) => set("concentration", v)}
                placeholder="Select your concentration"
                ariaLabel="Concentration"
              />
            </div>

            <div>
              <FieldLabel>Where are you from?</FieldLabel>
              <SearchableDropdown
                options={countries}
                value={profile.hometownCountry}
                onChange={(v) => set("hometownCountry", v)}
                placeholder="Select your country"
                searchPlaceholder="Search countries…"
                ariaLabel="Country"
              />
            </div>

            <div>
              <FieldLabel>Languages you speak</FieldLabel>
              {/* English is on and can't be taken off — you're at Harvard. Every
                  language you do add leaves the list, so what's left to scroll
                  is only what you haven't said yet. */}
              <SearchableDropdown
                multiple
                hideSelected
                locked={[campusLanguage]}
                options={languageOptions}
                value={profile.languages}
                onChange={(v) => set("languages", v)}
                placeholder="Add languages"
                searchPlaceholder="Search languages…"
                ariaLabel="Languages"
              />
            </div>

            <div>
              <FieldLabel>Interests outside training</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {interestOptions.map((i) => (
                  <Pill
                    key={i}
                    label={i}
                    selected={profile.interests.includes(i)}
                    onClick={() => toggleInterest(i)}
                  />
                ))}

                {/* Whatever people typed themselves, always on and removable. */}
                {ownInterests.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    aria-label={`Remove ${i}`}
                    className="tap44 flex items-center gap-1.5 rounded-full border border-primary bg-primary-tint px-3.5 py-2 text-[13px] text-primary"
                  >
                    {i}
                    <IconX size={13} />
                  </button>
                ))}

                {newInterest === null ? (
                  <button
                    type="button"
                    onClick={() => setNewInterest("")}
                    className="tap44 flex items-center gap-1 rounded-full border border-dashed border-border bg-surface-2 px-3.5 py-2 text-[13px] text-muted"
                  >
                    <IconPlus size={13} />
                    Add
                  </button>
                ) : null}
              </div>

              {newInterest !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newInterest}
                    maxLength={MAX_INTEREST_LENGTH}
                    onChange={(e) => setNewInterest(e.target.value)}
                    /* Enter adds it, Escape backs out — the two things a thumb
                       on a phone keyboard reaches for. */
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      } else if (e.key === "Escape") {
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
                    className="tap44 flex-shrink-0 rounded-full border border-primary bg-primary-tint px-4 py-2 text-[13px] text-primary disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case "preferences": {
        const isFreshman = profile.classYear === freshmanClassYear;
        // Peer advising: freshmen can only be mentored; upperclassmen can only mentor.
        const peerRows = peerAdvising.filter((r) =>
          isFreshman ? r.key === "beMentored" : r.key === "mentorFreshmen"
        );
        // Gym mentorship by experience: beginner -> get help only; advanced -> help only;
        // intermediate -> both.
        const gymRows = gymMentorship.filter((r) => {
          if (profile.experienceLevel === "beginner") return r.key === "getHelp";
          if (profile.experienceLevel === "advanced") return r.key === "helpOthers";
          return true;
        });
        const renderToggleRows = (rows: typeof peerAdvising) =>
          rows.map((row, i) => (
            <div
              key={row.key}
              className={`flex items-start justify-between gap-3 py-3 ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex-1">
                <div className="text-[13px] font-medium text-text">{row.label}</div>
                <div className="text-[11px] text-muted">{row.sub}</div>
              </div>
              <Toggle on={profile[row.key]} onChange={() => set(row.key, !profile[row.key])} ariaLabel={row.label} />
            </div>
          ));
        const trainsAlone = profile.trainingType === "solo";
        return (
          <div className="flex flex-col gap-5">
            {/* One switch instead of Solo / Partner / Either. Off is the normal,
                matchable state; on takes you out of Match and stops the whole
                partner conversation, including the question below. */}
            <div className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-text">I prefer to train alone</div>
                  <div className="text-[11px] text-muted">{TRAIN_ALONE_NOTE}</div>
                </div>
                <Toggle
                  on={trainsAlone}
                  onChange={() => set("trainingType", trainsAlone ? "either" : "solo")}
                  ariaLabel="I prefer to train alone"
                />
              </div>
            </div>

            {!trainsAlone && (
              <div>
                <FieldLabel>Partner preference</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {partnerPreferences.map((p) => (
                    <Pill
                      key={p.key}
                      label={p.label}
                      selected={profile.partnerPreference === p.key}
                      onClick={() => set("partnerPreference", p.key)}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted">Who you&apos;d like to be matched with.</p>
              </div>
            )}

            <Section title="Peer advising" help="Harvard-life mentorship — optional.">
              {renderToggleRows(peerRows)}
            </Section>

            {profile.experienceLevel !== "" && (
              <Section title="Gym mentorship" help="Optional — based on your experience level.">
                {renderToggleRows(gymRows)}
              </Section>
            )}
          </div>
        );
      }
      case "finish":
        return (
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel>Bio</FieldLabel>
              <textarea
                value={profile.bio}
                maxLength={160}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="A line about you — your sport, goals, what you're training for."
                aria-label="Bio"
                className="min-h-[90px] w-full resize-none rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <div className="mt-1 text-right text-[11px] text-muted">{profile.bio.length} / 160</div>
            </div>

            <div>
              <FieldLabel>Profile photo</FieldLabel>
              <button
                type="button"
                aria-label="Add a photo"
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-7 text-center"
              >
                <span className="text-muted">
                  <IconCamera size={28} />
                </span>
                <span className="text-[13px] text-text">Add a photo</span>
                <span className="text-[11px] text-muted">Tap to upload</span>
              </button>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="rounded-xl border border-border bg-surface-2 p-4 text-left">
            {notificationItems.map((item, i) => {
              const NotifIcon = notifIcons[item.icon];
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2.5 py-2 ${
                    i < notificationItems.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <span className="text-accent">
                    <NotifIcon size={16} />
                  </span>
                  <span className="text-[13px] text-text">{item.label}</span>
                </div>
              );
            })}
          </div>
        );
      default:
        return (
          <div className="rounded-xl border border-border bg-surface-2 p-6 text-center text-[13px] text-muted">
            This screen is coming next.
          </div>
        );
    }
  };

  // Screen 9 finishes with a gold CTA + "Maybe later"; all others use Continue.
  const ctaProps = isLast
    ? {
        primaryLabel: "Enable notifications",
        primaryVariant: "gold" as const,
        onPrimary: enableNotifications,
        secondaryLabel: "Maybe later",
        onSecondary: finish,
      }
    : {
        primaryLabel: "Continue",
        primaryVariant: "primary" as const,
        primaryDisabled: !canContinue(),
        onPrimary: goNext,
      };

  const headerSlot =
    meta.key === "notifications" ? (
      <div className="mx-auto mb-6 mt-6 flex h-16 w-16 items-center justify-center rounded-full border border-primary bg-primary-tint text-primary">
        <IconBell size={28} />
      </div>
    ) : undefined;

  return (
    <OnboardingShell
      step={step + 1}
      total={STEPS.length}
      showBack={step > 0}
      onBack={goBack}
      skippable={!!meta.skippable}
      onSkip={goNext}
      title={meta.title}
      subtitle={meta.subtitle}
      centered={meta.centered}
      headerSlot={headerSlot}
      {...ctaProps}
    >
      {renderBody()}
    </OnboardingShell>
  );
}
