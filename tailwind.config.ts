import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#05070a",
        graphite: "#101820",
        plasma: "#18f5d2",
        reactor: "#ffce3a",
        alarm: "#ff4d6d",
        cobalt: "#4e8cff"
      },
      boxShadow: {
        hud: "0 0 24px rgba(24, 245, 210, 0.22), inset 0 0 18px rgba(78, 140, 255, 0.08)"
      },
      fontFamily: {
        display: ["var(--font-geist-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
