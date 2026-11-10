'use client';

// v28: Hàng tòa nhà giả 3D (mặt trước + mặt bên + nóc, 3 lớp xa–gần) cho đầu các trang con.
// `hero` là tòa nhà của trang đang mở, vẽ nổi bật ở bên phải.
import { useId } from 'react';
import { PHASES } from '@/lib/cityTime';

const DX = 16;
const DY = -9;
const B = 184;

const BACK = [[0, 60, 70], [52, 48, 96], [110, 70, 60], [196, 50, 112], [262, 64, 80], [350, 56, 104], [420, 80, 66], [520, 46, 120], [580, 64, 88], [660, 52, 108], [730, 72, 72], [820, 54, 100], [900, 70, 84], [990, 60, 110], [1080, 56, 92], [1150, 70, 118], [1236, 60, 86]];
const MID = [[20, 56, 60], [120, 44, 82], [230, 60, 52], [330, 48, 92], [450, 62, 64], [560, 50, 98], [690, 60, 70], [800, 48, 86], [1190, 56, 74]];
const FRONT = [[0, 58, 44], [70, 40, 70], [170, 62, 40], [262, 46, 96], [372, 70, 46], [470, 44, 84], [590, 66, 52], [700, 48, 104], [806, 60, 58], [888, 44, 78], [1210, 70, 56]];

function Box({ x, w, h, c, base = B, win, swin, op = 1 }) {
  const [f, s, t] = c;
  const y = base - h;
  return (
    <g>
      <polygon points={`${x},${y} ${x + DX},${y + DY} ${x + w + DX},${y + DY} ${x + w},${y}`} fill={t} />
      <polygon points={`${x + w},${y} ${x + w + DX},${y + DY} ${x + w + DX},${base + DY} ${x + w},${base}`} fill={s} />
      <rect x={x} y={y} width={w} height={h} fill={f} />
      {win && <rect x={x + 4} y={y + 6} width={w - 8} height={h - 10} fill={`url(#${win})`} opacity={op} />}
      {swin && (
        <polygon
          points={`${x + w + 3},${y + 5} ${x + w + DX - 3},${y + DY + 7} ${x + w + DX - 3},${base + DY - 4} ${x + w + 3},${base - 3}`}
          fill={`url(#${swin})`} opacity={op * 0.7}
        />
      )}
    </g>
  );
}

