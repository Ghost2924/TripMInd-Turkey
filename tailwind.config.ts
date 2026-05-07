import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#FFF8ED",
        sand: "#F7E7C6",
        cream: "#FFFBF3",
        teal: {
          DEFAULT: "#0F5E63",
          light: "#168B8F",
          50: "#EBF7F7",
          100: "#C8EAEB",
          200: "#91D5D7",
          600: "#168B8F",
          700: "#0F5E63",
          800: "#0A4347",
        },
        terracotta: {
          DEFAULT: "#C75B39",
          light: "#D97B5E",
          50: "#FDF0EB",
          100: "#F9D5C8",
          600: "#C75B39",
          700: "#A84A2D",
        },
        turkish: {
          red: "#B7322C",
          gold: "#D9A441",
        },
        charcoal: "#1F2933",
        slate: "#64748B",
        border: "#EADCC8",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "warm-gradient": "linear-gradient(135deg, #FFF8ED 0%, #F7E7C6 50%, #FFFBF3 100%)",
        "teal-gradient": "linear-gradient(135deg, #0F5E63 0%, #168B8F 100%)",
        "hero-gradient": "linear-gradient(135deg, #FFF8ED 0%, #EBF7F7 40%, #F7E7C6 100%)",
      },
      boxShadow: {
        warm: "0 2px 12px rgba(199, 91, 57, 0.08), 0 1px 3px rgba(31, 41, 51, 0.06)",
        "warm-lg": "0 8px 32px rgba(199, 91, 57, 0.10), 0 2px 8px rgba(31, 41, 51, 0.08)",
        card: "0 1px 4px rgba(31, 41, 51, 0.06), 0 4px 16px rgba(31, 41, 51, 0.04)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
