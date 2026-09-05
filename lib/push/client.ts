"use client";

/*
  Browser-side Web Push helpers. The flow:
    1. make sure the service worker (public/sw.js) is registered + ready,
    2. ask the OS for notification permission,
    3. subscribe with the PushManager using our VAPID public key,
    4. send that subscription to the server (POST /api/push/subscribe) so it can
       deliver notifications later.

  Everything fails soft: on an unsupported browser or a denied prompt we return a
  clear status rather than throwing, so callers (onboarding, the bell) can carry on.
*/

export type PushStatus = "granted" | "denied" | "unsupported" | "error";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// True only where the whole pipeline can work (service workers + Push API).
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!PUBLIC_KEY
  );
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/*
  WHY notifications can't be turned on here, in the user's terms. "Unsupported"
  used to be a single bucket, so an iPhone (which CAN do push, once the app is on
  the Home Screen) and a missing VAPID key on our side both told the visitor
  their browser was at fault. These are four different situations with four
  different answers — three of which are not the visitor's problem.
*/
export type PushEnvironment =
  | "ready" // browser can push and we're configured — show the on/off control
  | "install-ios" // iPhone/iPad in Safari: install to the Home Screen first
  | "ios-too-old" // already installed, but iOS is older than 16.4
  | "browser" // some other browser with no Push API
  | "not-configured"; // our own push keys aren't set on this deployment

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// True when running from the Home Screen / as an installed app rather than a tab.
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushEnvironment(): PushEnvironment {
  if (typeof window === "undefined") return "ready";
  const browserCan =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!browserCan) {
    if (isIOS()) return isInstalled() ? "ios-too-old" : "install-ios";
    return "browser";
  }
  return PUBLIC_KEY ? "ready" : "not-configured";
}

// VAPID public keys are base64url; PushManager wants raw bytes (an ArrayBuffer).
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buffer;
}

// Register the SW on demand (ServiceWorkerRegister.tsx only registers in
// production, so we can't rely on it during dev or first run).
async function ensureRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  const reg = existing ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  return reg;
}

/*
  Ask permission, subscribe, and persist the subscription server-side.
  Returns the resulting permission status. Safe to call repeatedly — if already
  subscribed it just re-syncs the subscription to the server.
*/
export async function subscribeToPush(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const reg = await ensureRegistration();
    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(PUBLIC_KEY),
      }));

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });
    // 401 (not signed in) / 503 (server not configured) still mean the OS
    // permission was granted — surface that so the UI doesn't show an error.
    if (!res.ok) return res.status === 401 || res.status === 503 ? "granted" : "error";
    return "granted";
  } catch {
    return "error";
  }
}

// True if this browser already has an active push subscription.
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    return !!(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

// Tear down on this browser (used by a later settings toggle).
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

// Fire-and-forget: ask the server to notify the OTHER person in a conversation
// (a new message or a session plan). Never throws and never blocks the caller —
// a failed notification must not affect sending the message itself. `keepalive`
// lets it complete even if the page navigates right after.
export function notifyConversation(input: {
  conversationId: string;
  kind: "message" | "plan" | "plan_update";
  preview?: string;
}): void {
  if (typeof window === "undefined") return;
  void fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => {});
}

/*
  Fire-and-forget: the coach has just published something, tell the squad.

  Same contract as notifyConversation — never throws, never blocks, `keepalive`
  so it survives the coach navigating away the instant they press Publish. Who
  actually receives it is decided in the database (db/varsity_push_notify.sql):
  this only says WHAT happened, and only a coach's call gets past the RPC.

  Call it after the save SUCCEEDS. Announcing a lineup that failed to store is
  worse than announcing nothing.
*/
export function notifySquad(input: {
  kind: "team_plan" | "team_lineup" | "note";
  /** required for "note" — which athlete it was written to */
  athleteId?: string;
  preview?: string;
}): void {
  if (typeof window === "undefined") return;
  void fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch(() => {});
}

// Ask the server to send a notification to this user's devices (welcome / sample).
export async function sendTestNotification(payload?: {
  title?: string;
  body?: string;
  url?: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    return res.ok;
  } catch {
    return false;
  }
}
