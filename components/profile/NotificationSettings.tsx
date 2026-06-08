"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/onboarding/controls";
import { IconBell } from "@/components/icons";
import {
  isPushSupported,
  getPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

/*
  Notifications settings on the Profile tab. Two layers:
   • DEVICE — turn push on/off for THIS browser (subscribe / unsubscribe). This is
     where the OS permission prompt happens; if the user previously blocked it,
     we say so (can only be re-enabled from browser settings).
   • CATEGORIES — which kinds of notification this user wants at all. These persist
     to the profile (so they apply on every device) and are enforced server-side
     in db/push_notify.sql before anything is sent.
  Colors come from theme variables only.
*/
export default function NotificationSettings({
  messages,
  plans,
  onChange,
}: {
  messages: boolean;
  plans: boolean;
  onChange: (patch: { notifyMessages?: boolean; notifyPlans?: boolean }) => void;
}) {
  // Browser push state, read after mount (these APIs don't exist during SSR, so
  // we keep them in one object set from an async callback — never synchronously
  // in the effect body, which would also risk a hydration mismatch).
  type DeviceState = {
    supported: boolean;
    permission: NotificationPermission | "unsupported";
    subscribed: boolean;
  };
  const [device, setDevice] = useState<DeviceState>({
    supported: true,
    permission: "default",
    subscribed: false,
  });
  const { supported, permission, subscribed } = device;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const isSub = await isSubscribed();
      if (active) {
        setDevice({ supported: isPushSupported(), permission: getPermission(), subscribed: isSub });
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

  // The device row: its message + any action button depend on browser state.
  const renderDeviceRow = () => {
    if (!supported) {
      return (
        <p className="text-[11px] text-muted">
          This browser doesn’t support notifications. Try Chrome on Android/desktop, or
          add the app to your Home Screen on iPhone.
        </p>
      );
    }
    if (permission === "denied") {
      return (
        <p className="text-[11px] text-muted">
          Notifications are blocked for this site. Turn them back on in your browser’s
          site settings, then return here.
        </p>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-text">This device</div>
          <div className="text-[11px] text-muted">
            {subscribed ? "Notifications are on here" : "Get notified on this device"}
          </div>
        </div>
        {subscribed ? (
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="rounded-full border border-border bg-surface-2 px-3.5 py-1.5 text-[11px] font-medium text-text disabled:opacity-50"
          >
            {busy ? "…" : "Turn off"}
          </button>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-contrast disabled:opacity-50"
          >
            {busy ? "…" : "Enable"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-primary">
          <IconBell size={12} />
        </span>
        <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
          Notifications
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-2 px-3 py-2.5">
        {renderDeviceRow()}
      </div>

      {/* What to be notified about — applies across all your devices. */}
      <div className="mt-3 flex flex-col divide-y divide-border">
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="text-xs text-text">New messages</div>
            <div className="text-[11px] text-muted">When someone sends you a message</div>
          </div>
          <Toggle
            on={messages}
            onChange={() => onChange({ notifyMessages: !messages })}
            ariaLabel="Notify me about new messages"
          />
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div>
            <div className="text-xs text-text">Session invites</div>
            <div className="text-[11px] text-muted">When someone proposes a session</div>
          </div>
          <Toggle
            on={plans}
            onChange={() => onChange({ notifyPlans: !plans })}
            ariaLabel="Notify me about session invites"
          />
        </div>
      </div>
    </div>
  );
}
