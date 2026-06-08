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
