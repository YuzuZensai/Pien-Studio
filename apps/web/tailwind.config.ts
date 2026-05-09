import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "var(--color-cream)",
        berry: "var(--color-berry)",
        wine: "var(--color-wine)",
        mint: "var(--color-mint)",
        ink: "var(--color-ink)",
        accent: "var(--color-accent)",
        "accent-strong": "var(--color-accent-strong)",
        surface: "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
      },
      fontFamily: {
        display: ["'M PLUS Rounded 1c'", "'Noto Sans Thai'", "sans-serif"],
        body: ["'Zen Kaku Gothic New'", "'Noto Sans Thai'", "sans-serif"],
      },
      boxShadow: {
        float: "0 20px 55px rgba(48, 13, 22, 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
