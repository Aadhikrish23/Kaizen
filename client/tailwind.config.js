/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        kaizen: {
          bg: '#0C0E14',
          surface: '#141721',
          'surface-hover': '#1A1E2B',
          'surface-elevated': '#202534',
          border: '#242A3D',
          'border-muted': '#1A1E2B',
          text: '#F0F2F5',
          muted: '#8B93A7',
          subtle: '#5A6275',
          primary: '#10B981', // Athletic Emerald
          'primary-subtle': 'rgba(16, 185, 129, 0.12)',
          workout: '#F43F5E', // Strength / Coral Crimson
          'workout-subtle': 'rgba(244, 63, 94, 0.12)',
          water: '#06B6D4',   // Hydration Cyan
          'water-subtle': 'rgba(6, 182, 212, 0.12)',
          calories: '#F59E0B', // Nutrition Amber
          'calories-subtle': 'rgba(245, 158, 11, 0.12)',
          weight: '#8B5CF6',   // Weight Metric Violet
          'weight-subtle': 'rgba(139, 92, 246, 0.12)',
        }
      },
      borderRadius: {
        'structural': '12px',
        'control': '8px',
        'sm-control': '6px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.35)',
        'card': '0 4px 12px -2px rgba(0, 0, 0, 0.45)',
        'modal': '0 20px 40px -10px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
