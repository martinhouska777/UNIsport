import { notFound } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import { landingMetadata, landingViewport } from "@/components/landing/routeMeta";
import { views, type LandingView } from "@/lib/landingCopy";

/*
  ZONE 1 — one audience's view of the landing: /for/students, /for/varsity,
  /for/coaches (the tabs in the top bar and the three doors under the
  headline). Same page, filtered — see components/landing/LandingPage.tsx.
  Static: the three addresses are known at build time; anything else is 404.
*/
const AUDIENCES = ["students", "varsity", "coaches"] as const;
type Audience = (typeof AUDIENCES)[number];
const isAudience = (s: string): s is Audience => (AUDIENCES as readonly string[]).includes(s);

export const dynamicParams = false;
export function generateStaticParams() {
  return AUDIENCES.map((audience) => ({ audience }));
}

export async function generateMetadata({ params }: { params: Promise<{ audience: string }> }) {
  const { audience } = await params;
  return landingMetadata(isAudience(audience) ? audience : "all");
}
export const viewport = landingViewport;

export default async function ForAudience({ params }: { params: Promise<{ audience: string }> }) {
  const { audience } = await params;
  if (!isAudience(audience) || !views.some((v) => v.view === audience)) notFound();
  return <LandingPage view={audience as LandingView} />;
}
