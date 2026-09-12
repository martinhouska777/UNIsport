import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
// The crest letter's face (Playfair 900) — the crest is worn everywhere now
// (landing button, app top bars, mode switcher), so its variable lives here.
import { playfair } from "@/components/landing/fonts";
import { AppStateProvider } from "@/components/AppState";
import { ThemeModeProvider } from "@/components/ThemeMode";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SITE_URL } from "@/lib/siteUrl";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: light)", color: "#f6f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
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
      className={`${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeModeProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </ThemeModeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
