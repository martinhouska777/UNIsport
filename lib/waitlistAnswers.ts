/*
  THE THREE WAITLIST QUESTIONS (owner, 2026-10-16: "after the code, ask year,
  House and what they train, and carry all three into onboarding").

  Asked on the waitlist's done screen, once the code has made the account, so
  nobody is lost at the door for them. Saved into the account's own
  `profiles.data` under `waitlist`, beside whatever else is there, and nothing
  else: the profile stays "not onboarded", so these people are still hidden
  from Match, follows and the boards until they finish onboarding.

  Onboarding then opens with the three already picked (OnboardingFlow), so
  nobody answers them twice. The owner reads them in Supabase:
    select u.email, p.data->'waitlist'
      from profiles p join auth.users u on u.id = p.id
     where p.data ? 'waitlist';
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  classYears,
  primaryActivities,
  residenceOptions,
  type PrimaryActivity,
} from "@/lib/onboarding";

export type WaitlistAnswers = {
  classYear: string;
  residence: string;
  primaryActivity: PrimaryActivity | "";
};

export const emptyWaitlistAnswers: WaitlistAnswers = {
  classYear: "",
  residence: "",
  primaryActivity: "",
};

/*
  Only values the onboarding screens would offer survive, so a stale class year
  (the list moves on every summer) or a hand-edited row can never land in
  onboarding as an answer it cannot show.
*/
function clean(raw: unknown): WaitlistAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const classYear = typeof r.classYear === "string" && classYears.includes(r.classYear) ? r.classYear : "";
  const residence =
    typeof r.residence === "string" && residenceOptions(classYear).includes(r.residence) ? r.residence : "";
  const primaryActivity = primaryActivities.some((a) => a.key === r.primaryActivity)
    ? (r.primaryActivity as PrimaryActivity)
    : "";
  if (!classYear && !residence && !primaryActivity) return null;
  return { classYear, residence, primaryActivity };
}

/*
  What this account holds. `onboarded` = the student onboarding was finished at
  some point: the flag, or its required answer (`primaryActivity`) at the top
  of `data`, which a replay leaves in place while the flag is cleared. Such an
  account is not asked on the waitlist, and onboarding does not prefill it.
  Null when the read failed.
*/
export async function readWaitlistAnswers(
  userId: string | null,
): Promise<{ answers: WaitlistAnswers | null; onboarded: boolean } | null> {
  if (!userId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("profiles")
    .select("data, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  const data = (row?.data as Record<string, unknown> | undefined) ?? {};
  return {
    answers: clean(data.waitlist),
    onboarded: !!row?.onboarding_completed || !!data.primaryActivity,
  };
}

/* True when saved. Merged onto `data`, never replacing it. */
export async function saveWaitlistAnswers(userId: string | null, answers: WaitlistAnswers): Promise<boolean> {
  if (!userId || !hasSupabaseEnv()) return false;
  const supabase = createClient();
  const { data: row, error: readError } = await supabase
    .from("profiles")
    .select("data")
    .eq("id", userId)
    .maybeSingle();
  // Merging onto a read that failed would replace the whole profile.
  if (readError) return false;
  const current = (row?.data as Record<string, unknown> | undefined) ?? {};
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    data: { ...current, waitlist: answers },
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("waitlist answers:", error.message);
    return false;
  }
  return true;
}
