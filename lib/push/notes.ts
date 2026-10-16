import type { PushEnvironment } from "@/lib/push/client";

/*
  What to say when notifications can't be turned on in this browser, in ONE
  place: Settings → Notifications and the last onboarding screen used to be two
  stories, and onboarding told an iPhone in Safari nothing at all (it just
  finished, so almost no iPhone ever subscribed).

  `where` is where they turn them on afterwards: "here" in Settings, "in
  Settings" from onboarding, which is over by the time they are back.

  The iPhone steps follow iOS 26 Safari: with the default Compact tab layout
  Share sits behind the three dots next to the address. The other two layouts
  show Share in the bar, and "then Share" still reads right for them.
*/
export type PushNote = { title: string; body?: string };

export function pushNote(env: PushEnvironment, where: "here" | "in Settings"): PushNote | null {
  switch (env) {
    case "install-ios":
      return {
        title: "Install UNIsport to get notifications",
        body: `In Safari, tap the three dots next to the address, then Share, then “Add to Home Screen”. Open UNIsport from your Home Screen and turn them on ${where}.`,
      };
    case "ios-too-old":
      return {
        title: "Your iPhone needs a newer iOS",
        body: `Notifications need iOS 16.4 or later. Update your phone, then turn them on ${where}.`,
      };
    case "browser":
      return {
        title: "This browser can’t do notifications",
        body: "Open UNIsport in Chrome, Edge, Firefox, or Safari 16.4 and later to turn them on.",
      };
    case "not-configured":
      return { title: "Notifications aren’t live yet" };
    default:
      return null;
  }
}
