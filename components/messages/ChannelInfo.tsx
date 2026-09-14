"use client";

/*
  CHANNEL INFO — tap a channel's name at the top of the chat (owner, 2026-09-14:
  "copy the WhatsApp classic group chat settings and make it make sense").

    • The channel: a big icon, its name (the admin has a pencil to rename it),
      and "Private channel · 4 members".
    • MEMBERS: "Add members" first (any member can), then everyone in it — you
      first, the person who started it marked Admin. Tap someone for Message,
      View profile, and (the admin only) Remove from channel.
    • At the bottom, in red: Leave channel — or, for the admin, Delete channel.
      Both ask once more before doing it.

  The five seeded channels have no admin: nobody can rename, remove or delete
  there. The rules live in the database (db/channels_settings.sql); this screen
  only offers what they allow.

  Opened in place of the chat. All colours are theme tokens (rule 1).
*/
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SkeletonRows } from "@/components/ui/Skeleton";
import Avatar from "./Avatar";
import { AddMembers } from "./NewChannel";
import {
  addChannelMembers,
  deleteChannel,
  getChannelDetails,
  leaveChannel,
  listChannelMembers,
  removeChannelMember,
  renameChannel,
  type ChannelDetails,
  type ChannelMember,
  type ChannelPerson,
} from "@/lib/supabase/messages";
import { residenceLabel } from "@/lib/onboarding";
import {
  IconActivity,
  IconArrowLeft,
  IconBarbell,
  IconBulb,
  IconMessage,
  IconPencil,
  IconPlus,
  IconRun,
  IconStar,
} from "@/components/icons";

const CHANNEL_ICONS: Record<string, (p: { size?: number }) => React.ReactElement> = {
  barbell: IconBarbell,
  bulb: IconBulb,
  activity: IconActivity,
  star: IconStar,
  run: IconRun,
};

