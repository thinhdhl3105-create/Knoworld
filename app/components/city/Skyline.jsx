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

export default function Skyline({ phase = 'day', hero = 'sign', label = '', accent, className = '', style }) {
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
    </svg>
  );
}
