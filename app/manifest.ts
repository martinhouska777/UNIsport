import type { MetadataRoute } from "next";

// PWA manifest (Next.js built-in). Makes the app installable to a phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    /*
      THE STORE NAME — the lockup, not the bare brand (owner, 2026-08-18).

      "UNIsport" alone is not claimable as a listing name: UniSport Digital
      (Croatia), UniSport Köln and Uni Bern are already in the app stores, and
      store names must be unique. So a surface that needs a UNIQUE id carries a
      qualifier, and the surfaces that only DISPLAY the brand stay "UNIsport":

        listing / manifest name   UNIsport: Campus Fitness   <- here
        home-screen label         UNIsport                   <- short_name below
        iOS home-screen label     UNIsport                   <- appleWebApp.title
        domain                    getunisport.com            <- live, owner 2026-09-19
        socials                   not decided yet

      The 2026-08-18 plan was one qualifier everywhere ("campus"), and the
      domain was going to be unisportcampus.com. The owner bought
      getunisport.com instead and has confirmed it stays, so the qualifier is
      no longer uniform across surfaces. The store name keeps it because the
      store genuinely requires a unique listing name; the domain no longer
      matches it. Socials are still open — worth deciding which of the two the
      handle should follow.
    */
    name: "UNIsport: Campus Fitness",
    // What sits under the icon on the home screen — the brand, unqualified.
    short_name: "UNIsport",
    description: "Campus fitness — gyms, partners, and sessions at your university.",
    /*
      THE INSTALLED APP OPENS ON THE APP, not on the advert for it. This was
      "/" — so someone who had put UNIsport on their home screen, signed in,
      tapped the icon and got the marketing page with "Log in / Get started"
      on it (audit, 2026-09-19). "/gyms" is the first tab, the same place
      finishing onboarding leaves you; anyone not signed in is sent back to
      the landing from there, so the front door still works.
    */
    start_url: "/gyms",
    // Both zones stay inside the installed window — "/gyms" as the start URL
    // would otherwise narrow the scope to that one path and open the landing,
    // the join links and Varsity Mode in a browser tab instead.
    scope: "/",
    display: "standalone",
    // The installed app opens at "/" — the dark landing — so the splash and
    // chrome match that, not a navy that appears nowhere in the UI.
    // The landing has been LIGHT since look V2 (2026-09-14). This must equal
    // --color-l-bg in globals.css and themeColor in components/landing/routeMeta.ts,
    // or the installed app flashes a black splash before a white page.
    background_color: "#f6feff",
    theme_color: "#f6feff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
