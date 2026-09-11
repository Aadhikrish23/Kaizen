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
        sans: ['Outfit', 'Barlow', 'system-ui', '-apple-system', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        kaizen: {
          bg: '#0B0D13',
          surface: '#131722',
          'surface-hover': '#1A202E',
          'surface-elevated': '#22293A',
          card: '#131722',
          border: '#222A3C',
          'border-muted': '#181E2B',
          text: '#F8FAFC',
          muted: '#94A3B8',
          subtle: '#64748B',
          primary: '#10B981', // Athletic Emerald
          'primary-hover': '#059669',
          'primary-subtle': 'rgba(16, 185, 129, 0.12)',
          workout: '#F43F5E', // Strength / Coral Crimson
          'workout-subtle': 'rgba(244, 63, 94, 0.12)',
          water: '#06B6D4',   // Hydration Cyan
          'water-subtle': 'rgba(6, 182, 212, 0.12)',
          calories: '#F59E0B', // Nutrition Amber
          'calories-subtle': 'rgba(245, 158, 11, 0.12)',
          weight: '#8B5CF6',   // Weight Metric Violet
          'weight-subtle': 'rgba(139, 92, 246, 0.12)',
          sleep: '#6366F1',    // Sleep Cycle Indigo
          'sleep-subtle': 'rgba(99, 102, 241, 0.12)',
          energy: '#F97316',   // Energy Orange
          'energy-subtle': 'rgba(249, 115, 22, 0.12)',
        }
      },
      borderRadius: {
        'structural': '12px',
        'control': '8px',
        'sm-control': '6px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'card': '0 4px 16px -2px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 10px 25px -4px rgba(0, 0, 0, 0.6), 0 0 15px -3px rgba(16, 185, 129, 0.08)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
      }
    },
  },
  plugins: [],
}
