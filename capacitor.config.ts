import type { CapacitorConfig } from "@capacitor/cli";

/*
  The iPhone app (owner, 2026-11-08: "lets start doing the application").

  The app is a native iOS shell around the live site: it opens
  getunisport.com/match inside the phone's own web view, the same pages the
  web app shows. So every push to `main` reaches the App Store app too, with
  no new upload to Apple, and there is one app to keep, not two.

  iPhone first: almost every student at Harvard has one (US teens 87% iPhone,
  Piper Sandler, fall 2025). Android can be added from this same file later
  (`npx cap add android`).

  The native project lives in `ios/` and is built on a Mac or a cloud Mac,
  because Xcode only runs on macOS.
*/
const config: CapacitorConfig = {
  appId: "com.getunisport.app",
  appName: "UNIsport",
  // Only shipped as a fallback; the app loads `server.url` below.
  webDir: "mobile/www",
  server: {
    url: "https://getunisport.com",
    // The app opens on Match, like the installed web app (app/manifest.ts).
    appStartPath: "match",
  },
  // Lets the site tell the App Store app from a browser, for the parts that
  // must work differently inside it (sign-in with Google, notifications).
  appendUserAgent: "UNIsportApp",
  ios: {
    // The page sits below the status bar and above the home bar, as it does
    // in Safari, until the site itself pads for the notch everywhere.
    contentInset: "automatic",
    backgroundColor: "#ffffff",
  },
};

export default config;
