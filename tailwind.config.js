/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-10': 'var(--accent-10)',
        'accent-20': 'var(--accent-20)',
        'accent-30': 'var(--accent-30)',
        'accent-40': 'var(--accent-40)',
      },
      animation: {
        'pop-in': 'popIn 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'pop-out': 'popOut 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-out': 'fadeOut 0.2s ease-in forwards',
        'slide-down-fade': 'slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up-fade-out': 'slideUpFadeOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-spring': 'modalSpring 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'modal-spring-out': 'modalSpringOut 0.25s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
        },
        popOut: {
          '0%': { opacity: '1', transform: 'scale(1)', filter: 'blur(0)' },
          '100%': { opacity: '0', transform: 'scale(0.92)', filter: 'blur(4px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        slideDownFade: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.96)', transformOrigin: 'top right' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', transformOrigin: 'top right' },
        },
        slideUpFadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)', transformOrigin: 'top right' },
          '100%': { opacity: '0', transform: 'translateY(-8px) scale(0.96)', transformOrigin: 'top right' },
        },
        modalSpring: {
          '0%': { opacity: '0', transform: 'scale(0.88) translateY(16px)', filter: 'blur(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        modalSpringOut: {
          '0%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
          '100%': { opacity: '0', transform: 'scale(0.92) translateY(12px)', filter: 'blur(6px)' },
        }
      }
    },
  },
  plugins: [],
}
