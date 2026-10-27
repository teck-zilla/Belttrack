import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-on-primary)',
          container: 'var(--color-primary-container)',
          'on-container': 'var(--color-on-primary-container)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-on-secondary)',
          container: 'var(--color-secondary-container)',
          'on-container': 'var(--color-on-secondary-container)',
        },
        tertiary: {
          DEFAULT: 'var(--color-tertiary)',
          foreground: 'var(--color-on-tertiary)',
          container: 'var(--color-tertiary-container)',
          'on-container': 'var(--color-on-tertiary-container)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          foreground: 'var(--color-on-error)',
          container: 'var(--color-error-container)',
          'on-container': 'var(--color-on-error-container)',
        },
        warning: {
          DEFAULT: 'var(--key-color-warning)',
          foreground: 'var(--color-palette-warning-10)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-on-surface)',
          variant: 'var(--color-surface-variant)',
          'on-variant': 'var(--color-on-surface-variant)',
          container: 'var(--color-surface-container)',
          'container-low': 'var(--color-surface-container-low)',
          'container-lowest': 'var(--color-surface-container-lowest)',
          'container-high': 'var(--color-surface-container-high)',
          'container-highest': 'var(--color-surface-container-highest)',
        },
        inverse: {
          surface: 'var(--color-inverse-surface)',
          'on-surface': 'var(--color-inverse-on-surface)',
          primary: 'var(--color-inverse-primary)',
        },
        outline: {
          DEFAULT: 'var(--color-outline)',
          variant: 'var(--color-outline-variant)',
        },
      },
      fontFamily: {
        display: ['var(--font-family-display)', 'sans-serif'],
        headline: ['var(--font-family-headline)', 'sans-serif'],
        title: ['var(--font-family-title)', 'sans-serif'],
        body: ['var(--font-family-body)', 'sans-serif'],
        label: ['var(--font-family-label)', 'monospace'],
      },
      boxShadow: {
        'soft-2': 'var(--shadow-soft-shadow-2)',
        'medium-2': 'var(--shadow-medium-shadow-2)',
        'hard-2': 'var(--shadow-hard-shadow-2)',
        soft: 'var(--shadow-soft-shadow)',
        medium: 'var(--shadow-medium-shadow)',
        hard: 'var(--shadow-hard-shadow)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
    },
  },
  plugins: [],
};

export default config;
