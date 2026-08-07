import type { Metadata, Viewport } from "next";
import { Cinzel, Space_Grotesk } from "next/font/google";
import { AppShell } from "~/components/habitquest/app-shell";
import "./globals.css";

const displayFont = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HabitQuest",
  description: "A modern RPG-inspired habit tracker built with Next.js.",
  appleWebApp: {
    capable: true,
    title: "HabitQuest",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
