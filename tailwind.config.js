/** @type {import('tailwindcss').Config} */
function withOpacity(variable) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        /*
         * Tela com espaço de sobra para o modo de altura travada.
         *
         * Exige largura E altura. Um notebook 1366x768 passa na largura mas
         * não na altura: com o shell travado ali, o cabeçalho e os filtros
         * comiam quase tudo, sobrava pouco mais de 150px para a lista e não
         * havia como rolar para alcançar o resto. Abaixo deste ponto a página
         * volta a rolar por inteiro.
         */
        desk: { raw: '(min-width: 1280px) and (min-height: 860px)' },
      },
      colors: {
        ink: withOpacity('--bg'),
        panel: withOpacity('--bg-panel'),
        elevated: withOpacity('--bg-elevated'),
        edge: withOpacity('--border'),
        'edge-strong': withOpacity('--border-strong'),
        fg: withOpacity('--text'),
        muted: withOpacity('--text-muted'),
        faint: withOpacity('--text-faint'),
        volt: {
          DEFAULT: withOpacity('--accent'),
          strong: withOpacity('--accent-strong'),
          ink: withOpacity('--accent-ink'),
          soft: 'rgb(var(--accent) / 0.12)',
        },
        info: {
          DEFAULT: withOpacity('--info'),
          soft: 'rgb(var(--info) / 0.12)',
        },
        danger: {
          DEFAULT: withOpacity('--danger'),
          soft: 'rgb(var(--danger) / 0.12)',
        },
        success: {
          DEFAULT: withOpacity('--success'),
          soft: 'rgb(var(--success) / 0.12)',
        },
        warning: {
          DEFAULT: withOpacity('--warning'),
          soft: 'rgb(var(--warning) / 0.12)',
        },
      },
      fontFamily: {
        display: ['"Big Shoulders"', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in': 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s infinite linear',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
