import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
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
  themeColor: "#2f3b52",
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
        <AppStateProvider>{children}</AppStateProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