function Hero({ kind, p, id, label, accent }) {
  const w1 = `${id}w`;
  const s1 = `${id}s`;
  if (kind === 'news') {
    const x = 1000; const w = 92; const h = 170; const ty = B - h;
    return (
      <g>
        <rect x={x + 44} y={ty - 36} width="4" height="36" fill="#ff8a8a" />
        <circle cx={x + 46} cy={ty - 38} r="4" fill="#ff8a8a" />
        <Box x={x} w={w} h={h} c={['#2c2546', '#1c1730', '#4a3f72']} win={w1} swin={s1} op={p.wo} />
        <rect x={x} y={ty + 22} width={w} height="22" fill="#15121c" stroke="#ffd27a" strokeWidth="1" />
        <polygon points={`${x + w},${ty + 22} ${x + w + DX},${ty + 22 + DY} ${x + w + DX},${ty + 44 + DY} ${x + w},${ty + 44}`} fill="#0d0b12" />
        <text x={x + w / 2} y={ty + 38} textAnchor="middle" fill="#ffd27a" fontFamily="ui-monospace, monospace" fontSize="13" fontWeight="700">LIVE · NEWS</text>
        <rect x={x} y={ty} width={w} height={h} fill="none" stroke="#ff8a8a" strokeWidth="1.5" />
      </g>
    );
  }
  if (kind === 'library') {
    const x = 990; const w = 150; const h = 96; const ty = B - h;
    const cx = x + w / 2 + DX / 2; const cy = ty + DY / 2;
    return (
      <g>
        <Box x={x} w={w} h={h} c={['#33295a', '#211a3c', '#52478a']} />
        <path d={`M${cx - 52},${cy} A52 46 0 0 1 ${cx + 52},${cy} Z`} fill="#4a3f7a" />
        <path d={`M${cx - 52},${cy} A52 46 0 0 1 ${cx - 8},${cy - 45} A60 46 0 0 0 ${cx - 30},${cy} Z`} fill="#62579a" />
        <ellipse cx={cx} cy={cy} rx="52" ry="7" fill="#2a2148" />
        <rect x={cx - 4} y={cy - 60} width="8" height="14" fill="#c6bfff" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <rect x={x + 12 + i * 24} y={ty + 12} width="9" height={h - 18} fill="#c6bfff" opacity=".8" />
            <rect x={x + 18 + i * 24} y={ty + 12} width="3" height={h - 18} fill="#8f86c9" opacity=".8" />
          </g>
        ))}
        <rect x={x + w / 2 - 12} y={B - 44} width="24" height="44" fill="#ffd27a" opacity=".85" />
        <rect x={x} y={ty} width={w} height={h} fill="none" stroke="#c6bfff" strokeWidth="1.5" />
      </g>
    );
  }
  if (kind === 'cinema') {
    const x = 960; const w = 200; const h = 118; const ty = B - h;
    return (
      <g>
        <Box x={x} w={w} h={h} c={['#2c2444', '#1a152b', '#463c6c']} />
        <rect x={x + 14} y={ty + 16} width={w - 28} height="34" fill="#0b0a10" stroke="#ffd27a" strokeWidth="2" />
        <text x={x + w / 2} y={ty + 39} textAnchor="middle" fill="#ffd27a" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="16" letterSpacing="3">CINEMA</text>
        {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={x + 20 + i * 18} cy={ty + 11} r="2.6" fill="#ffd27a" />)}
        <polygon points={`${x + 30},${B - 48} ${x + w - 30},${B - 48} ${x + w - 14},${B - 36} ${x + 14},${B - 36}`} fill="#5ee0a0" opacity=".6" />
        <rect x={x + w / 2 - 22} y={B - 36} width="44" height="36" fill="#ffd27a" opacity=".85" />
        <rect x={x + 24} y={B - 32} width="34" height="28" fill="#5ee0a0" opacity=".35" />
        <rect x={x + w - 58} y={B - 32} width="34" height="28" fill="#ff8a8a" opacity=".35" />
        <rect x={x} y={ty} width={w} height={h} fill="none" stroke="#5ee0a0" strokeWidth="1.5" />
      </g>
    );
  }
  if (kind === 'gallery') {
    const x = 940; const w = 230; const h = 92; const ty = B - h; const apex = ty - 46;
    return (
      <g>
        <Box x={x} w={w} h={h} c={['#e2dbef', '#b9b0cc', '#f2eefa']} />
        <polygon points={`${x + w / 2},${apex} ${x + w / 2 + DX},${apex + DY} ${x + w + DX},${ty + DY} ${x + w},${ty}`} fill="#cfc6e2" />
        <polygon points={`${x - 6},${ty} ${x + w / 2},${apex} ${x + w + 6},${ty}`} fill="#ece6f7" stroke="#5ee0a0" strokeWidth="1.5" />
        <text x={x + w / 2} y={ty - 12} textAnchor="middle" fill="#2a2440" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="12" letterSpacing="2">GALLERY</text>
        {[0, 1, 2, 4, 5, 6].map((i) => (
          <g key={i}>
            <rect x={x + 14 + i * 31} y={ty + 10} width="13" height={h - 14} fill="#c8bfdc" />
            <rect x={x + 23 + i * 31} y={ty + 10} width="4" height={h - 14} fill="#a69cbf" />
          </g>
        ))}
        <rect x={x + w / 2 - 18} y={B - 58} width="36" height="58" fill="#2a2440" />
        <rect x={x - 10} y={B - 6} width={w + 20} height="6" fill="#cfc6e2" />
      </g>
    );
  }
  if (kind === 'square') {
    const x = 1046; const w = 46; const h = 168; const ty = B - h;
    return (
      <g>
        {[[946, 18], [984, 14], [1150, 17], [1182, 12]].map(([tx, r]) => (
          <g key={tx}>
            <ellipse cx={tx + 4} cy={B + 2} rx={r} ry="4" fill="#000" opacity=".25" />
            <rect x={tx - 2} y={B - 14} width="4" height="14" fill="#5b4636" />
            <circle cx={tx} cy={B - 14 - r * 0.6} r={r} fill="#3f6b4a" />
            <circle cx={tx - r * 0.35} cy={B - 14 - r} r={r * 0.45} fill="#5c8f5f" />
          </g>
        ))}
        <Box x={x} w={w} h={h} c={['#2f2850', '#1e1838', '#4a4078']} />
        <polygon points={`${x + w / 2 + DX / 2},${ty - 34} ${x},${ty} ${x + w},${ty}`} fill="#ff9bd2" />
        <polygon points={`${x + w / 2 + DX / 2},${ty - 34} ${x + w},${ty} ${x + w + DX},${ty + DY}`} fill="#c96fa3" />
        <circle cx={x + w / 2} cy={ty + 30} r="15" fill="#f4f1ff" />
        <path d={`M${x + w / 2} ${ty + 30} V${ty + 20} M${x + w / 2} ${ty + 30} L${x + w / 2 + 8} ${ty + 34}`} stroke="#2a2440" strokeWidth="2.5" strokeLinecap="round" />
        <rect x={x + 15} y={ty + 60} width="16" height={h - 60} fill={`url(#${w1})`} opacity={p.wo} />
        <ellipse cx="1068" cy={B - 2} rx="40" ry="6" fill="#7ec8e8" opacity=".6" />
      </g>
    );
  }
  if (kind === 'house') {
    const x = 1000; const w = 130; const h = 84; const ty = B - h; const apex = ty - 50;
    return (
      <g>
        <Box x={x} w={w} h={h} c={['#3a2a4a', '#261b33', '#4e3a62']} />
        <rect x={x + w - 30} y={ty - 42} width="14" height="30" fill="#2e2140" />
        <polygon points={`${x + w / 2},${apex} ${x + w / 2 + DX},${apex + DY} ${x + w + DX + 4},${ty + DY} ${x + w + 4},${ty}`} fill="#c96fa3" />
        <polygon points={`${x - 6},${ty} ${x + w / 2},${apex} ${x + w + 6},${ty}`} fill="#ff9bd2" />
        <rect x={x + 16} y={ty + 16} width="28" height="24" fill="#ffd27a" />
        <rect x={x + w - 44} y={ty + 16} width="28" height="24" fill="#ffd27a" />
        <rect x={x + w / 2 - 14} y={B - 46} width="28" height="46" fill="#ffb27a" />
        <polygon points={`${x + w + 4},${ty + 18} ${x + w + DX - 3},${ty + DY + 20} ${x + w + DX - 3},${ty + DY + 38} ${x + w + 4},${ty + 36}`} fill="#ffd27a" opacity=".7" />
        <ellipse cx={x + w / 2} cy={B + 6} rx="90" ry="10" fill="#ffd27a" opacity=".12" />
      </g>
    );
  }
  if (kind === 'island') {
    // v30: Thinh's Island — Lecture Hall + hải đăng
    const x = 930; const w = 150; const h = 70; const ty = B - h;
    const lx = 1130;
    return (
      <g>
        <polygon points={`${lx + 6},${B - 120} ${lx - 220},${B - 150} ${lx - 220},${B - 112}`} fill="#fff2b0" opacity={p.wo > 0.7 ? 0.16 : 0.07} />
        <Box x={x} w={w} h={h} c={['#3d3858', '#2a2640', '#5b5390']} />
        <polygon points={`${x - 8},${ty} ${x + w / 2},${ty - 34} ${x + w + 8},${ty}`} fill="#5b5390" stroke="#c6bfff" strokeOpacity=".6" />
        <text x={x + w / 2} y={ty - 8} textAnchor="middle" fill="#ece9f5" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="10" letterSpacing="2">LECTURE HALL</text>
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={x + 10 + i * 24} y={ty + 8} width="8" height={h - 8} fill="#e9e4f5" opacity=".85" />)}
        <rect x={x + w / 2 - 12} y={B - 36} width="24" height="36" fill="#ffd27a" opacity=".9" />
        <path d={`M${lx - 12} ${B} L${lx - 7} ${B - 112} L${lx + 7} ${B - 112} L${lx + 12} ${B} Z`} fill="#f2efe8" />
        <rect x={lx - 10} y={B - 78} width="20" height="12" fill="#ff9bd2" />
        <rect x={lx - 11} y={B - 38} width="22" height="12" fill="#ff9bd2" />
        <rect x={lx - 8} y={B - 128} width="16" height="16" fill="#fff2b5" />
        <path d={`M${lx - 11} ${B - 128} L${lx} ${B - 142} L${lx + 11} ${B - 128} Z`} fill="#ff9bd2" />
        <circle cx={lx} cy={B - 145} r="2.5" fill="#ff4a5a" />
      </g>
    );
  }
  // Tòa có biển tên (City Hall, Archive, Post Office…)
  const x = 980; const w = 150; const h = 132; const ty = B - h;
  const a = accent || '#7ee8ff';
  return (
    <g>
      <rect x={x + 70} y={ty - 40} width="3" height="40" fill={a} />
      <polygon points={`${x + 73},${ty - 40} ${x + 98},${ty - 33} ${x + 73},${ty - 26}`} fill={a} />
      <Box x={x} w={w} h={h} c={['#2c2546', '#1c1730', '#4a3f72']} win={w1} swin={s1} op={p.wo} />
      <rect x={x + 12} y={ty + 14} width={w - 24} height="26" fill="#15121c" stroke={a} strokeWidth="1.5" />
      <text x={x + w / 2} y={ty + 32} textAnchor="middle" fill={a} fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="12" letterSpacing="2">{(label || '').toUpperCase()}</text>
      <rect x={x + w / 2 - 16} y={B - 40} width="32" height="40" fill="#ffd27a" opacity=".8" />
      <rect x={x} y={ty} width={w} height={h} fill="none" stroke={a} strokeWidth="1.5" />
    </g>
  );
}


