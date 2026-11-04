/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { jade: '#173a35', parchment: '#fbfaf6' } } },
  // Existing site CSS has its own reset; avoid changing its typography/layout.
  corePlugins: { preflight: false },
  plugins: []
}
