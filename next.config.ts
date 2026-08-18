import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
