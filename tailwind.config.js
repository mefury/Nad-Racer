/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"], // Scans all JS/JSX/TS/TSX files in src/ for Tailwind classes
  theme: {
    extend: {
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"], // Custom font from your original CSS
        exo: ["Exo 2", "sans-serif"],        // For the title
      },
      animation: {
        pulse: "pulse 2s infinite",          // Custom animation from .title
        "pulse-health": "pulse-health 1.5s infinite", // For health icons
      },
      keyframes: {
        pulse: {
          "0%, 100%": { textShadow: "0 0 15px rgba(79, 70, 229, 0.7), 0 0 30px rgba(79, 70, 229, 0.4)" },
          "50%": { textShadow: "0 0 25px rgba(79, 70, 229, 0.8), 0 0 50px rgba(79, 70, 229, 0.5)" },
        },
        "pulse-health": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
      },
    },
  },
  plugins: [],
};