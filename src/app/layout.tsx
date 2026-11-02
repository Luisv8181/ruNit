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
  title: "RUN IT — Who's got next?",
  description: "Find a court. Call your run. Know your game. A basketball network starting in Hazleton & Scranton.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "RUN IT", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#FFF9F0", width: "device-width", initialScale: 1 };

const DEV_SW_RESET = `
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  Promise.all([
    navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.filter((registration) => registration.scope === location.origin + '/').map((registration) => registration.unregister()))),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('runit-')).map((key) => caches.delete(key))))
  ]).then(() => location.reload());
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {process.env.NODE_ENV === "development" && <script dangerouslySetInnerHTML={{ __html: DEV_SW_RESET }} />}
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
