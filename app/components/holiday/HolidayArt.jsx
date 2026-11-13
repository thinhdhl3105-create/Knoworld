// v48: minh hoạ SVG riêng cho từng ngày lễ (vẽ tay bằng hình khối, không dùng ảnh).

const star5 = (cx, cy, R, r) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; p.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`); }
  return p.join(' ');
};

function Lantern({ x, h, s = 1, delay = 0 }) {
  return (
    <g className="hl-swing" style={{ transformOrigin: `${x}px 0px`, animationDelay: `${delay}s` }}>
      <line x1={x} y1="0" x2={x} y2={h} stroke="#ffd25e" strokeWidth="1.5" />
      <g transform={`translate(${x} ${h}) scale(${s})`}>
        <rect x="-10" y="-4" width="20" height="6" rx="1.5" fill="#ffd25e" />
        <ellipse cx="0" cy="22" rx="24" ry="20" fill="#e3222a" />
        <ellipse cx="0" cy="22" rx="14" ry="20" fill="none" stroke="#ffb02e" strokeWidth="1.4" opacity=".8" />
        <ellipse cx="0" cy="22" rx="5" ry="20" fill="none" stroke="#ffb02e" strokeWidth="1.2" opacity=".7" />
        <rect x="-10" y="40" width="20" height="6" rx="1.5" fill="#ffd25e" />
        <text x="0" y="28" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffd25e" fontFamily="serif">福</text>
        {[-6, -2, 2, 6].map((dx) => <line key={dx} x1={dx} y1="46" x2={dx * 1.2} y2="64" stroke="#ffd25e" strokeWidth="1.4" />)}
      </g>
    </g>
  );
}
function Mai({ x, y, r = 7, c = '#ffd23f' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.42} ry={r * 0.62} fill={c} transform={`rotate(${a})`} />)}
      <circle r={r * 0.25} fill="#d96a00" />
    </g>
  );
}

function Tet({ h }) {
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <path d="M-5 150 C 60 120, 90 140, 140 105 S 230 80, 330 40" stroke="#5a3520" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M140 105 C 150 130, 175 140, 200 150" stroke="#5a3520" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M230 75 C 240 55, 255 50, 270 30" stroke="#5a3520" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[20, 140], [52, 128], [88, 134], [118, 116], [150, 112], [176, 140], [200, 150], [196, 96], [236, 76], [256, 46], [270, 30], [290, 56], [312, 44], [104, 150]].map(([x, y], i) => <Mai key={i} x={x} y={y} r={i % 3 ? 7 : 9} />)}
      <Lantern x={70} h={18} delay={0} />
      <Lantern x={250} h={34} s={0.82} delay={0.6} />
      <text x="160" y="190" textAnchor="middle" className="hl-art-cap">An khang · Thịnh vượng</text>
    </svg>
  );
}

function Fireworks({ h, c1 = '#ffd27a', c2 = '#9be7ff', big }) {
  const burst = (cx, cy, r, c, n = 16) => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return <line key={i} x1={cx + Math.cos(a) * r * 0.3} y1={cy + Math.sin(a) * r * 0.3} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={c} strokeWidth="2.4" strokeLinecap="round" />;
  });
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <g className="hl-pop">{burst(70, 60, 44, c1)}</g>
      <g className="hl-pop" style={{ animationDelay: '.5s' }}>{burst(250, 50, 38, c2, 14)}</g>
      <g className="hl-pop" style={{ animationDelay: '1s' }}>{burst(170, 34, 26, '#ff9bd2', 12)}</g>
      {big && <text x="160" y="170" textAnchor="middle" className="hl-art-year">{big}</text>}
    </svg>
  );
}

function Flowers({ c1, c2 }) {
  const tulip = (x, y, c, rot) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 0 L0 90" stroke="#3f8a4a" strokeWidth="3.2" />
      <path d="M0 60 C -18 50, -24 36, -22 26 C -12 36, -4 44, 0 56" fill="#4fa05a" />
      <path d="M-14 -2 C -16 -26, -6 -34, 0 -24 C 6 -34, 16 -26, 14 -2 C 10 8, -10 8, -14 -2 Z" fill={c} />
      <path d="M0 -24 C -4 -14, -4 -4, 0 4" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" fill="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      {tulip(130, 70, c1, -22)}{tulip(160, 52, c2, 0)}{tulip(190, 70, c1, 22)}{tulip(112, 92, c2, -38)}{tulip(208, 92, c2, 38)}
      <path d="M128 140 L192 140 L176 196 L144 196 Z" fill="#fff3e6" opacity=".95" />
      <path d="M128 140 L160 160 L192 140" fill="none" stroke={c1} strokeWidth="3" />
      <path d="M150 160 q10 10 20 0" stroke={c2} strokeWidth="4" fill="none" />
      {[[60, 60], [262, 70], [40, 140], [282, 140]].map(([x, y], i) => <path key={i} d={`M${x} ${y} c -6 -8, -16 -2, -10 6 l 10 10 l 10 -10 c 6 -8, -4 -14, -10 -6 z`} fill={i % 2 ? c1 : c2} opacity=".8" className="hl-float" style={{ animationDelay: `${i * 0.4}s` }} />)}
    </svg>
  );
}

function Flag({ h }) {
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <rect x="86" y="18" width="5" height="176" rx="2" fill="#e8e2d0" />
      <circle cx="88.5" cy="16" r="5" fill="#ffde00" />
      <g className="hl-wave">
        <path d="M91 24 C 140 10, 180 40, 240 24 L 240 124 C 180 140, 140 110, 91 124 Z" fill="#da251d" />
        <polygon points={star5(165, 74, 30, 12)} fill="#ffde00" />
      </g>
      <text x="270" y="186" textAnchor="end" className="hl-art-cap">30.4.1975 — 30.4.{h.year}</text>
    </svg>
  );
}

function Labour() {
  const teeth = Array.from({ length: 12 }, (_, i) => <rect key={i} x="-7" y="-58" width="14" height="16" rx="2" fill="#ffd27a" transform={`rotate(${i * 30})`} />);
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <g transform="translate(160 100)">
        <g className="hl-spin">{teeth}<circle r="46" fill="#ffd27a" /><circle r="30" fill="#1f5fa8" /></g>
        <text x="0" y="12" textAnchor="middle" className="hl-art-big">1/5</text>
      </g>
      <g transform="translate(58 120) rotate(-30)"><rect x="-4" y="-6" width="8" height="70" rx="3" fill="#c98a52" /><rect x="-20" y="-20" width="40" height="18" rx="3" fill="#cfd6de" /></g>
      <g transform="translate(262 120) rotate(30)"><rect x="-4" y="0" width="8" height="64" rx="3" fill="#c98a52" /><path d="M-16 -18 a 16 16 0 1 0 32 0 l -8 0 l 0 10 l -16 0 l 0 -10 z" fill="#cfd6de" /></g>
    </svg>
  );
}

function Teachers() {
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <rect x="40" y="16" width="240" height="112" rx="6" fill="#20402f" stroke="#8a6a4c" strokeWidth="7" />
      <text x="160" y="62" textAnchor="middle" className="hl-chalk">Thank you,</text>
      <text x="160" y="98" textAnchor="middle" className="hl-chalk">thầy cô ♥</text>
      <rect x="208" y="122" width="26" height="6" rx="2" fill="#f4f1e6" />
      <path d="M96 196 L160 182 L224 196 L224 152 L160 140 L96 152 Z" fill="#fff8e6" />
      <path d="M160 140 L160 182" stroke="#c9b48a" strokeWidth="2" />
      {[150, 158, 166, 174].map((y) => <g key={y}><line x1="106" y1={y + 2} x2="150" y2={y - 6} stroke="#d8c8a6" strokeWidth="1.4" /><line x1="170" y1={y - 6} x2="214" y2={y + 2} stroke="#d8c8a6" strokeWidth="1.4" /></g>)}
      <g transform="translate(262 150)">
        <path d="M0 40 L0 0" stroke="#3f8a4a" strokeWidth="3" />
        {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="-9" rx="6" ry="9" fill="#ffd25e" transform={`rotate(${a})`} />)}
        <circle r="5" fill="#e07b00" />
      </g>
    </svg>
  );
}

function Christmas() {
  const balls = [[160, 70, '#ff4d4d'], [140, 100, '#ffd25e'], [182, 106, '#7ee8ff'], [124, 140, '#ff9bd2'], [170, 146, '#ff4d4d'], [200, 138, '#ffd25e'], [150, 128, '#ffffff']];
  return (
    <svg viewBox="0 0 320 200" className="hl-art-svg" aria-hidden="true">
      <polygon points="160,30 110,96 132,96 96,140 124,140 86,180 234,180 196,140 224,140 188,96 210,96" fill="#2f8a4f" />
      <rect x="150" y="180" width="20" height="16" fill="#7a4c2a" />
      <polygon points={star5(160, 28, 16, 7)} fill="#ffd25e" className="hl-twinkle" />
      {balls.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="5.5" fill={c} className="hl-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />)}
      <rect x="236" y="160" width="30" height="26" fill="#ff4d4d" /><rect x="248" y="160" width="6" height="26" fill="#ffd25e" />
      <rect x="58" y="166" width="26" height="20" fill="#7ee8ff" /><rect x="58" y="173" width="26" height="5" fill="#ffffff" />
    </svg>
  );
}

export default function HolidayArt({ h }) {
  const c = h.colors;
  switch (h.deco) {
    case 'tet': return <Tet h={h} />;
    case 'newyear': return <Fireworks h={h} big={h.year} />;
    case 'flowers': return <Flowers c1={c.accent} c2={c.soft} />;
    case 'flag': return <Flag h={h} />;
    case 'labour': return <Labour />;
    case 'teachers': return <Teachers />;
    case 'christmas': return <Christmas />;
    default: return <Fireworks h={h} />;
  }
}