export default function ChannelInfo({
  channelId,
  icon,
  onBack,
  onRenamed,
  onLeft,
  onMessage,
}: {
  channelId: string;
  icon: string;
  /** Back to the chat. */
  onBack: () => void;
  onRenamed: (name: string) => void;
  /** Left or deleted — back to the channel list. */
  onLeft: () => void;
  onMessage: (person: { id: string; name: string }) => void;
}) {
  const [details, setDetails] = useState<ChannelDetails | null>(null);
  const [members, setMembers] = useState<ChannelMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<ChannelPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<ChannelMember | null>(null);
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
  const Glyph = CHANNEL_ICONS[icon] ?? IconMessage;

  const load = useCallback(
    () =>
      Promise.all([getChannelDetails(channelId), listChannelMembers(channelId)])
        .then(([d, m]) => {
          setDetails(d);
          setMembers(m);
        })
        .catch((e) => setError((e as Error).message)),
    [channelId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Every action here: busy while it runs, its refusal shown, the screen reloaded.
  const act = async (run: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await run();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <AddMembers
        title="Add members"
        doneLabel="Add to channel"
        picked={picked}
        onChange={setPicked}
        busy={busy}
        excludeIds={(members ?? []).map((m) => m.id)}
        onBack={() => {
          setAdding(false);
          setPicked([]);
        }}
        onDone={() =>
          void act(async () => {
            if (picked.length) await addChannelMembers(channelId, picked.map((p) => p.id));
            setPicked([]);
            setAdding(false);
            await load();
          })
        }
      />
    );
  }

  const count = details?.memberCount ?? 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="tap44 text-muted">
          <IconArrowLeft size={18} />
        </button>
        <h1 className="text-[14px] font-medium text-text">Channel info</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        {/* THE CHANNEL */}
        <div className="flex flex-col items-center bg-surface px-4 pb-5 pt-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary bg-primary-tint text-primary">
            <Glyph size={40} />
          </div>
          {renaming !== null ? (
            <form
              className="mt-4 flex w-full max-w-xs flex-col items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const saved = await renameChannel(channelId, renaming);
                  setRenaming(null);
                  onRenamed(saved);
                  await load();
                });
              }}
            >
              <input
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
                maxLength={40}
                autoFocus
                aria-label="Channel name"
                // 16px so a phone doesn't zoom in on focus.
                className="w-full border-b-2 border-primary bg-transparent py-1.5 text-center text-base text-text outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRenaming(null)}
                  className="rounded-full border border-border px-4 py-1.5 text-[13px] font-medium text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-primary-live px-4 py-1.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex items-center gap-1.5">
              <span className="text-center text-[20px] font-semibold text-text">
                {details ? `# ${details.name}` : " "}
              </span>
              {details?.amAdmin && (
                <button
                  type="button"
                  onClick={() => setRenaming(details.name)}
                  aria-label="Rename channel"
                  className="tap44 text-muted"
                >
                  <IconPencil size={16} />
                </button>
              )}
            </div>
          )}
          {details && (
            <div className="mt-1 text-[13px] text-muted">
              {details.private ? "Private channel" : "Public channel"} · {count} member{count === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {error && <p className="bg-surface px-4 pb-3 text-center text-[12px] text-danger">{error}</p>}

        {/* MEMBERS */}
        <div className="mt-2 bg-surface">
          <div className="px-4 pb-1 pt-3 text-[13px] text-muted">
            {details ? `${count} member${count === 1 ? "" : "s"}` : "Members"}
          </div>
          {details?.amMember && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-live text-primary-contrast">
                <IconPlus size={20} />
              </span>
              <span className="text-[14px] font-medium text-text">Add members</span>
            </button>
          )}
          {members === null ? (
            <SkeletonRows count={4} />
          ) : (
            members.map((m) => {
              const sub = [m.residence ? residenceLabel(m.residence) : null, m.classYear]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={m.id}
                  type="button"
                  // Your own row does nothing — there is nothing to do to yourself here.
                  onClick={() => !m.isMe && setMenuFor(m)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-surface-2"
                >
                  <Avatar size={44} src={m.photo} name={m.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text">
                      {m.isMe ? "You" : m.name}
                    </span>
                    {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
                  </span>
                  {m.isAdmin && (
                    <span className="shrink-0 rounded-md bg-primary-tint px-2 py-0.5 text-[11px] font-medium text-primary">
                      Admin
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* LEAVE / DELETE */}
        {details?.amMember && (
          <div className="mt-2 bg-surface">
            {details.amAdmin ? (
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="w-full px-4 py-3.5 text-left text-[14px] font-medium text-danger active:bg-surface-2"
              >
                Delete channel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm("leave")}
                className="w-full px-4 py-3.5 text-left text-[14px] font-medium text-danger active:bg-surface-2"
              >
                Leave channel
              </button>
            )}
          </div>
        )}
      </div>

      {/* A MEMBER'S MENU */}
      {menuFor && (
        <BottomMenu title={menuFor.name} onClose={() => setMenuFor(null)}>
          <MenuItem
            onClick={() => {
              const p = menuFor;
              setMenuFor(null);
              onMessage({ id: p.id, name: p.name });
            }}
          >
            Message {menuFor.name.split(/\s+/)[0]}
          </MenuItem>
          <Link
            href={`/people/${menuFor.id}`}
            className="block w-full border-t border-border px-4 py-3.5 text-left text-[14px] text-text active:bg-surface-2"
          >
            View profile
          </Link>
          {details?.amAdmin && (
            <MenuItem
              danger
              onClick={() => {
                const p = menuFor;
                setMenuFor(null);
                void act(async () => {
                  await removeChannelMember(channelId, p.id);
                  await load();
                });
              }}
            >
              Remove from channel
            </MenuItem>
          )}
        </BottomMenu>
      )}

      {/* ASKED ONCE MORE */}
      {confirm && details && (
        <BottomMenu
          title={
            confirm === "delete"
              ? `Delete # ${details.name}? Its messages go for everyone.`
              : `Leave # ${details.name}?`
          }
          onClose={() => setConfirm(null)}
        >
          <MenuItem
            danger
            onClick={() => {
              const what = confirm;
              setConfirm(null);
              void act(async () => {
                if (what === "delete") await deleteChannel(channelId);
                else await leaveChannel(channelId);
                onLeft();
              });
            }}
          >
            {confirm === "delete" ? "Delete channel" : "Leave channel"}
          </MenuItem>
          <MenuItem onClick={() => setConfirm(null)}>Cancel</MenuItem>
        </BottomMenu>
      )}
    </div>
  );
}

function BottomMenu({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70"
      />
      <div role="menu" className="relative mx-auto w-full max-w-screen-sm overflow-hidden rounded-t-3xl border-t border-border bg-surface pb-6">
        <div className="px-4 pb-3 pt-4 text-center text-[13px] text-muted">{title}</div>
        {children}
      </div>
    </div>
  );
}

function MenuItem({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full border-t border-border px-4 py-3.5 text-left text-[14px] active:bg-surface-2 ${
        danger ? "font-medium text-danger" : "text-text"
      }`}
    >
      {children}
    </button>
  );
}
