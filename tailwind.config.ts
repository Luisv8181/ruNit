import type { Config } from "tailwindcss";

// Every color is a CSS variable so the three looks (Lights, Paint, Card) can swap them.
// Values live in src/app/globals.css under [data-theme=...].
const v = (n: string) => `rgb(var(--c-${n}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ball: { DEFAULT: v("ball"), deep: v("ball-deep"), soft: v("ball-soft"), ink: v("ball-ink") },
        "on-ball": v("on-ball"),
        "on-emerald": v("on-emerald"),
        "on-warn": v("on-warn"),
        paper: { DEFAULT: v("paper"), warm: v("paper-warm"), line: v("paper-line") },
        surface: v("surface"),
        sun: { DEFAULT: v("sun"), soft: v("sun-soft"), deep: v("sun-deep") },
        emerald: { DEFAULT: v("emerald"), soft: v("emerald-soft") },
        sky: { DEFAULT: v("sky"), soft: v("sky-soft"), deep: v("sky-deep") },
        violet: { DEFAULT: v("violet"), soft: v("violet-soft") },
        ink: { DEFAULT: v("ink"), 2: v("ink-2"), 3: v("ink-3") },
        warn: v("warn"),
        night: v("night"),
        chalk: v("chalk"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        score: ["var(--font-score)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
