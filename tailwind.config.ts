import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terracota cálida — acciones principales, gastos, deudas pendientes.
        brand: {
          50: "#fdf4f2",
          100: "#fce3de",
          200: "#f8c4ba",
          300: "#f09d8c",
          400: "#e3715a",
          500: "#cd4630",
          600: "#ab2d1b",
          700: "#8d1607",
          800: "#731609",
          900: "#5c130a",
        },
        // Verde bosque — saldos saldados, confirmaciones.
        settled: {
          50: "#eefbf4",
          100: "#d6f5e3",
          200: "#baeed9",
          300: "#8fd9bb",
          400: "#5bb897",
          500: "#3d6d5d",
          600: "#376757",
          700: "#245042",
          800: "#1d4f40",
          900: "#153a30",
        },
        // Mostaza — admin, pendientes, acentos.
        amber: {
          50: "#fdf6ec",
          100: "#fbe8c9",
          200: "#f6d196",
          300: "#eeb35c",
          400: "#d9920f",
          500: "#b15f00",
          600: "#8d4b00",
          700: "#6e3900",
          800: "#552d00",
          900: "#3f2100",
        },
        // Arena cálida — reemplaza el gris frío (slate) en toda la app.
        sand: {
          50: "#fbf9f6",
          100: "#f5f3f0",
          200: "#e4e2df",
          300: "#dbdad7",
          400: "#c4beb7",
          500: "#8d706b",
          600: "#6b5550",
          700: "#59413d",
          800: "#3a2d2a",
          900: "#1b1c1a",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(45 33 20 / 0.04), 0 1px 3px 0 rgb(45 33 20 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(45 33 20 / 0.08), 0 2px 4px -2px rgb(45 33 20 / 0.05)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
