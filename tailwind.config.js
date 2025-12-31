/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/client/index.html', './src/client/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      colors: {
        neutral: {
          950: '#0a0a0a',
        },
      },
      maxWidth: {
        readable: '28rem',
      },
    },
  },
  plugins: [],
};
