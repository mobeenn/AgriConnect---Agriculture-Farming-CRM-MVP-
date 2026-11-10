/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#244B32', leaf: '#3D7548', fresh: '#79A95B', sage: '#DCE8D4', cream: '#F7F8F1',
        earth: '#8B6748', harvest: '#E7BD58', ink: '#26352A', muted: '#788477',
      },
      fontFamily: { display: ['var(--font-display)', 'Georgia', 'serif'], sans: ['var(--font-body)', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(36,75,50,.05), 0 8px 24px -8px rgba(36,75,50,.10)',
        lift: '0 18px 40px -12px rgba(36,75,50,.28)',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        popIn: { from: { opacity: 0, transform: 'scale(.95) translateY(8px)' }, to: { opacity: 1, transform: 'scale(1) translateY(0)' } },
        slideRight: { from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        sway: { from: { transform: 'rotate(-4deg)' }, to: { transform: 'rotate(4deg)' } },
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        drift: { from: { transform: 'translateX(-14px)' }, to: { transform: 'translateX(24px)' } },
        spin: { to: { transform: 'rotate(360deg)' } },
        moonRise: { from: { opacity: 0, transform: 'translateY(60%)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        twinkle: { '0%,100%': { opacity: 0.25, transform: 'scale(.8)' }, '50%': { opacity: 1, transform: 'scale(1.3)' } },
      },
      animation: {
        'fade-up': 'fadeUp .7s cubic-bezier(.2,.7,.2,1) both',
        'fade-in': 'fadeIn .3s ease both',
        'pop-in': 'popIn .35s cubic-bezier(.2,.8,.2,1) both',
        'slide-right': 'slideRight .6s cubic-bezier(.2,.7,.2,1) both',
        'moon-rise': 'moonRise .9s cubic-bezier(.2,.8,.2,1) both',
        twinkle: 'twinkle 3s ease-in-out infinite',
        float: 'floatY 6s ease-in-out infinite',
        'float-slow': 'floatY 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