// v30: Xe cộ và người đi đường trên con đường phía trước các tòa nhà.
// Mỗi phương tiện chạy bằng CSS (city.css · .kwt-*), delay âm để rải đều ngay từ đầu.
const CAR_COLORS = ['#ff8a6a', '#7ee8ff', '#ffd27a', '#c6bfff', '#5ee0a0', '#f2efe8', '#ff9bd2'];

function Car({ c, night }) {
  return (
    <g>
      {night && <polygon points="30,-6 70,-12 70,0 30,-3" fill="#fff2b0" opacity=".16" />}
      <path d="M1 -2 V-7 Q1 -8 3 -8 H8 L11 -12 H21 L25 -8 H28 Q30 -8 30 -6 V-2 Z" fill={c} />
      <path d="M12 -11 H17 V-8 H10 Z M18 -11 H20.5 L23.5 -8 H18 Z" fill="#1d2433" opacity=".75" />
      <rect x="28" y="-7" width="2" height="2" fill={night ? '#fff2b0' : '#f6f2e0'} />
      <rect x="0.5" y="-7" width="1.5" height="2" fill="#ff4a5a" />
      <circle cx="7" cy="-1.8" r="2.4" fill="#1a1720" /><circle cx="23" cy="-1.8" r="2.4" fill="#1a1720" />
      <circle cx="7" cy="-1.8" r="0.9" fill="#8b8794" /><circle cx="23" cy="-1.8" r="0.9" fill="#8b8794" />
    </g>
  );
}

