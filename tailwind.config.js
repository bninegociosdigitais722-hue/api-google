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
        surface: '#f8fafc',
        'surface-2': '#eef2f7',
      },
      boxShadow: {
        glow: '0 18px 50px rgba(56, 189, 248, 0.25)',
      },
      backgroundImage: {
        'radial-dots':
          'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ],
}
