import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/*
  robots.txt. There was none (a 404 — website review, 2026-09-10), so search
  engines had neither permission nor a map. Everything a stranger can reach is
  open; the logged-in app and its API are not pages to be indexed — a crawler
  that follows a link in is bounced to the sign-in anyway, and an index full
  of "/gyms → Log in" entries helps nobody. `/varsity` is the app's own
  Varsity Mode; the public page about it is `/for/varsity`, which stays open.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/onboarding",
        "/settings",
        "/gyms",
        "/match",
        "/messages",
        "/profile",
        "/people/",
        "/memories",
        "/leaderboards",
        "/varsity",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
