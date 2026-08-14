import type { MetadataRoute } from "next";

// PWA manifest (Next.js built-in). Makes the app installable to a phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UNIsport",
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
