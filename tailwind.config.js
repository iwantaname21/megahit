/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        'green-accent': '#6DD0A9',
        'green-bright': '#8befc6',
        'pink-accent': '#FF8AA8',
        'tile-dark': '#19191A',
        'tile-mid': '#2A2A2B',
        'app-bg': '#ECE8E8',
        'app-text': '#131314',
      },
      keyframes: {
        pulse2: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        spinIn: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
      },
      animation: {
        pulse2: 'pulse2 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
