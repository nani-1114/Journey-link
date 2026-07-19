/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        primary: {
          DEFAULT: "#3b82f6",
          dark: "#1d4ed8",
          light: "#60a5fa",
        },
        accent: {
          DEFAULT: "#22c55e",
          dark: "#15803d",
          light: "#4ade80",
        },
        cardBg: "rgba(30, 41, 59, 0.7)",
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}
