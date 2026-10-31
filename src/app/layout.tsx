import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/Shell";
import { Pwa } from "@/components/Pwa";

export const metadata: Metadata = {
  title: "ruNit — Who's got next?",
  description: "Find a court. Call your run. Know your game. A basketball network starting in Hazleton & Scranton.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ruNit", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#FFF9F0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
          <Pwa />
        </StoreProvider>
      </body>
    </html>
  );
}
