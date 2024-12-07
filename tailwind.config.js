/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#14101b",
        card: "#1c1525",
        input: "#2a2333",
        border: "rgba(255, 255, 255, 0.1)",
        "border-hover": "rgba(255, 255, 255, 0.2)",
        chart: {
          publicSale: "#FF6B6B",
          privateRounds: "#4ECDC4",
          teamAndAdvisors: "#45B7D1",
          development: "#96CEB4",
          ecosystem: "#FFEEAD",
          treasury: "#D4A5A5",
          liquidityPool: "#9B59B6",
        },
      },
      textColor: {
        primary: "#ffffff",
        secondary: "rgba(255, 255, 255, 0.7)",
        muted: "rgba(255, 255, 255, 0.5)",
      },
    },
  },
  plugins: [],
}
