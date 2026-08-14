"use client";

/*
  Shared read/write for the signed-in user's profile row.

  The Profile tab and the Settings page both edit the same `profiles.data` JSON
  blob, so the load, the merge-and-save, and the save status live here instead of
  being written twice and drifting apart.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { deriveTrainingDisplay, type CurrentUser } from "@/lib/currentUser";
import type { OnboardingProfile } from "@/lib/onboarding";

export type ProfileSaveState = "idle" | "saving" | "saved" | "error";

// Stable empty profile for environments with no database configured, so the
// "no DB" case doesn't hand back a fresh object on every render.
const NO_PROFILE: Record<string, unknown> = {};

export function useProfileData() {
  const { userId } = useAppState();
  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  const [fetched, setFetched] = useState<Record<string, unknown> | null>(null);
  // Tiny status so saving to the database is visible (and failures aren't silent).
  const [saveState, setSaveState] = useState<ProfileSaveState>("idle");

  const noDatabase = !supabase || !userId;

  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    supabase
      .from("profiles")
      .select("data")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (active) setFetched((row?.data as Record<string, unknown>) ?? {});
      });
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  /*
    Derived rather than stored, so nothing is set synchronously inside the effect
    (that causes cascading renders, and React's lint rule rightly flags it). With
    no database there is nothing to wait for, so loading is simply false.
  */
  // With no database, edits still land in `fetched` and stay for the session.
  const data = noDatabase ? (fetched ?? NO_PROFILE) : fetched;
  const loading = !noDatabase && fetched === null;

  /*
    Merge a patch into the saved JSON and persist it. The write deliberately sits
    OUTSIDE the state updater so it runs once rather than twice under StrictMode.
  */
  const update = (patch: Partial<CurrentUser>) => {
    const next = { ...(data ?? {}), ...patch };
    setFetched(next);
    if (!supabase || !userId) return; // no DB in this environment → in-memory only
    setSaveState("saving");
    supabase
      .from("profiles")
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) {
          console.error("Profile save failed:", error.message);
          setSaveState("error");
        } else {
          setSaveState("saved");
        }
      });
  };

  // Save edited onboarding answers, re-deriving the Training rows so they stay
  // consistent with the new answers.
  const savePreferences = (patch: Partial<OnboardingProfile>) => {
    const merged = { ...(data as Partial<OnboardingProfile>), ...patch } as OnboardingProfile;
    update({ ...patch, trainingDisplay: deriveTrainingDisplay(merged) });
  };

  return { data, loading, saveState, update, savePreferences, supabase, userId };
}
