import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B1020',
        foreground: '#E6EAF2',
        card: '#121A30',
        border: '#2A355A',
        primary: '#5B8CFF'
      }
    }
  },
  plugins: []
};

export default config;
