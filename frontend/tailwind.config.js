/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        panel: v('panel'),
        raised: v('raised'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        pitch: v('pitch'),
        'pitch-ink': v('pitch-ink'),
        chalk: v('chalk'),
        card: { yellow: '#f2c230', red: '#e5484d' },
        draw: { arrow: '#f5e63c', zone: '#4aa8ff' },
      },
      fontFamily: {
        sans: ['"Barlow"', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', '"Barlow"', 'system-ui', 'sans-serif'],
      },
      fontVariantNumeric: { tab: 'tabular-nums' },
    },
  },
  plugins: [],
};
