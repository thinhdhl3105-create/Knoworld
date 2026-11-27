'use client';

// v64: các mảnh giao diện dùng chung giữa điện thoại (/creative) và màn chiếu (/creative/host).
import { builtinSvg } from './builtins';
import { publicUrl, parseQuizImage } from '@/lib/creative';

export const TILE_COLORS = ['#ff8a8a', '#7ee8ff', '#ffd27a', '#5ee0a0'];
export const TILE_NAMES = ['tam giác', 'thoi', 'tròn', 'vuông'];
const SHAPES = [
  <svg key="0" viewBox="0 0 20 20"><polygon points="10,2 19,18 1,18" fill="#13121b" /></svg>,
  <svg key="1" viewBox="0 0 20 20"><polygon points="10,1 19,10 10,19 1,10" fill="#13121b" /></svg>,
  <svg key="2" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" fill="#13121b" /></svg>,
  <svg key="3" viewBox="0 0 20 20"><rect x="2" y="2" width="16" height="16" rx="2" fill="#13121b" /></svg>,
];
export const Shape = ({ i }) => <span className="shp" aria-hidden="true">{SHAPES[i]}</span>;

export const initials = (n) => String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
export const Av = ({ name, color, size }) => (
  <span className="cc-av" style={{ background: color || '#c6bfff', ...(size ? { width: size, height: size } : null) }}>{initials(name)}</span>
);

// Ảnh câu hỏi: ảnh thật (Storage hoặc link ngoài) hoặc hình minh hoạ cắt sát.
// v67: ảnh thật phóng sát vào một chi tiết (đuôi #z=3&x=40&y=50 trong image_path); full = lộ toàn cảnh khi công bố đáp án.
export function QuizPhoto({ q, uid, full = false, children }) {
  const im = parseQuizImage(q?.image_path);
  const src = im ? (/^https?:\/\//.test(im.base) ? im.base : publicUrl(im.base)) : '';
  const zoom = !full && im && im.z > 1;
  return (
    <div className={`cc-photo${full ? ' is-full' : ''}`}>
      {src
        ? <img src={src} alt="Ảnh câu hỏi" referrerPolicy="no-referrer" draggable={false}
            style={zoom ? { transform: `scale(${im.z})`, transformOrigin: `${im.x}% ${im.y}%` } : undefined} />
        : <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: builtinSvg(q?.builtin, uid, full) }} />}
      {children}
    </div>
  );
}

export function Ring({ left, total }) {
  const p = total > 0 ? Math.max(0, Math.min(1, 1 - left / total)) : 1;
  return (
    <svg className="cc-ring" viewBox="0 0 46 46" aria-label={`Còn ${Math.ceil(left)} giây`}>
      <circle cx="23" cy="23" r="20" stroke="rgba(19,17,28,.75)" fill="rgba(19,17,28,.75)" />
      <circle cx="23" cy="23" r="20" stroke={p > 0.75 ? '#ff8a8a' : '#ffd27a'} strokeDasharray="125.7" strokeDashoffset={(125.7 * p).toFixed(1)} transform="rotate(-90 23 23)" strokeLinecap="round" />
      <text x="23" y="28" textAnchor="middle">{Math.max(0, Math.ceil(left))}</text>
    </svg>
  );
}

export function Board({ rows, meName }) {
  if (!rows?.length) return <div className="cc-empty">Chưa có ai ghi điểm.</div>;
  return (
    <div className="cc-board">
      {rows.map((r, i) => (
        <div key={`${r.name}-${i}`} className={meName && r.name === meName ? 'me' : ''}>
          <span className="r">{i + 1}</span><Av name={r.name} color={r.color} /><span>{r.name}</span><span className="s">{r.score}</span>
        </div>
      ))}
    </div>
  );
}

const WC = ['#ffd27a', '#ff8fb1', '#7ee8ff', '#c6bfff', '#5ee0a0', '#ece9f5', '#ffb876'];
export function Cloud({ words, big = false, highlight }) {
  const list = words || [];
  if (!list.length) return <div className={`cc-cloud${big ? ' big' : ''}`}><span className="cc-hint" style={{ fontFamily: 'Inter' }}>Chưa có từ nào. Hãy là người đầu tiên!</span></div>;
  const max = Math.max(...list.map((w) => w.n));
  const k = big ? 1.7 : 1;
  return (
    <div className={`cc-cloud${big ? ' big' : ''}`} aria-live="polite">
      {list.map((w, i) => (
        <span key={w.w} style={{ fontSize: `${(13 + (24 * w.n) / max) * k}px`, color: WC[i % WC.length], textShadow: w.w === highlight ? '0 0 16px currentColor' : undefined }}>{w.w}</span>
      ))}
    </div>
  );
}

export function Pin({ a, onOpen, onHeart, extra, fresh }) {
  return (
    <article className={`cc-pin${fresh ? ' new' : ''}`}>
      <button type="button" className="art" onClick={() => onOpen && onOpen(a)} aria-label={`Xem lớn ${a.title || 'tranh'}`}>
        <img src={publicUrl(a.image_path)} alt={a.title || 'Tranh của học sinh'} loading="lazy" />
      </button>
      {a.pending && <span className="cc-pending">Chờ duyệt</span>}
      <div className="meta">
        <b>{a.title || 'Chưa đặt tên'}</b>
        {a.caption && <span className="cap">{a.caption}</span>}
        <div className="foot">
          {a.brand ? <span className="cc-tag">{a.brand}</span> : <span />}
          {onHeart
            ? <button type="button" className={`cc-heart${a.liked ? ' on' : ''}`} onClick={() => onHeart(a)} disabled={a.pending} aria-pressed={!!a.liked}>{a.liked ? '♥' : '♡'} {a.hearts}</button>
            : <span className="cc-heart">♥ {a.hearts}</span>}
        </div>
        <span className="cc-hint">bởi {a.author}</span>
        {extra}
      </div>
    </article>
  );
}

