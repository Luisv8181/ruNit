import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/doto";
import "@fontsource-variable/big-shoulders-stencil";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource/kanit/latin-800-italic.css";
import "@fontsource/kanit/latin-900-italic.css";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/big-shoulders-display";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, THEME_INIT } from "@/lib/theme";
import { Shell } from "@/components/Shell";
import { Pwa } from "@/components/Pwa";

export const metadata: Metadata = {
  title: "ruNit — Who's got next?",
  description: "Find a court. Call your run. Know your game. A basketball network starting in Hazleton & Scranton.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ruNit", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#14181D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>
            <Shell>{children}</Shell>
            <Pwa />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