function Bus({ night }) {
  return (
    <g>
      {night && <polygon points="54,-8 96,-14 96,0 54,-3" fill="#fff2b0" opacity=".16" />}
      <rect x="0" y="-15" width="54" height="13" rx="2.5" fill="#3fa36b" />
      <rect x="0" y="-6" width="54" height="2" fill="#ffd27a" />
      {[3, 12, 21, 30, 39].map((x) => <rect key={x} x={x} y="-13" width="7" height="5" fill={night ? '#ffe9a8' : '#1d2433'} opacity={night ? 0.9 : 0.7} />)}
      <rect x="47" y="-13" width="5" height="8" fill="#1d2433" opacity=".8" />
      <circle cx="10" cy="-1.8" r="2.6" fill="#1a1720" /><circle cx="44" cy="-1.8" r="2.6" fill="#1a1720" />
    </g>
  );
}

function Moto({ c, shirt, night }) {
  return (
    <g>
      {night && <polygon points="15,-6 40,-10 40,-1 15,-4" fill="#fff2b0" opacity=".14" />}
      <circle cx="3" cy="-2" r="2" fill="#1a1720" /><circle cx="14" cy="-2" r="2" fill="#1a1720" />
      <path d="M2 -4 H11 L15 -7 L14 -4 Z" fill={c} />
      <rect x="5" y="-12" width="4" height="7" rx="1.5" fill={shirt} />
      <path d="M7 -5 L10 -2" stroke="#2a2440" strokeWidth="1.4" />
      <circle cx="7.5" cy="-14" r="2.4" fill={c} />
      <rect x="15" y="-6.5" width="1.4" height="1.4" fill={night ? '#fff2b0' : '#f6f2e0'} />
    </g>
  );
}

function Walker({ shirt, pants = '#2f2a45', hat }) {
  return (
    <g className="kwt-bob">
      <circle cx="0" cy="-11.5" r="1.9" fill="#e8c4a0" />
      {hat && <path d="M-3 -12.2 L0 -15 L3 -12.2 Z" fill={hat} />}
      <rect x="-1.8" y="-9.4" width="3.6" height="5" rx="1" fill={shirt} />
      <g className="kwt-legs"><rect x="-1.5" y="-4.6" width="1.2" height="4.6" fill={pants} /><rect x="0.3" y="-4.6" width="1.2" height="4.6" fill={pants} /></g>
    </g>
  );
}

