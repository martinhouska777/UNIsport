import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The dev-only "N" badge sat on top of the Gyms tab in phone screenshots. */
  devIndicators: false,
  images: {
    /* The landing's phone screenshots (900px captures of small UI text) are
       shown at 250–360 CSS px on 1–2× screens. Two things keep them crisp:
       a quality above the default 75 (`quality={90}` on those <Image>s —
       Next 16 only allows qualities listed here), and enough width steps
       that the browser gets a candidate close to its real pixel width
       instead of a much larger one it then softens by resampling. Steps
       are added, not removed, so nothing else in the app changes. */
    qualities: [75, 90],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 320, 384, 450, 512, 576],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  /* www → the bare address. `www.getunisport.com` resolved to Vercel but was
     never attached to the project, so it had no certificate: anyone who typed
     www (plenty still do out of habit) got a browser security warning instead
     of the site, which reads as "this site is unsafe", not "wrong address".
     The domain is attached now; this sends it on to the one real address, so
     Google sees a single site rather than two identical ones. Permanent (308)
     — the bare address is the canonical one, and app/layout.tsx says so too. */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.getunisport.com" }],
        destination: "https://getunisport.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
