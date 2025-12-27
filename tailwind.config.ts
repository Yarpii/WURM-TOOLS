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
        dark: {
          bg: "#1a1a2e",
          card: "#16213e",
          input: "#0f3460",
        },
        accent: {
          DEFAULT: "#e94560",
          hover: "#ff6b6b",
        },
        success: "#4ecca3",
        warning: "#ffc107",
        danger: "#dc3545",
        info: "#17a2b8",
        category: {
          wood: "#c4a35a",
          ore: "#7a8b99",
          material: "#9b8b7a",
          metal: "#a8a8a8",
          vehicle: "#6a8caf",
          building: "#b87333",
          tool: "#8b7355",
          misc: "#888888",
        },
      },
    },
  },
  plugins: [],
};

export default config;
