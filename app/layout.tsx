import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
import { ThemeModeProvider } from "@/components/ThemeMode";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UNIsport",
  description: "Campus fitness — gyms, partners, and sessions at your university.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
