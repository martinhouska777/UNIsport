/*
  THE SITE'S OWN ADDRESS — for anything that has to be absolute: the link-card
  image (og:image), robots.txt's pointer to the sitemap, the sitemap's URLs.

  Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, so a preview
  still points these at the real site; NEXT_PUBLIC_SITE_URL wins when it is
  set (the custom domain, once there is one). The fallback is the production
  host today. One place, so the three readers can never disagree.
*/
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://un-isport.vercel.app");
