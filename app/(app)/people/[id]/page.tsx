"use client";

/*
  OTHER PERSON'S PROFILE (reached from the Match tab's "View Profile" button).

  Restyled 2026-09-22 to the owner's pick, direction C of
  mockups/people-profile/person-profile-mockups.html: white lifted cards on the
  page, the photo beside the name, followers / following counts that open the
  lists (Instagram-style), "Why you match" as the one crimson-tinted card,
  Training as four tiles plus their week laid over YOURS so the shared hours
  are visible without asking, and the Follow / Message bar kept at the bottom.

  Data is REAL: it loads the person's public profile via the get_public_profile
  RPC (RLS-safe) and runs it through profileFromOnboarding — the SAME mapping the
  owner's own Profile tab uses — so nothing here is faked. The fit tier is the
  same one shown on the card the user tapped (passed via ?fit=), shown only
  when present. All colors are theme tokens (rule 1).
*/
import { Suspense, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getPublicProfile } from "@/lib/supabase/profiles";
import { profileFromOnboarding, classOfLabel, type CurrentUser } from "@/lib/currentUser";
import { residenceLabel, hometownLabel } from "@/lib/onboarding";
import { MATCH_TIER_LABELS } from "@/lib/matchTier";
import { getPairMatch, type Match } from "@/lib/supabase/matching";
import { matchReasons, type MatchReason } from "@/lib/matchReasons";
import { useAppState } from "@/components/AppState";
import { startDirectConversation } from "@/lib/supabase/messages";
import { getFollowStatus, followUser, unfollowUser } from "@/lib/supabase/follows";
import { IconArrowLeft, IconUser, IconCheck } from "@/components/icons";
import PhotoGallery from "@/components/profile/PhotoGallery";
import ProfileBadge from "@/components/ProfileBadge";
import ScheduleOverlap from "@/components/people/ScheduleOverlap";
import FollowListSheet from "@/components/people/FollowListSheet";
import { getFollowCounts, type FollowKind } from "@/lib/supabase/follows";
import SectionLabel from "@/components/ui/SectionLabel";

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
  // Only ever the labels we ourselves emit — never arbitrary text from the URL.
  const fitParam = search.get("fit");
  const fit = fitParam && MATCH_TIER_LABELS.includes(fitParam) ? fitParam : null;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string>("");
  const [messaging, setMessaging] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null); // null until known
  const [followsBack, setFollowsBack] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  // Their two follow totals, and which list (if any) is open in the sheet.
  const [counts, setCounts] = useState<{ followers: number; following: number } | null>(null);
  const [listOpen, setListOpen] = useState<FollowKind | null>(null);
  // YOUR week, for the comparison grid — null until it has loaded.
  const [mySchedule, setMySchedule] = useState<Record<string, string[]> | null>(null);

  /*
    "Why you match" is re-asked of the database rather than carried over from the
    card that was tapped, so it's still right when this page is refreshed, opened
    from a link, or reached from anywhere that isn't the Match tab. Empty when
    the two share nothing, or when the pairing isn't valid at all.
  */
  const { userId: meId } = useAppState();
  const [reasons, setReasons] = useState<MatchReason[]>([]);
  // Kept alongside `reasons` so the interests grid below can tell which of
  // THEIR interests are actually shared with the viewer (m.facts.interests is
  // already that overlap — see lib/supabase/matching.ts) rather than colouring
  // every interest the same regardless of whether the two of you share it.
  const [match, setMatch] = useState<Match | null>(null);

  // Your own id in a shared link: this page is other people. Follow and Message
  // on yourself only ever produced a raw database error, so go to My Profile.
  useEffect(() => {
    if (meId && id && meId === id) router.replace("/profile");
  }, [meId, id, router]);

  useEffect(() => {
    if (!meId || !id || meId === id) return;
    let active = true;
    getPairMatch(meId, id)
      .then((m) => {
        if (!active || !m) return;
        setMatch(m);
        setReasons(matchReasons(m));
      })
      .catch(() => {
        /* The profile itself is the point; no reasons is a fine outcome. */
      });
    return () => {
      active = false;
    };
  }, [meId, id]);

  const sharedInterests = new Set(match?.facts.interests ?? []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getFollowCounts(id)
      .then((c) => active && setCounts(c))
      .catch(() => active && setCounts({ followers: 0, following: 0 }));
    return () => {
      active = false;
    };
  }, [id]);

  // Your own week, read through the same public-profile RPC (RLS-safe).
  useEffect(() => {
    if (!meId) return;
    let active = true;
    getPublicProfile(meId)
      .then((d) => {
        if (!active) return;
        const sched = (d?.trainingSchedule as Record<string, string[]> | undefined) ?? {};
        setMySchedule(sched);
      })
      .catch(() => active && setMySchedule({}));
    return () => {
      active = false;
    };
  }, [meId]);

  // Toggle follow/unfollow, updating the button optimistically.
  const toggleFollow = async () => {
    if (!id || following === null || followBusy) return;
    const next = !following;
    setFollowBusy(true);
    setFollowing(next); // optimistic
    setCounts((c) => (c ? { ...c, followers: Math.max(0, c.followers + (next ? 1 : -1)) } : c));
    try {
      if (next) await followUser(id);
      else await unfollowUser(id);
    } catch (e) {
      setFollowing(!next); // revert on failure
      setCounts((c) => (c ? { ...c, followers: Math.max(0, c.followers + (next ? -1 : 1)) } : c));
      setErrMsg((e as Error).message);
    } finally {
      setFollowBusy(false);
    }
  };

  // Open (or create) a direct conversation with this person, then jump to it.
  const message = async () => {
    if (!id || messaging) return;
    setMessaging(true);
    try {
      const convId = await startDirectConversation(id);
      const name = user?.name || "Member";
      router.push(
        `/messages?dm=${convId}&name=${encodeURIComponent(name)}&uid=${encodeURIComponent(id)}`,
      );
    } catch (e) {
      setErrMsg((e as Error).message);
      setMessaging(false);
    }
  };

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

  // Load whether the signed-in user already follows this person.
  useEffect(() => {
    if (!id) return;
    let active = true;
    getFollowStatus(id)
      .then((s) => {
        if (!active) return;
        setFollowing(s.following);
        setFollowsBack(s.followsBack);
      })
      .catch(() => active && setFollowing(false));
    return () => {
      active = false;
    };
  }, [id]);

  // The four facts as tiles. Schedule is not one of them — it is the grid below.
  const tiles: { key: keyof CurrentUser["trainingDisplay"]; label: string }[] = [
    { key: "level", label: "Level" },
    { key: "type", label: "Type" },
    { key: "split", label: "Split" },
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
          <div className="flex flex-col gap-2.5 px-3.5 pb-3 pt-3">
            {/* WHO THEY ARE — photo beside the name, house · class, fit and
                Mentor pills, the bio, then the two follow totals, each a
                button that opens the list. */}
            <div className="rounded-2xl border border-border bg-surface p-3.5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
                  {user.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photo} alt={user.name || "Profile photo"} className="h-full w-full object-cover" />
                  ) : (
                    <IconUser size={30} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[18px] font-semibold tracking-[-0.01em] text-text">
                      {user.name || "Member"}
                    </span>
                    {user.badges.varsity && <ProfileBadge kind="varsity" />}
                  </div>
                  {(user.residence || user.classYear) && (
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {residenceLabel(user.residence ?? "")}
                      {user.residence && user.classYear ? " · " : ""}
                      {user.classYear ? classOfLabel(user.classYear) : ""}
                    </div>
                  )}
                  {(fit !== null || user.badges.mentor) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {fit !== null && (
                        <span className="rounded-full border border-primary-line bg-primary-tint px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
                          {fit}
                        </span>
                      )}
                      {user.badges.mentor && (
                        <span className="rounded-full border border-success-line bg-success-tint px-2.5 py-0.5 text-[11.5px] font-semibold text-success">
                          Mentor
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {user.bio && (
                <p className="mt-3 text-[13.5px] leading-relaxed text-text-2">{user.bio}</p>
              )}

              <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
                {(
                  [
                    { key: "followers", word: counts?.followers === 1 ? "follower" : "followers", n: counts?.followers },
                    { key: "following", word: "following", n: counts?.following },
                  ] as { key: FollowKind; word: string; n: number | undefined }[]
                ).map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    disabled={counts === null}
                    onClick={() => setListOpen(c.key)}
                    className="flex items-baseline gap-1 rounded-md text-[13px] active:opacity-60"
                  >
                    <span className="font-semibold tabular-nums text-text">{c.n ?? "—"}</span>
                    <span className="text-muted">{c.word}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WHY YOU MATCH — the one tinted card on the page, because it is
                what the tap was asking. EVERY reason, not the handful the card
                had room for. */}
            {reasons.length > 0 && (
              <div className="rounded-2xl border border-primary-line bg-primary-tint p-3.5">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Why you match
                </div>
                <ul className="flex flex-col gap-2">
                  {reasons.map((r) => (
                    <li key={r.key} className="flex items-start gap-2.5">
                      <span className="mt-px flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                        <IconCheck size={11} />
                      </span>
                      <span className="text-[13.5px] leading-snug text-text">{r.full}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* TRAINING — four tiles, then their week over yours. */}
            <div className="rounded-2xl border border-border bg-surface p-3.5">
              <SectionLabel>Training</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {tiles.map((t) => (
                  <div key={t.key} className="rounded-lg border border-border px-3 py-2.5">
                    <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-3">{t.label}</div>
                    <div className="mt-0.5 text-[14px] font-semibold leading-tight text-text">
                      {user.trainingDisplay[t.key] || "—"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <ScheduleOverlap theirs={user.trainingSchedule} mine={mySchedule} />
              </div>
            </div>

            {/* INTERESTS — chips that fit their word. The school's colour only
                on the ones you ACTUALLY share (m.facts.interests is that
                overlap); the rest stay grey, same shape. */}
            {user.interests.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <SectionLabel>Interests</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.interests.map((tag) => {
                    const shared = sharedInterests.has(tag);
                    return (
                      <span
                        key={tag}
                        title={shared ? "You both like this" : undefined}
                        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium ${
                          shared
                            ? "border-accent-line bg-accent-tint text-accent"
                            : "border-border text-muted"
                        }`}
                      >
                        {shared && <IconCheck size={11} />}
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ABOUT — what they study, where they're from, what they speak. */}
            {(user.concentration ||
              user.hometownCity ||
              user.hometownCountry ||
              user.languages.length > 0) && (
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <SectionLabel>About</SectionLabel>
                <div className="mt-1 flex flex-col divide-y divide-border">
                  {user.concentration && (
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[13px] text-muted">Concentration</span>
                      <span className="text-right text-[13px] font-medium text-text">{user.concentration}</span>
                    </div>
                  )}
                  {(user.hometownCity || user.hometownCountry) && (
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[13px] text-muted">From</span>
                      <span className="text-right text-[13px] font-medium text-text">
                        {hometownLabel(user.hometownCity, user.hometownCountry)}
                      </span>
                    </div>
                  )}
                  {user.languages.length > 0 && (
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-[13px] text-muted">Languages</span>
                      <span className="text-right text-[13px] font-medium text-text">
                        {user.languages.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PHOTOS (only when they chose to show them) */}
            {user.photos.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <SectionLabel>Photos</SectionLabel>
                <div className="mt-2">
                  <PhotoGallery photos={user.photos} />
                </div>
              </div>
            )}

            {/* PERSONAL RECORDS (only when they chose to show them) */}
            {user.personalRecords.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-3.5">
                <SectionLabel>Personal records</SectionLabel>
                <div className="mt-1 flex flex-col divide-y divide-border">
                  {user.personalRecords.map((pr, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <span className="text-[13px] text-muted">{pr.lift}</span>
                      <span className="text-[13px] font-medium tabular-nums text-text">{pr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {listOpen && counts && (
            <FollowListSheet
              userId={id}
              initialTab={listOpen}
              counts={counts}
              onClose={() => setListOpen(null)}
            />
          )}

          {/* Bottom action bar — Follow and Message, pinned. */}
          <div className="sticky bottom-0 z-20 mt-auto flex gap-2.5 border-t border-border bg-surface px-4 py-3">
            <button
              type="button"
              onClick={toggleFollow}
              disabled={following === null || followBusy}
              aria-pressed={following === true}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border px-5 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
                following
                  ? "border-primary bg-primary-tint text-primary"
                  : "border-border bg-surface text-text"
              }`}
            >
              {following && <IconCheck size={15} />}
              {following ? "Following" : followsBack ? "Follow back" : "Follow"}
            </button>
            <Button size="lg" onClick={message} disabled={messaging} className="flex-[2]">
              {messaging ? "Opening…" : "Message"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
