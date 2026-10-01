/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Offizielle Farbpalette des Staatlichen Berufsschulzentrums Jena-Göschwitz (sbsz-jena.de)
        sbsz: {
          blue: '#336699',          // SBSZ Haupt-Blau (Navbar, Header, Brand)
          darkBlue: '#1f4469',      // SBSZ Dunkelblau
          navy: '#132c45',          // SBSZ Nachtblau
          lightBlue: '#edf4fa',     // Helles Pastellblau für Karten & Hintergründe
          borderBlue: '#b9d5ee',    // Zarte Umrandungen
          red: '#da4453',           // SBSZ Akzent-Korallenrot der Website
          darkRed: '#be2b3a',       // SBSZ Dunkelrot für Hover
          lightRed: '#fdf2f4',      // Soft-Rot für Badges & Alerts
          lime: '#99ff00',          // SBSZ Logo-Neongrün
          cyan: '#4fe7f2',          // SBSZ Türkis (Footer/Subhead)
          gray: '#f4f7fa',          // Moderner kühler Seitenhintergrund
        },
        ihk: {
          blue: '#336699',
          darkBlue: '#1f4469',
          lightBlue: '#edf4fa',
          accent: '#2b78c5',
          gold: '#f59e0b',
          gray: '#f4f7fa'
        }
      }
    },
  },
  plugins: [],
}
