"use client";

/*
  SQUAD SETTINGS — running the squad. The captain's whole console; for a coach,
  the screen behind the gear in the top bar (/varsity/coach/settings). It is
  deliberately NOT one of the four nav tabs: those are the daily screens, and
  handing out an invite link is a once-a-term job.

  Three things, in the order they matter:
    1. WAITING ROOM — people who used a link and need letting in. This is the
       actual gate; a forwarded link only ever lands someone here.
    2. INVITE LINKS — generate one to paste into WhatsApp, watch how many people
       came through it, and revoke it the moment it leaks.
    3. THE SQUAD — who is in, and (coach only) who is a captain. A COACH can
       also open anyone here to see their training; a captain cannot, and gets
       no chevron, because the database would refuse them anyway
       (db/varsity_coach_reads.sql).

  Nothing here is a security boundary: every button calls a database function
  that re-checks the caller's role. See db/varsity_teams.sql.
  All colors are theme tokens (rule 1); the link presets are data (lib/varsity/invites).
*/
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  createInvite,
  inviteState,
  inviteUrl,
  invitePresets,
  listInvites,
  revokeInvite,
  type Invite,
} from "@/lib/varsity/invites";
import {
  can,
  fetchSquad,
  roleLabel,
  setMemberRole,
  setMemberStatus,
  type Membership,
  type SquadMember,
  type VarsityRole,
} from "@/lib/varsity/membership";
import { IconCheck, IconChevronRight, IconCopy, IconSend, IconTrash, IconX } from "@/components/icons";

