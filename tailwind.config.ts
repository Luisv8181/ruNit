import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ball: { DEFAULT: "#F47B35", deep: "#D9611C", soft: "#FCE3D2" },
        paper: { DEFAULT: "#FFF9F0", warm: "#F8EEDF", line: "#EADCC6" },
        sun: { DEFAULT: "#F4C65E", soft: "#FBEBC4" },
        emerald: { DEFAULT: "#239B72", soft: "#D4EEE3" },
        sky: { DEFAULT: "#56B8E8", soft: "#DCF0FA" },
        violet: { DEFAULT: "#8A6BE0", soft: "#E9E2FA" },
        ink: { DEFAULT: "#202B30", 2: "#46545A", 3: "#7A858A" },
      },
      fontFamily: {
        display: ["'Big Shoulders Display Variable'", "system-ui", "sans-serif"],
        sans: ["'Atkinson Hyperlegible Next Variable'", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
