/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' },
        pashu: { bg:'#f8fafc', card:'#ffffff', border:'#e2e8f0', text:'#0f172a', muted:'#64748b' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgb(0 0 0/0.06),0 1px 2px -1px rgb(0 0 0/0.04)',
        'card-hover':'0 4px 12px 0 rgb(0 0 0/0.10)',
        btn:         '0 2px 8px 0 rgb(29 78 216/0.30)',
      },
      animation: {
        'fade-up':'fadeUp 0.45s ease both',
        'fade-in':'fadeIn 0.35s ease both',
        'slide-in':'slideIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeUp:  { from:{opacity:'0',transform:'translateY(14px)'},to:{opacity:'1',transform:'translateY(0)'} },
        fadeIn:  { from:{opacity:'0'},to:{opacity:'1'} },
        slideIn: { from:{opacity:'0',transform:'translateX(-10px)'},to:{opacity:'1',transform:'translateX(0)'} },
      },
    },
  },
  plugins: [],
}
