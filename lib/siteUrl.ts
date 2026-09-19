/*
  THE SITE'S OWN ADDRESS — for anything that has to be absolute: the link-card
  image (og:image), robots.txt's pointer to the sitemap, the sitemap's URLs,
  and invite links.

  This is the address we want the world to see, so it is stated here once and
  does not change between production and a preview deployment: a link shared
  from anywhere should read getunisport.com, never a vercel.app host.
  NEXT_PUBLIC_SITE_URL still wins when it is set, so a second Vercel project
  can point these somewhere else. One place, so the readers can never disagree.
*/
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://getunisport.com";
