"use client";

import { useEffect } from "react";

// Registers the PWA service worker so the app is installable / works offline.
// Only in production — registering in dev causes stale-cache headaches.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration errors in MVP */
      });
    }
  }, []);

  return null;
}
