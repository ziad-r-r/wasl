/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#14221f",
        foam: "#f6f1e8",
        tide: "#1c5f59",
        coral: "#d4654a",
        sand: "#e6d5bc",
        pine: "#0e2c2a"
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Outfit", "IBM Plex Sans Arabic", "Segoe UI", "sans-serif"],
        arabic: ["IBM Plex Sans Arabic", "Outfit", "sans-serif"]
      },
      boxShadow: {
        card: "0 18px 50px -28px rgba(20, 34, 31, 0.45)"
      }
    }
  },
  plugins: []
};
