/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        void: '#08080D',
        'void-elevated': '#0F0F17',
        'text-secondary': '#9B98A8',
        violet: '#7C3AED',
        magenta: '#EC4899',
        amber: '#F59E0B',
        signal: '#F5A623',
        alert: '#F0455C',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
        'gradient-accent-data': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F59E0B 100%)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
      },
      keyframes: {
        glowDrift: {
          '0%': { '--glow-x': '50%', '--glow-y': '15%' },
          '50%': { '--glow-x': '65%', '--glow-y': '35%' },
          '100%': { '--glow-x': '35%', '--glow-y': '25%' },
        },
      },
      animation: {
        glow: 'glowDrift 22s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
