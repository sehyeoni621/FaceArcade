/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        // Surfaces, darkest to lightest.
        fa: {
          void: '#04041a',
          card: '#080824',
          deep: '#080a28',
          stage: '#0a0c2a',
          panel: '#0e0c32',
        },
        // Structural lines. Named for the role, used with an opacity modifier.
        edge: {
          rule: '#5a50ff',
          line: '#786eff',
          violet: '#785aff',
          orchid: '#a05aff',
          wire: '#6e7dff',
        },
        neon: {
          cyan: '#3ff0ff',
          pink: '#ff3fd6',
          purple: '#b06cff',
          violet: '#7b5cff',
          indigo: '#5b6cff',
          green: '#3dff7a',
          mesh: '#6ea8ff',
        },
        ink: {
          DEFAULT: '#e6e9ff',
          bright: '#dfe3ff',
          ice: '#dffbff',
          soft: '#c9cdf5',
          dim: '#b9bff0',
          mute: '#8a90c8',
          faint: '#6f75b0',
        },
      },
      spacing: {
        // Scroll padding so a tab bar never covers the last row.
        tabbar: '104px',
      },
      height: {
        // Touch targets from the mobile artboard: primary CTA / secondary / icon.
        cta: '56px',
        'cta-sm': '48px',
        touch: '44px',
        tabbar: '92px',
      },
      minHeight: {
        cta: '56px',
        'cta-sm': '48px',
        touch: '44px',
      },
      keyframes: {
        'fa-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.45' },
        },
        'fa-grid': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 48px' },
        },
        'fa-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fa-pulse': 'fa-pulse 1.6s ease-in-out infinite',
        'fa-grid': 'fa-grid 3s linear infinite',
        'fa-float': 'fa-float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
