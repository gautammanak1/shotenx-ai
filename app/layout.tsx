import type { Metadata } from "next";
import "./globals.css";
import "@moneydevkit/nextjs/mdk-styles.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "ShotenX Agent Marketplace",
  description: "Lightning-native agent marketplace MVP"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
