// Hand-drawn SVG farming illustrations (no external images needed).
const Stalk = ({ x, y, h = 70, delay = 0, color = '#C9A24A' }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className="sway" style={{ animationDelay: `${delay}s` }}>
      <path d={`M0 0 C-3 ${-h / 3} 3 ${-(2 * h) / 3} 0 ${-h}`} stroke="#6E9B4E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <ellipse cx="-5" cy={-h + 4 + i * 8} rx="3" ry="6" transform={`rotate(-28 -5 ${-h + 4 + i * 8})`} fill={color} />
          <ellipse cx="5" cy={-h + 4 + i * 8} rx="3" ry="6" transform={`rotate(28 5 ${-h + 4 + i * 8})`} fill={color} />
        </g>
      ))}
      <ellipse cx="0" cy={-h - 8} rx="3" ry="7" fill={color} />
    </g>
  </g>
);

export function FieldScene({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6D6" /><stop offset="1" stopColor="#DCE8D4" /></linearGradient>
        <linearGradient id="fs-h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9CC47A" /><stop offset="1" stopColor="#5E9A5A" /></linearGradient>
        <linearGradient id="fs-h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4F8E50" /><stop offset="1" stopColor="#244B32" /></linearGradient>
      </defs>
      <rect width="800" height="260" fill="url(#fs-sky)" />
      <g transform="translate(655 72)">
        <g className="spin-slow">
          {Array.from({ length: 12 }).map((_, i) => <rect key={i} x="-2" y="-58" width="4" height="14" rx="2" fill="#E7BD58" opacity=".7" transform={`rotate(${i * 30})`} />)}
        </g>
        <circle r="34" fill="#F3C85C" /><circle r="26" fill="#F8DA82" opacity=".7" />
      </g>
      <g className="drift" opacity=".9"><ellipse cx="150" cy="58" rx="46" ry="14" fill="#fff" /><ellipse cx="182" cy="50" rx="28" ry="14" fill="#fff" /><ellipse cx="120" cy="52" rx="24" ry="11" fill="#fff" /></g>
      <g className="drift-slow" opacity=".75"><ellipse cx="430" cy="34" rx="36" ry="10" fill="#fff" /><ellipse cx="455" cy="28" rx="22" ry="10" fill="#fff" /></g>
      <path d="M0 168 C110 118 250 150 390 128 S690 106 800 150 V260 H0Z" fill="url(#fs-h1)" />
      <path d="M0 150 C80 130 130 140 190 150" stroke="#B9D69B" strokeWidth="2" fill="none" opacity=".6" />
      <path d="M0 206 C150 168 310 202 470 180 S710 168 800 194 V260 H0Z" fill="url(#fs-h2)" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M0 ${222 + i * 11} C200 ${204 + i * 11} 420 ${236 + i * 11} 800 ${208 + i * 11}`} stroke="#8DBB6B" strokeWidth="2" fill="none" opacity={0.45 - i * 0.07} />)}
      <g>
        <rect x="560" y="150" width="46" height="30" fill="#B5533C" /><path d="M552 152 L583 128 L614 152Z" fill="#8B3A2A" /><rect x="574" y="162" width="14" height="18" fill="#F1E6D3" />
      </g>
      {[40, 90, 140, 210, 270, 330, 420, 500, 640, 700, 750].map((x, i) => <Stalk key={x} x={x} y={258 - (i % 3) * 6} h={52 + (i % 4) * 10} delay={(i % 5) * 0.4} />)}
    </svg>
  );
}

export function Leaf({ className = '', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden="true"><path d="M12 88 C8 40 40 10 90 8 C92 56 62 90 12 88Z" fill="currentColor" /><path d="M12 88 C35 62 55 38 80 18" stroke="#fff" strokeOpacity=".5" strokeWidth="2" fill="none" /></svg>
  );
}

export function Botanical({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 240" aria-hidden="true" fill="currentColor">
      <path d="M100 240 C98 180 102 120 100 40" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g className="sway-slow"><path d="M100 70 C60 66 40 36 52 12 C84 20 100 44 100 70Z" /><path d="M100 70 C140 62 160 32 148 8 C116 18 100 42 100 70Z" /></g>
      <g className="sway"><path d="M100 130 C54 130 28 98 38 70 C76 76 100 100 100 130Z" /><path d="M100 120 C146 116 172 86 162 58 C126 66 100 90 100 120Z" /></g>
      <path d="M100 190 C62 192 40 166 46 142 C80 146 100 166 100 190Z" /><path d="M100 180 C140 178 160 154 152 132 C122 138 100 158 100 180Z" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-sage/70 blur-3xl" />
      <div className="absolute -bottom-48 right-0 h-[520px] w-[520px] rounded-full bg-[#F3E7BC]/70 blur-3xl" />
      <Leaf className="absolute -right-10 top-24 h-64 w-64 rotate-[18deg] text-fresh/15 animate-float-slow" />
      <Leaf className="absolute -left-16 bottom-10 h-72 w-72 -rotate-[28deg] text-leaf/10 animate-float" />
    </div>
  );
}
