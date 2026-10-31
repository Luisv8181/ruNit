"use client";

// The three looks. The choice is stored per device and applied before first paint (see THEME_INIT in layout).
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "lights" | "paint" | "card";
export const THEMES: { id: Theme; name: string; line: string; swatch: [string, string, string]; bar: string }[] = [
  { id: "lights", name: "Lights", line: "A night run under the park lamps", swatch: ["#14181D", "#FFB238", "#EDEBE4"], bar: "#14181D" },
  { id: "paint", name: "Paint", line: "Daytime blacktop and court paint", swatch: ["#2E6A55", "#C9471E", "#8EC5E8"], bar: "#2E6A55" },
  { id: "card", name: "Card", line: "Collectible cards, foil when it's verified", swatch: ["#EEF0EC", "#15213B", "#2546D8"], bar: "#EEF0EC" },
];
const KEY = "runit-theme";
export const DEFAULT_THEME: Theme = "lights";

export const THEME_INIT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="lights"&&t!=="paint"&&t!=="card")t="${DEFAULT_THEME}";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}";}})();`;

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<Theme>(DEFAULT_THEME);
  useEffect(() => {
    const t = document.documentElement.dataset.theme as Theme | undefined;
    if (t && THEMES.some((x) => x.id === t)) set(t);
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
