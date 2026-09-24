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
        uern: {
          primary: "#003366", // Azul Marinho Institucional UERN
          secondary: "#0055A5",
          accent: "#D97706", // Âmbar / Dourado para alertas e prazos
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#1E293B",
          muted: "#64748B",
          dark: "#10242B",
          teal: "#1F5D6B",
        }
      },
    },
  },
  plugins: [],
};
export default config;
