import LandingPage from "@/components/landing/LandingPage";

/*
  SCRATCH ROUTE — the whole new landing page, so it can be reviewed in a
  browser without touching the live page at "/". When it is approved, "/"
  renders the same <LandingPage /> and this route is deleted.
*/
export default function LandingPreviewPage() {
  return <LandingPage />;
}
