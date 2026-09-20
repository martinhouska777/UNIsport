import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// The crest letter's face (Playfair 900) — the crest is worn everywhere now
// (landing button, app top bars, mode switcher), so its variable lives here.
// Instrument Serif joined it for the same reason: the wordmark used to be a
// landing-only mark, but the app's side rail wears it too now, and the drawn
// barbell I is built on THIS face's measurements — scoped to the landing it
// would fall back in Zone 2 and the bar would no longer match its letters.
import { playfair, instrumentSerif } from "@/components/landing/fonts";
import { AppStateProvider } from "@/components/AppState";
import { ThemeModeProvider } from "@/components/ThemeMode";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SITE_URL } from "@/lib/siteUrl";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The app's own face after login (see --font-app in globals.css). Latin-ext
// covers the Czech, Spanish and Portuguese names on the demo roll.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Absolute URLs for the link-card images (og:image must be absolute). The
  // same address robots.txt and the sitemap use — lib/siteUrl.ts.
  metadataBase: new URL(SITE_URL),
  title: "UNIsport",
  description: "Campus fitness — gyms, partners, and sessions at your university.",
  /* Safari ignores the manifest's icons for "Add to Home Screen" and looks
     for apple-touch-icon; without one an iPhone gets a screenshot of the page
     as the icon (website review, 2026-09-10). 180px and opaque — iOS paints
     transparent corners black — cut from the same 512 the manifest uses. */
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UNIsport",
  },
};

export const viewport: Viewport = {
  // Paints the phone's status bar / browser chrome. These must match what the
  // app ACTUALLY renders — the neutral light background, and the near-black the
  // landing and the dark app theme share. (It used to be a single navy that
  // appears nowhere in the UI.)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ebf0f6" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0e" },
  ],
  // Pin the zoom level so the app can't be pinched or double-tapped larger,
  // like WhatsApp. A stray pinch on a tab bar reads as the app breaking.
  // NOTE: this also disables the browser's own zoom for people who rely on it,
  // which is why photos are getting their own pinch-to-zoom viewer next — the
  // content worth magnifying stays magnifiable.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${jakarta.variable} ${playfair.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/*
          HOLD THE PAINT FOR A DARK-MODE VISITOR. Runs before anything below it
          is drawn. The saved choice lives in the browser, so the HTML we just
          sent is the light one; rather than let it flash and correct itself,
          this puts the dark ground down at once and marks the themed content
          as not-ready. components/ThemeMode.tsx clears the mark as soon as the
          real theme is on screen, and the timeout clears it regardless, so a
          failure here can never leave anyone looking at a blank page. The
          rules it drives are in app/globals.css; the landing has no themed
          wrapper, so none of this touches it.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("uniThemeMode")==="dark"){' +
              'var e=document.documentElement;e.dataset.themePending="dark";' +
              'setTimeout(function(){delete e.dataset.themePending},1500)}}catch(e){}',
          }}
        />
        <ThemeModeProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </ThemeModeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
