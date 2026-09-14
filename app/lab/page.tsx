import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LabClient from "@/components/lab/LabClient";

/*
  /lab — the landing page's Design Lab. Exists ONLY under `npm run dev`: a
  production build answers 404 here, so the public site never grows a door
  to it and nothing needs configuring on Vercel. The owner wanted it on the
  laptop only (2026-09-14).
*/

export const metadata: Metadata = {
  title: "Design Lab · UNIsport",
  robots: { index: false, follow: false },
};

export default function LabPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <LabClient />;
}
