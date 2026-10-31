/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Palette
        background: '#F5F6FA',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#6655E8',
          hover: '#5544D8',
          active: '#4B3DC4',
          light: '#f2edff',
          container: '#6655E8',
          'on-container': '#ffffff',
          fixed: '#e4dfff',
          'on-fixed': '#160066',
        },
        secondary: {
          DEFAULT: '#20B8A6',
          hover: '#199F8E',
          light: '#e6f8f5',
          container: '#74f8e4',
          'on-container': '#007165',
          fixed: '#74f8e4',
          'fixed-dim': '#54dbc8',
          'on-fixed-variant': '#005047',
        },
        'main-text': '#252A3A',
        'viewport': '#171B2D',

        // Stitch Design System Tokens
        surface: '#F5F6FA',
        'surface-dim': '#d5d9ef',
        'surface-bright': '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f3ff',
        'surface-container': '#eaedff',
        'surface-container-high': '#e3e7fd',
        'surface-container-highest': '#dde2f7',
        'on-surface': '#252A3A',
        'on-surface-variant': '#474554',
        outline: '#787586',
        'outline-variant': '#c8c4d7',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(37, 42, 58, 0.04), 0 1px 2px -1px rgba(37, 42, 58, 0.04)',
        'floating': '0 4px 12px -2px rgba(37, 42, 58, 0.08), 0 2px 6px -2px rgba(37, 42, 58, 0.05)',
        'modal': '0 16px 32px -6px rgba(37, 42, 58, 0.12), 0 6px 12px -4px rgba(37, 42, 58, 0.06)',
      }
    },
  },
  plugins: [],
}
