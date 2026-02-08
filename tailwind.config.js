/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./extension/popup.html",
    "./extension/popup.js"
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#f472b6', // soft pink
        'primary-hover': '#ec4899', // slightly darker pink
        'primary-active': '#db2777', // darker pink for active
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 0.8s linear infinite',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