export function Skyline() {
  return (
    <svg className="cc-skyline" viewBox="0 0 1280 260" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="ccb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2440" /><stop offset="1" stopColor="#17142a" /></linearGradient>
        <linearGradient id="ccb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#221d36" /><stop offset="1" stopColor="#131124" /></linearGradient>
        <radialGradient id="cclens" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#7ee8ff" stopOpacity=".9" /><stop offset=".55" stopColor="#3a5bd0" stopOpacity=".6" /><stop offset="1" stopColor="#1b1540" /></radialGradient>
        <filter id="ccglow"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      <g fill="url(#ccb2)"><rect x="20" y="120" width="70" height="140" /><rect x="230" y="100" width="60" height="160" /><rect x="520" y="130" width="80" height="130" /><rect x="760" y="90" width="60" height="170" /><rect x="1010" y="110" width="70" height="150" /><rect x="1190" y="130" width="80" height="130" /></g>
      <rect x="120" y="70" width="70" height="190" fill="url(#ccb)" />
      <circle cx="155" cy="60" r="38" fill="#1b1540" stroke="#4b4370" strokeWidth="3" /><circle cx="155" cy="60" r="28" fill="url(#cclens)" /><circle cx="155" cy="60" r="16" fill="none" stroke="#7ee8ff" strokeOpacity=".7" /><circle cx="146" cy="51" r="5" fill="#fff" opacity=".7" />
      <path d="M320 260 L370 70 L420 260 Z" fill="url(#ccb)" />
      <rect x="336" y="110" width="68" height="84" rx="3" fill="#ff8fb1" opacity=".18" stroke="#ff8fb1" strokeWidth="2" />
      <path d="M346 176 q12-30 24-12 t24-18" stroke="#ff8fb1" strokeWidth="2.5" fill="none" filter="url(#ccglow)" /><path d="M346 176 q12-30 24-12 t24-18" stroke="#ffd9e5" strokeWidth="1.5" fill="none" />
      <rect x="440" y="150" width="200" height="110" fill="url(#ccb)" />
      <rect x="462" y="120" width="156" height="30" rx="6" fill="#0e0d16" stroke="#ffd27a" strokeWidth="1.5" />
      <text x="540" y="141" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15" letterSpacing="3" fill="#ffd27a" filter="url(#ccglow)">CREATIVE CITY</text>
      <text x="540" y="141" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="15" letterSpacing="3" fill="#ffe8b0">CREATIVE CITY</text>
      <g fill="#ffd27a" opacity=".85"><rect x="462" y="172" width="34" height="44" rx="2" /><rect x="510" y="172" width="34" height="44" rx="2" opacity=".35" /><rect x="558" y="172" width="34" height="44" rx="2" /><rect x="606" y="172" width="20" height="44" rx="2" opacity=".35" /></g>
      <rect x="660" y="120" width="110" height="140" fill="url(#ccb)" /><rect x="672" y="100" width="34" height="20" fill="url(#ccb)" />
      <circle cx="715" cy="168" r="30" fill="#0e0d16" stroke="#c6bfff" strokeWidth="2" /><circle cx="715" cy="168" r="18" fill="#2b2050" stroke="#8d7fff" strokeWidth="2" /><circle cx="709" cy="162" r="5" fill="#c6bfff" opacity=".8" />
      <rect x="840" y="40" width="80" height="220" fill="url(#ccb)" />
      <g fill="#ffd27a"><rect x="852" y="60" width="12" height="16" opacity=".8" /><rect x="872" y="60" width="12" height="16" opacity=".3" /><rect x="892" y="60" width="12" height="16" opacity=".8" /><rect x="852" y="92" width="12" height="16" opacity=".3" /><rect x="872" y="92" width="12" height="16" opacity=".8" /><rect x="892" y="92" width="12" height="16" opacity=".8" /><rect x="852" y="124" width="12" height="16" opacity=".8" /><rect x="872" y="156" width="12" height="16" opacity=".8" /></g>
      <rect x="826" y="30" width="108" height="10" fill="#5ee0a0" opacity=".7" filter="url(#ccglow)" />
      <path d="M940 260 V190 a70 70 0 0 1 140 0 V260 Z" fill="url(#ccb)" />
      <g filter="url(#ccglow)"><circle cx="985" cy="180" r="7" fill="#ff8fb1" /><circle cx="1010" cy="165" r="7" fill="#ffd27a" /><circle cx="1037" cy="172" r="7" fill="#7ee8ff" /><circle cx="1050" cy="196" r="7" fill="#5ee0a0" /></g>
      <rect x="1100" y="150" width="80" height="110" fill="url(#ccb)" />
      <rect x="0" y="252" width="1280" height="8" fill="#0e0d16" />
    </svg>
  );
}
