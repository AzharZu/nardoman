import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        panel: "hsl(var(--panel) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        accent: {
          blue: "hsl(var(--accent-blue) / <alpha-value>)",
          purple: "hsl(var(--accent-purple) / <alpha-value>)",
          gold: "hsl(var(--accent-gold) / <alpha-value>)"
        },
        danger: "hsl(var(--danger) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)"
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--line)), 0 24px 80px rgba(0, 0, 0, 0.35)",
        aura: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.45)"
      },
      backgroundImage: {
        board:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0)), radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 35%)"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
