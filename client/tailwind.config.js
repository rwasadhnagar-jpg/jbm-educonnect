/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1a56db',
        secondary: '#f3f4f6',
        success: '#16a34a',
        danger: '#dc2626',
        textMain: '#111827',
        muted: '#6b7280'
      }
    }
  },
  plugins: []
}
