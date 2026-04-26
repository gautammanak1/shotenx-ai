import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "@moneydevkit/nextjs/mdk-styles.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "ShotenX — Lightning agent marketplace",
  description:
    "Pay-per-run AI agents with L402: marketplace, agent chat, builder registry, and sats-native checkout — MVP product surface.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background text-foreground`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
