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
    start_url: "/",
    display: "standalone",
    // The installed app opens at "/" — the dark landing — so the splash and
    // chrome match that, not a navy that appears nowhere in the UI.
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
