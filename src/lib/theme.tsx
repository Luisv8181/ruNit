"use client";

// The four looks. The choice is stored per device and applied before first paint (see THEME_INIT in layout).
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "sun" | "lights" | "paint" | "card";
export const THEMES: { id: Theme; name: string; line: string; swatch: [string, string, string]; bar: string }[] = [
  { id: "sun", name: "Sun", line: "Daylight run, warm and bright", swatch: ["#FFF9F0", "#F47B35", "#239B72"], bar: "#FFF9F0" },
  { id: "lights", name: "Lights", line: "A night run under the park lamps", swatch: ["#14181D", "#FFB238", "#EDEBE4"], bar: "#14181D" },
  { id: "paint", name: "Paint", line: "Daytime blacktop and court paint", swatch: ["#2E6A55", "#C9471E", "#8EC5E8"], bar: "#2E6A55" },
  { id: "card", name: "Card", line: "Collectible cards, foil when it's verified", swatch: ["#EEF0EC", "#15213B", "#2546D8"], bar: "#EEF0EC" },
];
const KEY = "runit-theme";
export const DEFAULT_THEME: Theme = "sun";

export const THEME_INIT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="sun"&&t!=="lights"&&t!=="paint"&&t!=="card")t="${DEFAULT_THEME}";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";}})();`;

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<Theme>(DEFAULT_THEME);
  useEffect(() => {
    // Re-apply on mount: if React ever re-renders the document root, the attribute set before paint is lost.
    let t: string | null | undefined = null;
    try { t = localStorage.getItem(KEY); } catch { /* private mode */ }
    if (!t || !THEMES.some((x) => x.id === t)) t = document.documentElement.dataset.theme;
    const next = (THEMES.some((x) => x.id === t) ? t : DEFAULT_THEME) as Theme;
    document.documentElement.dataset.theme = next;
    set(next);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    set(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", THEMES.find((x) => x.id === t)!.bar);
  }, []);
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEMES.find((x) => x.id === theme)!.bar);
  }, [theme]);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
