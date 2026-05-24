import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces
        cream: "#F7F3EC",
        beige: "#F0EAE0",
        line: "#E4DCCF",
        // text
        ink: { DEFAULT: "#1C1A17", soft: "#6B6459" },
        // primary action
        indigo: { DEFAULT: "#5B52E0", soft: "#E5E2FB", fg: "#FFFFFF" },
        // warm accent (terracotta placeholder; swap later)
        clay: { DEFAULT: "#C26A4A", soft: "#F6E2D6", fg: "#FFFFFF" },
        // category helper
        sport: { DEFAULT: "#5C8A3A", soft: "#DFEBD6" },
        // shadcn-friendly semantic aliases (driven by CSS vars)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-display)", "var(--font-geist-sans)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        soft: "0 6px 22px rgba(60,50,30,0.07)",
        lift: "0 8px 24px rgba(60,50,30,0.18)",
        glow: "0 6px 18px rgba(91,82,224,0.30)",
      },
      letterSpacing: {
        tightest: "-0.05em",
      },
      keyframes: {
        "modal-pop": {
          from: { opacity: "0", transform: "scale(0.92) translateY(10px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "marquee-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "marquee-right": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "modal-pop": "modal-pop 0.3s cubic-bezier(0.16,1,0.3,1)",
        "marquee-left": "marquee-left 38s linear infinite",
        "marquee-right": "marquee-right 48s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
