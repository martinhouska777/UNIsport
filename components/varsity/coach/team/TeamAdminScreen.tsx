"use client";

/*
  SQUAD SETTINGS — running the squad. The captain's whole console; for a coach,
  the screen behind the gear in the top bar (/varsity/coach/settings). It is
  deliberately NOT one of the four nav tabs: those are the daily screens, and
  handing out an invite link is a once-a-term job.

  A MENU, LIKE THE APP'S OWN SETTINGS (owner, 2026-09-18), in round 2's
  grouped look since 2026-10-01 (SETTINGS-ROUND3.md). `page="menu"` is the
  list — your card, Administration (waiting, invite links, squad), Training,
  Design, Help — and each administration row opens its own page
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
  IconPalette,
  IconSend,
  IconSliders,
  IconClock,
  IconUser,
  IconTrash,
  IconX,
} from "@/components/icons";
import { requestTour, resetTour } from "@/lib/tour";
import { coachTour } from "@/lib/varsity/coachTour";
import { fetchAthleteProfile, type AthleteProfileBundle } from "@/lib/varsity/athleteProfile";
import { useAppState } from "@/components/AppState";
import { useThemeMode } from "@/components/ThemeMode";
import { DropdownRow, Group, ProfileCard, Row, RowFrame, SettingsBody } from "@/components/settings/SettingsShell";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";

export type AdminPage = "menu" | "waiting" | "invites" | "squad";

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
  const { mode } = useThemeMode();
  // You, for the card at the top of the menu — the same card Varsity Mode's
  // Settings opens with (photo, name, the squad and your role).
  const [me, setMe] = useState<AthleteProfileBundle | null>(null);

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

  useEffect(() => {
    if (page !== "menu" || !userId) return;
    let active = true;
    fetchAthleteProfile(userId).then((b) => {
      if (active) setMe(b);
    });
    return () => {
      active = false;
    };
  }, [page, userId]);

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

  const liveLinks = invites.filter((i) => inviteState(i) === "live").length;

  /* ── THE MENU ── round 2's look: you on top, then the rows in groups. It
     draws at once; the counts fill in when the squad has been read. No
     explaining lines under the rows (owner: settings carry no small text). */
  if (page === "menu") {
    return (
      <div className="w-full">
        <SettingsHeader title="Settings" back={null} />
        <SettingsBody>
          <ProfileCard
            name={me?.name ?? ""}
            photo={me?.photo ?? null}
            subline={`${membership.teamName} · ${roleLabel[role]}`}
            href="/varsity/profile"
          />

          <Group title="Administration">
            <Row
              icon={<IconClock size={20} />}
              label="Waiting to join"
              detail={pending.length ? String(pending.length) : undefined}
              alert
              href="/varsity/coach/settings/waiting"
            />
            <Row
              icon={<IconSend size={20} />}
              label="Invite links"
              detail={liveLinks ? `${liveLinks} live` : undefined}
              href="/varsity/coach/settings/invites"
            />
            <Row
              icon={<IconUser size={20} />}
              label="Squad"
              detail={loading ? undefined : String(approved.length)}
              href="/varsity/coach/settings/squad"
            />
          </Group>

          {/* Coach only — a captain never builds training, and the database
              refuses them anyway. */}
          {can.buildPlan(role) && (
            <Group title="Training">
              <Row
                icon={<IconSliders size={20} />}
                label="Training settings"
                href="/varsity/coach/settings/training"
              />
            </Group>
          )}

          {/* Light or dark — the same Design page (two little pictures) the
              student and Varsity Settings open, and the same one choice for
              the whole app. It was a switch here, labelled with whichever mode
              was on; the round sun/moon button before that sat in the top bar
              (owner, 2026-09-18: "light and dark theme should be in the
              settings"). Captains get it too — it is their screen. */}
          <Group>
            <Row
              icon={<IconPalette size={20} />}
              label="Design"
              detail={mode === "dark" ? "Dark" : "Light"}
              href="/settings/design"
            />
          </Group>

          {/* The console's walk again, on demand. Unlike the app's Settings
              this screen is INSIDE the shell the tour runs in, so the gate is
              already mounted and hears the request as an event (lib/tour.ts).
              It still navigates to Today, because that is where the walk opens. */}
          {can.buildPlan(role) && (
            <Group title="Help">
              <Row
                icon={<IconBulb size={20} />}
                label="Take the console tour"
                onClick={() => {
                  if (userId) resetTour(coachTour, userId);
                  router.push("/varsity/coach");
                  requestTour(coachTour);
                }}
              />
            </Group>
          )}
        </SettingsBody>
      </div>
    );
  }

  const header = <SettingsHeader title={pageTitle[page]} />;

  if (loading) {
    return (
      <>
        {header}
        <p className="px-4 py-16 text-center text-sm text-muted">Loading the squad…</p>
      </>
    );
  }

  // Live links on top; the dead ones (expired, cancelled, full) fold away under
  // "Old links" — kept, because how many people came through a link is still
  // worth seeing, but out of the way of the links that work.
  const live = invites.filter((i) => inviteState(i) === "live");
  const old = invites.filter((i) => inviteState(i) !== "live");

  /* One link: its name and state, then who it is locked to, how many came
     through it, and — only while it works — how long it has left. */
  const linkRow = (i: Invite) => {
    const state = inviteState(i);
    const s = stateLabel[state];
    return (
      <div key={i.id} className="flex w-full items-stretch">
        <RowFrame>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] text-text">{i.label || "Invite"}</span>
              <span className={`text-[12px] font-semibold ${s.tone}`}>{s.text}</span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">
              {i.emailLock ? `${i.emailLock} · ` : ""}
              {i.uses}/{i.maxUses} joined
              {state === "live" ? ` · ${expiryLabel(i.expiresAt)}` : ""}
            </span>
          </span>
          {state === "live" && (
            <>
              <button
                type="button"
                onClick={() => copy(inviteUrl(i.code))}
                aria-label="Copy this link"
                className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
              >
                <IconCopy size={13} />
              </button>
              <button
                type="button"
                onClick={() => kill(i.id)}
                disabled={busy === i.id}
                aria-label="Cancel this link"
                className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-danger disabled:opacity-50"
              >
                <IconTrash size={13} />
              </button>
            </>
          )}
        </RowFrame>
      </div>
    );
  };

  return (
    <div className="w-full">
      {header}
      <SettingsBody>
        {error && (
          <p className="rounded-xl border border-danger-line bg-danger-tint px-3.5 py-2.5 text-[12px] text-danger">
            {error}
          </p>
        )}

        {/* ── 1. The waiting room ── */}
        {page === "waiting" && (
          <Group>
            {pending.length === 0 ? (
              <div className="flex w-full items-stretch">
                <RowFrame>
                  <span className="text-[15px] text-muted">Nobody waiting</span>
                </RowFrame>
              </div>
            ) : (
              pending.map((m) => (
                <div key={m.userId} className="flex w-full items-stretch">
                  <RowFrame wide icon={<InitialsAvatar name={m.name} size={32} />}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-text">{m.name}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted">
                        {m.email}
                        {m.inviteLabel ? ` · via ${m.inviteLabel}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => decide(m.userId, "removed")}
                      disabled={busy === m.userId}
                      aria-label={`Reject ${m.name}`}
                      className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted disabled:opacity-50"
                    >
                      <IconX size={14} />
                    </button>
                    <Button size="sm" onClick={() => decide(m.userId, "approved")} disabled={busy === m.userId}>
                      <IconCheck size={13} />
                      Let in
                    </Button>
                  </RowFrame>
                </div>
              ))
            )}
          </Group>
        )}

        {/* ── 2. Invite links ── */}
        {page === "invites" && (
          <>
            {/* The link just made — shown big, with copy + send, because that
                is the whole point of the screen. */}
            {fresh && (
              <div className="rounded-2xl border border-accent-line bg-surface p-4 shadow-card">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                  Ready to send
                </div>
                <div className="mt-1.5 break-all rounded-lg border border-border bg-surface-2 px-2.5 py-2 font-mono text-[12px] text-text">
                  {fresh}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button variant="secondary" size="md" className="flex-1" onClick={() => copy(fresh)}>
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button size="md" className="flex-1" onClick={() => share(fresh)}>
                    <IconSend size={14} />
                    Send
                  </Button>
                </div>
              </div>
            )}

            {/* The two shapes of link. No sentence under either (owner:
                settings carry no small text) — the title says which is which. */}
            <Group>
              {invitePresets.map((p) => (
                <div key={p.key} className="flex w-full items-stretch">
                  <RowFrame>
                    {p.needsEmail && emailFor === p.key ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (emailValue.trim()) generate(p.key, emailValue.trim().toLowerCase());
                        }}
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                      >
                        <span className="w-full text-[15px] text-text">{p.title}</span>
                        <input
                          type="email"
                          value={emailValue}
                          onChange={(e) => setEmailValue(e.target.value)}
                          placeholder="their university email"
                          autoFocus
                          aria-label="University email to lock this invite to"
                          /* text-base so phones don't zoom the page on focus */
                          className="min-w-0 flex-1 basis-0 rounded-lg border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-faint focus:border-accent focus:outline-none"
                        />
                        <Button type="submit" size="sm" disabled={busy === "new" || !emailValue.trim()}>
                          Make
                        </Button>
                      </form>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 text-[15px] text-text">{p.title}</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => (p.needsEmail ? setEmailFor(p.key) : generate(p.key))}
                          disabled={busy === "new"}
                        >
                          {busy === "new" ? "Making…" : "Generate link"}
                        </Button>
                      </>
                    )}
                  </RowFrame>
                </div>
              ))}
            </Group>

            {/* Every link made so far, and what it did. */}
            {(live.length > 0 || old.length > 0) && (
              <Group>
                {live.map(linkRow)}
                {old.length > 0 && (
                  <DropdownRow label="Old links" detail={String(old.length)}>
                    {old.map(linkRow)}
                  </DropdownRow>
                )}
              </Group>
            )}
          </>
        )}

        {/* ── 3. The squad ── */}
        {page === "squad" && (
          <Group>
            {approved.map((m) => {
              // A coach can open anyone to see their training; a captain
              // cannot (the database would refuse), so gets no arrow.
              const href = can.readTraining(role) ? `/varsity/coach/athlete/${m.userId}` : null;
              // The role leads the line under the name (a coach or captain in
              // the school colour) — as a pill beside the name it left a phone
              // about 70px for the name itself.
              const who = (
                <>
                  <span className="block truncate text-[15px] text-text">{m.name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">
                    <span className={m.role === "athlete" ? "" : "font-semibold text-primary"}>
                      {roleLabel[m.role]}
                    </span>
                    {m.email ? ` · ${m.email}` : ""}
                  </span>
                </>
              );
              return (
                <div key={m.userId} className="flex w-full items-stretch">
                  <RowFrame wide icon={<InitialsAvatar name={m.name} size={32} />}>
                    {href ? (
                      <Link href={href} className="min-w-0 flex-1">
                        {who}
                      </Link>
                    ) : (
                      <span className="min-w-0 flex-1">{who}</span>
                    )}
                    {/* Only a coach can hand out roles — a captain can never
                        create another plan-builder, which is what keeps a
                        leaked link cheap. */}
                    {can.changeRoles(role) && m.role !== "coach" && (
                      <button
                        type="button"
                        onClick={() => promote(m.userId, m.role === "captain" ? "athlete" : "captain")}
                        disabled={busy === m.userId}
                        className="flex-shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text disabled:opacity-50"
                      >
                        {m.role === "captain" ? "Make athlete" : "Make captain"}
                      </button>
                    )}
                    {/* The arrow at the END of the row (it floated mid-row,
                        beside the name); the name opens the same page. */}
                    {href && (
                      <Link href={href} tabIndex={-1} aria-hidden className="flex-shrink-0 text-muted">
                        <IconChevronRight size={16} />
                      </Link>
                    )}
                  </RowFrame>
                </div>
              );
            })}
          </Group>
        )}
      </SettingsBody>
    </div>
  );
}
