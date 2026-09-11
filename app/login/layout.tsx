import type { Metadata } from "next";

/*
  The sign-in page is a client component (it reads the URL and talks to
  Supabase), so its tab title lives here. It used to inherit the bare
  "UNIsport" and the app's description; a page every sign-up passes through
  deserves to say what it is (website review, 2026-09-10).
*/
export const metadata: Metadata = {
  title: "Get started — UNIsport",
  description: "Create your UNIsport account with your university email, or log in.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
