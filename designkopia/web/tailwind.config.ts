import type { Config } from "tailwindcss";

// Tokeny per job nadpisuj przez CSS vars w globals.css (paleta z palette-lock.json,
// fonty z typography-lock.json). Tailwind czyta je przez var().
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        surface: "var(--surface)",
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
    },
  },
  plugins: [],
};

export default config;
