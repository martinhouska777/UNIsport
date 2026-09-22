import type { Metadata } from "next";
import { landingViewport } from "@/components/landing/routeMeta";
import { social } from "@/lib/landingCopy";
import { waitlist } from "@/lib/waitlist";

/*
  The waitlist screen is a client component, so its metadata and viewport live
  here. Pinch-zoomable like the rest of Zone 1 (the root layout locks zoom for
  the APP only). Its own title and description rather than the landing's: this
  is the address in the Instagram bio, so it is the one people paste to each
  other, and the link card should say what it is.
*/
export const viewport = landingViewport;

export const metadata: Metadata = {
  title: "Join the UNIsport waitlist",
  description: waitlist.body,
  alternates: { canonical: "/waitlist" },
  openGraph: {
    title: "Join the UNIsport waitlist",
    description: waitlist.body,
    url: "/waitlist",
    siteName: "UNIsport",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: social.imageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the UNIsport waitlist",
    description: waitlist.body,
    images: ["/og.png"],
  },
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return children;
}