// [loại, làn, thời gian chạy (s), delay âm (s), màu]
const FLOW = [
  ['car', 'r', 16, -2, 0], ['moto', 'r', 12, -5, 2], ['bus', 'r', 26, -14, 0], ['moto', 'r', 13, -9, 4], ['car', 'r', 17, -11, 3],
  ['car', 'l', 15, -4, 1], ['moto', 'l', 11, -1, 6], ['car', 'l', 18, -10, 5], ['moto', 'l', 12, -7, 3], ['moto', 'l', 14, -12, 0],
];
const PEOPLE = [
  ['r', 70, -10, '#ff8a6a', null], ['r', 84, -46, '#7ee8ff', '#ffd27a'], ['l', 76, -20, '#c6bfff', null],
  ['l', 92, -60, '#5ee0a0', null], ['r', 66, -33, '#ff9bd2', null], ['l', 80, -5, '#ffd27a', '#f2efe8'],
];

function Traffic({ night }) {
  return (
    <g className="kwt">
      {PEOPLE.map(([dir, dur, delay, shirt, hat], i) => (
        <g key={`p${i}`} className={`kwt-${dir === 'r' ? 'walk-r' : 'walk-l'}`} style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
          <g transform={`translate(0 ${B + 2.5}) ${dir === 'l' ? 'scale(-1 1)' : ''}`}>
            <Walker shirt={shirt} hat={hat} />
          </g>
        </g>
      ))}
      {FLOW.map(([kind, lane, dur, delay, ci], i) => {
        const y = lane === 'r' ? B + 15.5 : B + 7.5;
        const c = CAR_COLORS[ci % CAR_COLORS.length];
        const body = kind === 'bus' ? <Bus night={night} /> : kind === 'moto'
          ? <Moto c={c} shirt={CAR_COLORS[(ci + 3) % CAR_COLORS.length]} night={night} /> : <Car c={c} night={night} />;
        return (
          <g key={`v${i}`} className={`kwt-${lane === 'r' ? 'drive-r' : 'drive-l'}`} style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
            <g transform={`translate(0 ${y}) ${lane === 'l' ? 'scale(-1 1)' : ''}`}>{body}</g>
          </g>
        );
      })}
    </g>
  );
}

export default function Skyline({ phase = 'day', hero = 'sign', label = '', accent, className = '', style, traffic = true }) {
  const p = PHASES[phase] || PHASES.day;
  const id = `kws${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lo = 880; const hi = 1200; // chừa chỗ cho tòa nhà chính
  return (
    <svg viewBox="0 0 1280 200" preserveAspectRatio="xMidYMax slice" className={className} style={style} aria-hidden="true">
      <defs>
        <pattern id={`${id}w`} width="11" height="15" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="6" height="8" fill={p.win} /></pattern>
        <pattern id={`${id}s`} width="8" height="15" patternUnits="userSpaceOnUse" patternTransform="skewY(-29)"><rect x="2" y="3" width="4" height="8" fill={p.win} /></pattern>
        <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.ground} stopOpacity="0" /><stop offset="1" stopColor={p.ground} stopOpacity=".55" /></linearGradient>
      </defs>
      <g opacity=".85">{BACK.map(([x, w, h]) => <Box key={x} x={x} w={w} h={h} c={p.back} base={B - 26} />)}</g>
      <rect x="0" y="80" width="1280" height="110" fill={`url(#${id}h)`} />
      {MID.filter(([x]) => x < lo || x > hi).map(([x, w, h]) => <Box key={x} x={x} w={w} h={h} c={p.mid} base={B - 12} win={`${id}w`} op={p.wo * 0.5} />)}
      {FRONT.filter(([x]) => x < lo || x > hi).map(([x, w, h]) => <Box key={x} x={x} w={w} h={h} c={p.front} win={`${id}w`} swin={`${id}s`} op={p.wo} />)}
      <Hero kind={hero} p={p} id={id} label={label} accent={accent} />
      <polygon points={`0,${B} 1280,${B} 1280,200 0,200`} fill={p.ground} />
      <rect x="0" y={B} width="1280" height="2" fill="#ffffff" opacity=".08" />
      {Array.from({ length: 20 }, (_, i) => <rect key={i} x={i * 64 + 12} y={B + 8} width="30" height="2" fill="#ffffff" opacity=".18" />)}
      {traffic && <Traffic night={phase === 'night' || phase === 'dusk'} />}
    </svg>
  );
}
