/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"Manrope"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: '#38bdf8',
        accent: '#f97316',
        surface: '#0b1224',
        'surface-2': '#111a2f',
      },
      boxShadow: {
        glow: '0 18px 50px rgba(56, 189, 248, 0.25)',
      },
      backgroundImage: {
        'radial-dots':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
}
