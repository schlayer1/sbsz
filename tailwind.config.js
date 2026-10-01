/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ihk: {
          blue: '#003366',
          darkBlue: '#002244',
          lightBlue: '#e8f0fe',
          accent: '#2563eb',
          gold: '#f59e0b',
          gray: '#f1f5f9'
        }
      }
    },
  },
  plugins: [],
}
