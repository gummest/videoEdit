import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0F',
        surface: '#161619',
        'surface-elevated': '#1E1E22',
        border: '#2A2A2F',
        primary: '#7C5CFF',
        'primary-hover': '#6B4FE0',
        accent: '#00E5A0',
        'text-primary': '#F5F5F7',
        'text-secondary': '#A0A0A8',
        'text-muted': '#6B6B75'
      }
    }
  },
  plugins: []
} satisfies Config;
