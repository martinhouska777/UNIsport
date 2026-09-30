"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Group, ToggleRow } from "@/components/settings/SettingsShell";
import type { CurrentUser } from "@/lib/currentUser";
import {
  getPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  pushEnvironment,
  type PushEnvironment,
} from "@/lib/push/client";

/*
  Settings → Notifications (app/settings/notifications). Two layers:
   • DEVICE — turn push on/off for THIS browser (subscribe / unsubscribe). This is
     where the OS permission prompt happens; if the user previously blocked it,
     we say so (can only be re-enabled from browser settings).
   • CATEGORIES — which kinds of notification this user wants at all. These persist
     to the profile (so they apply on every device) and are enforced server-side
     (db/push_notify.sql, db/varsity_push_kinds.sql) before anything is sent.

  ONE PER MODE, like Settings itself (owner, 2026-09-30): the student app lists
  what the student app sends — messages, invites, tags, followers, the log
  reminder — and Varsity Mode lists what the coach sends, split into its three
  kinds (it was one "From your coach" switch). Grouped like WhatsApp's own
  notification settings: a heading, then the switches in one card.
  Colors come from theme variables only.
*/
type Prefs = Pick<
  CurrentUser,
  | "notifyMessages"
  | "notifyPlans"
  | "notifyFollows"
  | "notifyPartnerTags"
  | "notifyLogReminders"
  | "notifyTeamPlan"
  | "notifyTeamLineup"
  | "notifyTeamNotes"
>;

// The switches for each mode, in order, under their headings. Labels are what
// the notification IS, never what the switch does.
const groups: Record<"student" | "varsity", { title: string; rows: { key: keyof Prefs; label: string }[] }[]> = {
  student: [
    {
      title: "Messages",
      rows: [
        { key: "notifyMessages", label: "New messages" },
        { key: "notifyPlans", label: "Session invites" },
      ],
    },
    {
      title: "Activity",
      rows: [
        { key: "notifyPartnerTags", label: "Partner tags" },
        { key: "notifyFollows", label: "New followers" },
        { key: "notifyLogReminders", label: "Log reminder" },
      ],
    },
  ],
  varsity: [
    {
      title: "From your coach",
      rows: [
        { key: "notifyTeamPlan", label: "Training plan" },
        { key: "notifyTeamLineup", label: "Lineups" },
        { key: "notifyTeamNotes", label: "Notes to you" },
      ],
    },
  ],
};

export default function NotificationSettings({
  mode,
  prefs,
  onChange,
}: {
  mode: "student" | "varsity";
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
}) {
  // Browser push state, read after mount (these APIs don't exist during SSR, so
  // we keep them in one object set from an async callback — never synchronously
  // in the effect body, which would also risk a hydration mismatch).
  type DeviceState = {
    env: PushEnvironment;
    permission: NotificationPermission | "unsupported";
    subscribed: boolean;
  };
  const [device, setDevice] = useState<DeviceState>({
    env: "ready",
    permission: "default",
    subscribed: false,
  });
  const { env, permission, subscribed } = device;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const isSub = await isSubscribed();
      if (active) {
        setDevice({ env: pushEnvironment(), permission: getPermission(), subscribed: isSub });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    await subscribeToPush();
    const isSub = await isSubscribed();
    setDevice((d) => ({ ...d, permission: getPermission(), subscribed: isSub }));
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setDevice((d) => ({ ...d, subscribed: false }));
    setBusy(false);
  };

  /*
    A sample notification, delivered down the real path. This used to be the
    bell in the Varsity Mode top bar; it belongs here, next to the switch that
    turns notifications on, rather than in the chrome of one mode.
  */
  const sendSample = async () => {
    setBusy(true);
    await sendTestNotification();
    setBusy(false);
  };

  /*
    When push isn't available we say WHOSE problem it is and what to do next,
    instead of the old catch-all that told everyone their browser was broken —
    including iPhone owners (whose phones do support this, once the app is on the
    Home Screen) and everyone on Chrome when our own keys were missing.
  */
  const note = (title: string, body: string) => (
    <div className="px-4 py-3.5">
      <div className="text-[15px] text-text">{title}</div>
      <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{body}</p>
    </div>
  );

  // The device row: its message + any action button depend on browser state.
  const renderDeviceRow = () => {
    if (env === "install-ios") {
      return note(
        "Install UNIsport to get notifications",
        "Tap the Share button at the bottom of Safari, choose “Add to Home Screen”, then open UNIsport from your Home Screen and come back here.",
      );
    }
    if (env === "ios-too-old") {
      return note(
        "Your iPhone needs a newer iOS",
        "Notifications need iOS 16.4 or later. Update your phone, then turn them on here.",
      );
    }
    if (env === "browser") {
      return note(
        "This browser can’t do notifications",
        "Open UNIsport in Chrome, Edge, Firefox, or Safari 16.4 and later to turn them on.",
      );
    }
    if (env === "not-configured") {
      return note(
        "Notifications aren’t live yet",
        "That’s on our side, not your device — nothing for you to do. Your choices below are saved and will apply as soon as we switch them on.",
      );
    }
    if (permission === "denied") {
      return note(
        "Notifications are blocked",
        "Turn them back on in your browser’s site settings for UNIsport, then return here.",
      );
    }
    return (
      <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
        <div className="text-[15px] text-text">This device</div>
        {subscribed ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button variant="secondary" size="sm" onClick={sendSample} disabled={busy}>
              Send a test
            </Button>
            <Button variant="secondary" size="sm" onClick={disable} disabled={busy}>
              {busy ? "…" : "Turn off"}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={enable} disabled={busy}>
            {busy ? "…" : "Enable"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Group>{renderDeviceRow()}</Group>
      {groups[mode].map((g) => (
        <Group key={g.title} title={g.title}>
          {g.rows.map((r) => (
            <ToggleRow
              key={r.key}
              label={r.label}
              on={prefs[r.key]}
              onChange={() => onChange({ [r.key]: !prefs[r.key] })}
            />
          ))}
        </Group>
      ))}
    </>
  );
}
