"use client";

/*
  FOLLOW LIST SHEET — opened from the "12 followers · 8 following" line on a
  profile (somebody else's, or your own Followers stat). A bottom sheet with
  two tabs, Followers and Following, exactly the Instagram shape: a row per
  person with their photo, name and house · class, a Follow button on the
  rows you don't follow yet, and the row itself opens their profile.

  Data is REAL (db/follow_lists.sql). Colours are theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/messages/Avatar";
import { useAppState } from "@/components/AppState";
import {
  listFollows,
  followUser,
  unfollowUser,
  type FollowKind,
  type FollowPerson,
} from "@/lib/supabase/follows";
import { residenceLabel, classYearLabel } from "@/lib/onboarding";
import { IconX, IconCheck } from "@/components/icons";

export default function FollowListSheet({
  userId,
  initialTab,
  counts,
  onClose,
}: {
  /** Whose lists these are. */
  userId: string;
  initialTab: FollowKind;
  counts: { followers: number; following: number };
  onClose: () => void;
}) {
  const router = useRouter();
  const { userId: meId } = useAppState();
  const [tab, setTab] = useState<FollowKind>(initialTab);
  // Each tab is fetched once and kept, so flipping back is instant.
  const [lists, setLists] = useState<Partial<Record<FollowKind, FollowPerson[]>>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (lists[tab]) return;
    let active = true;
    listFollows(userId, tab)
      .then((rows) => active && setLists((l) => ({ ...l, [tab]: rows })))
      .catch((e) => active && setError((e as Error).message));
    return () => {
      active = false;
    };
  }, [userId, tab, lists]);

  const open = (id: string) => {
    onClose();
    router.push(id === meId ? "/profile" : `/people/${id}`);
  };

  // Follow / unfollow one row, optimistically, in whichever tab it sits.
  const toggle = async (p: FollowPerson) => {
    const next = !p.following;
    const patch = (on: boolean) =>
      setLists((l) => {
        const out: typeof l = {};
        for (const k of Object.keys(l) as FollowKind[]) {
          out[k] = l[k]!.map((r) => (r.id === p.id ? { ...r, following: on } : r));
        }
        return out;
      });
    patch(next);
    try {
      if (next) await followUser(p.id);
      else await unfollowUser(p.id);
    } catch (e) {
      patch(!next);
      setError((e as Error).message);
    }
  };

  const rows = lists[tab];
  const tabs: { key: FollowKind; label: string; n: number }[] = [
    { key: "followers", label: "Followers", n: counts.followers },
    { key: "following", label: "Following", n: counts.following },
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-floor relative flex max-h-[82%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* Two tabs across the top, the count in each. */}
        <div className="flex items-center border-b border-border px-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`tap44 relative flex-1 pb-2.5 pt-1.5 text-center text-[13px] ${
                tab === t.key ? "font-semibold text-text" : "font-medium text-muted"
              }`}
            >
              <span className="tabular-nums">{t.n}</span> {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap44 press-icon ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {error && <div className="px-4 py-3 text-[12px] text-danger">{error}</div>}
          {!rows && !error && (
            <div className="px-6 py-12 text-center text-[12px] text-muted">Loading…</div>
          )}
          {rows && rows.length === 0 && (
            <div className="px-6 py-12 text-center text-[13px] text-muted">
              {tab === "followers" ? "No followers yet." : "Not following anyone yet."}
            </div>
          )}
          {rows && rows.length > 0 && (
            <div className="flex flex-col divide-y divide-border">
              {rows.map((p) => {
                const sub = [
                  p.residence ? residenceLabel(p.residence) : null,
                  p.classYear ? classYearLabel(p.classYear) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const isMe = p.id === meId;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => open(p.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar size={44} src={p.photo} name={p.name} alt={p.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-text">
                          {p.name}
                        </span>
                        {sub && (
                          <span className="mt-0.5 block truncate text-[11.5px] text-muted">{sub}</span>
                        )}
                      </span>
                    </button>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => toggle(p)}
                        aria-pressed={p.following}
                        className={`flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[12px] font-medium transition-colors ${
                          p.following
                            ? "border-border bg-surface text-muted"
                            : "border-primary bg-primary text-primary-contrast"
                        }`}
                      >
                        {p.following && <IconCheck size={12} />}
                        {p.following ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
