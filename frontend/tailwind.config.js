/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Definição das cores para evitar erros de "unknown class"
        lignum: {
          bg: '#121212',
          panel: '#1E1E1E',
          card: '#2C2C2C',
          text: '#E0E0E0',
          accent: '#646cff',
        }
      }
    },
  },
  plugins: [],
}