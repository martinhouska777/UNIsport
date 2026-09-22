import type { MetadataRoute } from "next";
import { views } from "@/lib/landingCopy";
import { SITE_URL } from "@/lib/siteUrl";

/*
  sitemap.xml — the ten public addresses (website review, 2026-09-10: there
  was none). The landing's six views come from the same `views` list that
  draws the tabs, so a new tab is in the map the day it exists; the other
  four are the sign-in, the team invite and the two legal pages. No
  lastModified: a build date would claim every page changed on every deploy.

  /waitlist is in here because it is the address in the Instagram bio — the
  one people will paste to each other, so it should be findable on its own.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    ...views.map((v) => v.href),
    "/login",
    "/join",
    "/waitlist",
    "/privacy",
    "/terms",
  ];
  return pages.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    priority: path === "/" ? 1 : path.startsWith("/for/") ? 0.8 : 0.5,
  }));
}
