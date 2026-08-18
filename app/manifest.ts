import type { MetadataRoute } from "next";

// PWA manifest (Next.js built-in). Makes the app installable to a phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    /*
      THE STORE NAME — the lockup, not the bare brand (owner, 2026-08-18).

      "UNIsport" alone is not claimable as a listing name: UniSport Digital
      (Croatia), UniSport Köln and Uni Bern are already in the app stores, and
      store names must be unique. So every surface that needs a UNIQUE id — the
      listing name, the domain, the social handles — carries the same qualifier,
      "campus", and the surfaces that only DISPLAY the brand stay "UNIsport":

        listing / manifest name   UNIsport: Campus Fitness   <- here
        home-screen label         UNIsport                   <- short_name below
        iOS home-screen label     UNIsport                   <- appleWebApp.title
        domain                    unisportcampus.com
        socials                   @unisportcampus

      One qualifier everywhere, so a person who hears "UNIsport" and finds
      "unisportcampus" reads it as obviously us. Do not vary it per surface.
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
