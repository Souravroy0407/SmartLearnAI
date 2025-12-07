/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Indigo 600
          light: '#818CF8', // Indigo 400
          dark: '#3730A3', // Indigo 800
        },
        secondary: {
          DEFAULT: '#64748B', // Slate 500
          light: '#94A3B8', // Slate 400
          dark: '#334155', // Slate 700
        },
        background: '#F8FAFC', // Slate 50
        surface: '#FFFFFF',
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        error: '#EF4444', // Red 500
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
