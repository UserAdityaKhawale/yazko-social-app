import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        yazko: {
          black: "#000000",
          gray: "#18181B",
          accent: "#FF5E00",
          white: "#FFFFFF",
          ember: "#FF8A47",
          stone: "#A1A1AA"
        }
      },
      boxShadow: {
        glow: "0 20px 60px rgba(255, 94, 0, 0.16)",
        panel: "0 30px 90px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        haze:
          "radial-gradient(circle at top left, rgba(255, 94, 0, 0.14), transparent 24%), radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.05), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;
