import type { Metadata, Viewport } from "next";
import LandingPage from "@/components/landing/LandingPage";
import { social } from "@/lib/landingCopy";

/*
  ZONE 1 — the public landing (marketing front-door). Neutral product brand
  only, NO university colours as page chrome. The page itself lives in
  components/landing/LandingPage.tsx; every word in lib/landingCopy.ts.
*/

/* What a pasted link shows — in a group chat, on X, in Slack. The app spreads
   through group chats (the varsity story says so), and until 2026-08-18 a
   pasted link rendered as bare text: no card, title "UNIsport", a generic
   description. The image is public/og.png, drawn by scripts/landing/make-og.mjs. */
export const metadata: Metadata = {
  title: social.title,
  description: social.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: social.title,
    description: social.description,
    url: "/",
    siteName: "UNIsport",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: social.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: social.title,
    description: social.description,
    images: ["/og.png"],
  },
};

/* The landing is #0a0a0a in both colour schemes, so the browser chrome on a
   phone matches it (the root layout's light #f6f6f7 is the APP's ground —
   over this page it sat as a pale bar on black). And no zoom lock here: the
   app pins zoom so a stray pinch on a tab bar can't break it; a marketing
   page has no such control to protect and should stay pinch-zoomable.
   (A meta tag cannot read a CSS variable, so — like the root layout — this
   is the literal; it must equal --color-l-bg in globals.css.) */
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function Home() {
  return <LandingPage />;
}
