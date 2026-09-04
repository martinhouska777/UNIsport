"use client";

import { useEffect } from "react";

// Registers the PWA service worker, which is what makes the app installable and
// what delivers Web Push. It caches build assets only, never pages (public/sw.js
// says why). Only in production — registering in dev causes stale-cache
// headaches.
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