/* A titled block, matching the section labels used across Varsity Mode. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-3.5 py-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/* How long a link has left, in words a person would actually say. */
function expiryLabel(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours} hour${hours === 1 ? "" : "s"} left`;
}

const stateLabel: Record<ReturnType<typeof inviteState>, { text: string; tone: string }> = {
  live: { text: "Live", tone: "text-success" },
  revoked: { text: "Cancelled", tone: "text-muted" },
  expired: { text: "Expired", tone: "text-muted" },
  used_up: { text: "Full", tone: "text-warn" },
};

export default function TeamAdminScreen({ membership }: { membership: Membership }) {
  const { teamId, role } = membership;

  const [squad, setSquad] = useState<SquadMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The link just made — shown big, with copy + share, because that is the
  // whole point of the screen.
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailFor, setEmailFor] = useState<string | null>(null); // personal-link email prompt
  const [emailValue, setEmailValue] = useState("");

  const reload = useCallback(async () => {
    const [s, i] = await Promise.all([fetchSquad(teamId), listInvites(teamId)]);
    setSquad(s);
    setInvites(i);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const pending = squad.filter((m) => m.status === "pending");
  const approved = squad.filter((m) => m.status === "approved");

  /* ── Make a link ── */
  const generate = async (presetKey: string, emailLock?: string) => {
    const preset = invitePresets.find((p) => p.key === presetKey);
    if (!preset) return;
    setBusy("new");
    setError(null);
    const { code, error: err } = await createInvite(teamId, {
      label: preset.label,
      maxUses: preset.maxUses,
      days: preset.days,
      emailLock: emailLock ?? null,
    });
    setBusy(null);
    if (err || !code) {
      setError(err ?? "Could not create the link");
      return;
    }
    setFresh(inviteUrl(code));
    setEmailFor(null);
    setEmailValue("");
    reload();
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the link is on screen to copy by hand */
    }
  };

  // The WhatsApp / email hand-off: the phone's own share sheet.
  const share = async (url: string) => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Join ${membership.teamName}`,
          text: `Join ${membership.teamName} on UNIsport`,
          url,
        });
        return;
      } catch {
        /* cancelled — fall back to the clipboard */
      }
    }
    copy(url);
  };

  const decide = async (userId: string, status: "approved" | "removed") => {
    setBusy(userId);
    const { error: err } = await setMemberStatus(teamId, userId, status);
    setBusy(null);
    if (err) setError(err);
    else reload();
  };

  const promote = async (userId: string, next: VarsityRole) => {
    setBusy(userId);
    const { error: err } = await setMemberRole(teamId, userId, next);
    setBusy(null);
    if (err) setError(err);
    else reload();
  };

  const kill = async (inviteId: string) => {
    setBusy(inviteId);
    const { error: err } = await revokeInvite(inviteId);
    setBusy(null);
    if (err) setError(err);
    else reload();
  };

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-10">
      {error && (
        <p className="mx-3.5 mt-3 rounded-xl border border-danger-line bg-danger-tint px-3.5 py-2.5 text-[12px] text-danger">
          {error}
        </p>
      )}

      {/* ── 1. The waiting room ── */}
      <Section
        title={`Waiting to join${pending.length ? ` · ${pending.length}` : ""}`}
        hint={
          pending.length
            ? "These people used an invite link. Nobody sees the team's training until you let them in."
            : undefined
        }
      >
        {pending.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface px-3.5 py-3 text-[12px] text-muted">
            Nobody waiting. Requests from your invite links land here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-3 rounded-xl border border-warn-line bg-surface px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{m.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">{m.email}</div>
                  {m.inviteLabel && (
                    <div className="mt-0.5 text-[11px] text-muted">via {m.inviteLabel}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => decide(m.userId, "removed")}
                  disabled={busy === m.userId}
                  aria-label={`Reject ${m.name}`}
                  className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-muted disabled:opacity-50"
                >
                  <IconX size={14} />
                </button>
                <Button size="sm" onClick={() => decide(m.userId, "approved")} disabled={busy === m.userId}>
                  <IconCheck size={13} />
                  Let in
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── 2. Invite links ── */}
      <Section
        title="Invite links"
        hint="A link can only ever add someone as an athlete, and only on a university email. If one leaks, cancel it — anyone already let in keeps their place."
      >
        {/* The link just generated */}
        {fresh && (
          <div className="mb-3 rounded-xl border border-accent-line bg-accent/5 px-3.5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              Ready to send
            </div>
            <div className="mt-1.5 break-all rounded-lg border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-text">
              {fresh}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => copy(fresh)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] font-semibold text-text"
              >
                {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => share(fresh)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[11px] font-semibold text-background"
              >
                <IconSend size={13} />
                Send
              </button>
            </div>
          </div>
        )}

        {/* The two shapes of link */}
        <div className="flex flex-col gap-2">
          {invitePresets.map((p) => (
            <div key={p.key} className="rounded-xl border border-border bg-surface px-3.5 py-3">
              <div className="text-sm font-medium text-text">{p.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{p.blurb}</p>

              {p.needsEmail && emailFor === p.key ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (emailValue.trim()) generate(p.key, emailValue.trim().toLowerCase());
                  }}
                  className="mt-2.5 flex items-center gap-2"
                >
                  <input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    placeholder="their university email"
                    autoFocus
                    aria-label="University email to lock this invite to"
                    /* text-base so phones don't zoom the page on focus */
                    className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <Button type="submit" size="md" disabled={busy === "new" || !emailValue.trim()}>
                    Make
                  </Button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => (p.needsEmail ? setEmailFor(p.key) : generate(p.key))}
                  disabled={busy === "new"}
                  className="mt-2.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] font-semibold text-text disabled:opacity-50"
                >
                  {busy === "new" ? "Making…" : "Generate link"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Every link made so far, and what it did */}
        {invites.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {invites.map((i) => {
              const state = inviteState(i);
              const s = stateLabel[state];
              return (
                <li
                  key={i.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[12px] font-medium text-text">
                        {i.label || "Invite"}
                      </span>
                      <span className={`text-[11px] font-semibold ${s.tone}`}>{s.text}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">
                      {i.emailLock ? `${i.emailLock} · ` : ""}
                      {i.uses}/{i.maxUses} joined · {expiryLabel(i.expiresAt)}
                    </div>
                  </div>
                  {state === "live" && (
                    <>
                      <button
                        type="button"
                        onClick={() => copy(inviteUrl(i.code))}
                        aria-label="Copy this link"
                        className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
                      >
                        <IconCopy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => kill(i.id)}
                        disabled={busy === i.id}
                        aria-label="Cancel this link"
                        className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-danger disabled:opacity-50"
                      >
                        <IconTrash size={12} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ── 3. The squad ── */}
      <Section
        title={`Squad · ${approved.length}`}
        hint={
          can.readTraining(role)
            ? "Tap anyone to see their training — calendar, sessions and erg results."
            : undefined
        }
      >
        <ul className="flex flex-col gap-2">
          {approved.map((m) => (
            <li
              key={m.userId}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
            >
              {can.readTraining(role) ? (
                <Link
                  href={`/varsity/coach/athlete/${m.userId}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text">{m.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{m.email}</span>
                  </span>
                  <IconChevronRight size={14} className="flex-shrink-0 text-muted" />
                </Link>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-text">{m.name}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted">{m.email}</div>
                </div>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  m.role === "athlete"
                    ? "bg-surface-2 text-muted"
                    : "bg-primary-tint text-primary"
                }`}
              >
                {roleLabel[m.role]}
              </span>
              {/* Only a coach can hand out roles — a captain can never create
                  another plan-builder, which is what keeps a leaked link cheap. */}
              {can.changeRoles(role) && m.role !== "coach" && (
                <button
                  type="button"
                  onClick={() => promote(m.userId, m.role === "captain" ? "athlete" : "captain")}
                  disabled={busy === m.userId}
                  className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text disabled:opacity-50"
                >
                  {m.role === "captain" ? "Make athlete" : "Make captain"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
