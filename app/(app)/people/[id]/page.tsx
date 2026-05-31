"use client";

/*
  OTHER PERSON'S PROFILE (reached from the Match tab's "View Profile" button).

  Mirrors the mockup (other people profile_screen_view.html): back bar, identity
  block with name + badges + match% pill, bio, stats, a Training detail list,
  interests, and a bottom Follow / Message action bar.

  Data is REAL: it loads the person's public profile via the get_public_profile
  RPC (RLS-safe) and runs it through profileFromOnboarding — the SAME mapping the
  owner's own Profile tab uses — so nothing here is faked. The match % is the
  exact number shown on the card the user tapped (passed via ?pct=), shown only
  when present. All colors are theme tokens (rule 1).
*/
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getPublicProfile } from "@/lib/supabase/profiles";
import { profileFromOnboarding, classOfLabel, type CurrentUser } from "@/lib/currentUser";
import { IconArrowLeft, IconUser } from "@/components/icons";

// useSearchParams() requires a Suspense boundary or the production build fails
// ("Missing Suspense boundary with useSearchParams"), so the page wraps the
// real screen in one.
export default function PersonProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-20 text-center text-sm text-muted">Loading profile…</div>
      }
    >
      <PersonProfile />
    </Suspense>
  );
}

function PersonProfile() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = params.id;
  const pctParam = search.get("pct");
  const pct = pctParam && /^\d+$/.test(pctParam) ? Number(pctParam) : null;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    getPublicProfile(id)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setStatus("missing");
          return;
        }
        setUser(profileFromOnboarding(data));
        setStatus("ready");
      })
      .catch((e) => {
        if (!active) return;
        setErrMsg((e as Error).message);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const trainingRows: { key: keyof CurrentUser["trainingDisplay"]; label: string }[] = [
    { key: "level", label: "Level" },
    { key: "type", label: "Type" },
    { key: "split", label: "Split" },
    { key: "schedule", label: "Schedule" },
    { key: "gym", label: "Gym" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-1 flex-col">
      {/* Back bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3 py-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="text-muted"
        >
          <IconArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-text">Profile</span>
        <span className="w-[18px]" aria-hidden="true" />
      </div>

      {status === "loading" && (
        <div className="px-6 py-20 text-center text-sm text-muted">Loading profile…</div>
      )}
      {status === "missing" && (
        <div className="px-6 py-20 text-center text-sm text-muted">
          This profile isn’t available.
        </div>
      )}
      {status === "error" && (
        <div className="px-6 py-20 text-center text-sm text-muted">
          Couldn’t load this profile: {errMsg}
        </div>
      )}

      {status === "ready" && user && (
        <>
          {/* Identity */}
          <div className="flex flex-col items-center gap-2.5 border-b border-border px-4 pb-4 pt-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/15 text-primary">
              <IconUser size={34} />
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-medium text-text">
                  {user.name || "Member"}
                </span>
                {user.badges.varsity && (
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-background">
                    VARSITY
                  </span>
                )}
              </div>

              {(user.residence || user.classYear) && (
                <div className="text-[11px] text-muted">
                  {user.residence ? `${user.residence} House` : ""}
                  {user.residence && user.classYear ? " · " : ""}
                  {user.classYear ? classOfLabel(user.classYear) : ""}
                </div>
              )}

              {(pct !== null || user.badges.mentor) && (
                <div className="mt-0.5 flex items-center gap-2">
                  {pct !== null && (
                    <span className="rounded-lg border border-primary bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {pct}% match
                    </span>
                  )}
                  {user.badges.mentor && (
                    <span className="rounded-lg border border-success bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                      Mentor
                    </span>
                  )}
                </div>
              )}
            </div>

            {user.bio && (
              <div className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5">
                <p className="text-center text-[12px] leading-relaxed text-muted">{user.bio}</p>
              </div>
            )}
          </div>

          {/* Training */}
          <div className="border-b border-border px-4 py-3">
            <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
              Training
            </div>
            <div className="flex flex-col divide-y divide-border">
              {trainingRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-muted">{row.label}</span>
                  <span className="text-right text-xs font-medium text-text">
                    {user.trainingDisplay[row.key] || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interests */}
          {user.interests.length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
                Interests
              </div>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {(user.concentration || user.hometownCountry || user.languages.length > 0) && (
            <div className="border-b border-border px-4 py-3">
              <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
                About
              </div>
              <div className="flex flex-col divide-y divide-border">
                {user.concentration && (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-muted">Concentration</span>
                    <span className="text-right text-xs font-medium text-text">
                      {user.concentration}
                    </span>
                  </div>
                )}
                {user.hometownCountry && (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-muted">From</span>
                    <span className="text-right text-xs font-medium text-text">
                      {user.hometownCountry}
                    </span>
                  </div>
                )}
                {user.languages.length > 0 && (
                  <div className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-muted">Languages</span>
                    <span className="text-right text-xs font-medium text-text">
                      {user.languages.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom action bar — not wired yet (Follow needs a follow system,
              Message needs the Messages backend). Present so the layout is
              reviewable; both are the next slices. */}
          <div className="sticky bottom-0 z-20 mt-auto flex gap-2.5 border-t border-border bg-surface px-4 py-3">
            <button
              type="button"
              disabled
              className="flex-1 rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text opacity-50"
            >
              Follow
            </button>
            <button
              type="button"
              disabled
              className="flex-[2] rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast opacity-50"
            >
              Message
            </button>
          </div>
        </>
      )}
    </div>
  );
}
