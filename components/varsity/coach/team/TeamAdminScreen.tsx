"use client";

/*
  SQUAD SETTINGS — running the squad. The captain's whole console; for a coach,
  the screen behind the gear in the top bar (/varsity/coach/settings). It is
  deliberately NOT one of the four nav tabs: those are the daily screens, and
  handing out an invite link is a once-a-term job.

  A MENU, LIKE THE APP'S OWN SETTINGS (owner, 2026-09-18). `page="menu"` is
  the list — Administration (waiting, invite links, squad), Training,
  Appearance, Help — and each administration row opens its own page
  (`page="waiting" | "invites" | "squad"`, routes under settings/) with a back
  arrow top-left (SettingsHeader). One component so the squad + invites are
  read in one place and the menu can show the counts.

  Three administration pages, in the order they matter:
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
import { useRouter } from "next/navigation";
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
import {
  IconBulb,
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconSend,
  IconSliders,
  IconClock,
  IconUser,
  IconTrash,
  IconX,
  IconSun,
  IconMoon,
} from "@/components/icons";
import { requestTour, resetTour } from "@/lib/tour";
import { coachTour } from "@/lib/varsity/coachTour";
import { useAppState } from "@/components/AppState";
import { useThemeMode } from "@/components/ThemeMode";
import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";

export type AdminPage = "menu" | "waiting" | "invites" | "squad";

/* A titled block, matching the section labels used across Varsity Mode. The
   pages behind the menu have their name in the header, so they pass none. */
function Section({ title, hint, children }: { title?: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-3.5 py-4">
      {title && <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>}
      {hint && <p className="mb-2.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
      {children}
    </section>
  );
}

/* One row of the menu: icon, name, an optional count, chevron. */
function MenuRow({
  icon,
  label,
  detail,
  href,
  onClick,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  href?: string;
  onClick?: () => void;
  alert?: boolean;
}) {
  const inner = (
    <>
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-[13px] font-medium text-text">{label}</span>
      {detail && (
        <span className={`text-[12px] ${alert ? "font-semibold text-warn" : "text-muted"}`}>{detail}</span>
      )}
      <IconChevronRight size={14} className="flex-shrink-0 text-muted" />
    </>
  );
  const cls = "flex w-full items-center gap-3 border-b border-border px-3.5 py-3 text-left last:border-0";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const pageTitle: Record<Exclude<AdminPage, "menu">, string> = {
  waiting: "Waiting to join",
  invites: "Invite links",
  squad: "Squad",
};

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

export default function TeamAdminScreen({
  membership,
  page = "menu",
}: {
  membership: Membership;
  page?: AdminPage;
}) {
  const { teamId, role } = membership;
  const { userId } = useAppState();
  const router = useRouter();
  const { mode, toggle: toggleMode } = useThemeMode();

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

  // The first read is its own effect (not a call to reload) so the state is set
  // from the promise, and a screen left mid-fetch doesn't set state after unmount.
  useEffect(() => {
    let active = true;
    Promise.all([fetchSquad(teamId), listInvites(teamId)]).then(([s, i]) => {
      if (!active) return;
      setSquad(s);
      setInvites(i);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [teamId]);

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

  const header = page === "menu" ? null : <SettingsHeader title={pageTitle[page]} />;
  const liveLinks = invites.filter((i) => inviteState(i) === "live").length;

  if (loading) {
    return (
      <>
        {header}
        <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>
      </>
    );
  }

  return (
    <div className="w-full pb-10">
      {header}
      <div className="mx-auto w-full max-w-screen-sm">
      {error && (
        <p className="mx-3.5 mt-3 rounded-xl border border-danger-line bg-danger-tint px-3.5 py-2.5 text-[12px] text-danger">
          {error}
        </p>
      )}

      {/* ── THE MENU ── no explaining lines under the rows (owner: settings
          carry no small text). */}
      {page === "menu" && (
        <>
          <Section title="Administration">
            <div className="rounded-xl border border-border bg-surface">
              <MenuRow
                icon={<IconClock size={18} />}
                label="Waiting to join"
                detail={pending.length ? String(pending.length) : undefined}
                alert
                href="/varsity/coach/settings/waiting"
              />
              <MenuRow
                icon={<IconSend size={18} />}
                label="Invite links"
                detail={liveLinks ? `${liveLinks} live` : undefined}
                href="/varsity/coach/settings/invites"
              />
              <MenuRow
                icon={<IconUser size={18} />}
                label="Squad"
                detail={String(approved.length)}
                href="/varsity/coach/settings/squad"
              />
            </div>
          </Section>

          {/* Coach only — a captain never builds training, and the database
              refuses them anyway. */}
          {can.buildPlan(role) && (
            <Section title="Training">
              <div className="rounded-xl border border-border bg-surface">
                <MenuRow
                  icon={<IconSliders size={18} />}
                  label="Training settings"
                  href="/varsity/coach/settings/training"
                />
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── 1. The waiting room ── */}
      {page === "waiting" && (
      <Section>
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
      )}

      {/* ── 2. Invite links ── */}
      {page === "invites" && (
      <Section>
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
      )}

      {/* ── 3. The squad ── */}
      {page === "squad" && (
      <Section>
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
      )}

      {page === "menu" && (
      <>
      {/* ── Appearance ──
          Light or dark for the console. The round sun/moon button used to
          sit in the top bar beside the gear (and in the laptop rail); the
          owner moved it here (2026-09-18: "light and dark theme should be in
          the settings"). Everyone who can open Settings gets it, captains
          included — it is their screen, not the squad's. */}
      <Section title="Appearance">
        <button
          type="button"
          onClick={toggleMode}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left"
        >
          <span className="text-muted">{mode === "dark" ? <IconMoon size={18} /> : <IconSun size={18} />}</span>
          <span className="flex-1 text-[13px] font-medium text-text">
            {mode === "dark" ? "Dark mode" : "Light mode"}
          </span>
          {/* The switch: a pill whose knob sits at the far end when dark is on. */}
          <span
            aria-hidden
            className={`relative h-6 w-11 flex-shrink-0 rounded-full border transition-colors ${
              mode === "dark" ? "border-primary bg-primary" : "border-border bg-surface-2"
            }`}
          >
            <span
              className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-background shadow-sm transition-[left] ${
                mode === "dark" ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </Section>

      {/* ── 5. Help ──
          The console's walk again, on demand. Unlike the app's Settings this
          screen is INSIDE the shell the tour runs in, so the gate is already
          mounted and hears the request as an event (lib/tour.ts). It still
          navigates to Plan, because that is where the walk opens. */}
      {can.buildPlan(role) && (
        <Section title="Help">
          <div className="rounded-xl border border-border bg-surface">
            <MenuRow
              icon={<IconBulb size={18} />}
              label="Take the console tour"
              onClick={() => {
                if (userId) resetTour(coachTour, userId);
                router.push("/varsity/coach/plan");
                requestTour(coachTour);
              }}
            />
          </div>
        </Section>
      )}
      </>
      )}
      </div>
    </div>
  );
}
