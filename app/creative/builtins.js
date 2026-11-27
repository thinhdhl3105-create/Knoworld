// v64: Ảnh minh hoạ có sẵn cho Phòng Ảnh Lạ (dùng khi câu hỏi chưa có ảnh chụp thật).
// Mỗi hình vẽ trong khung 200×200; crop = [x, y, cạnh] là vùng cắt SÁT để câu đố khó hơn.
const BG = '<defs><radialGradient id="studio" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#f3f1f8"/><stop offset="1" stop-color="#bdb8cc"/></radialGradient><filter id="sh"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="200" height="200" fill="url(#studio)"/>';

const range = (n) => Array.from({ length: n }, (_, i) => i);

const ART = {
  apple: {
    crop: [80, 40, 40],
    svg: `${BG}<defs><radialGradient id="ap" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#ff6b5e"/><stop offset=".55" stop-color="#d4202a"/><stop offset="1" stop-color="#7a0d16"/></radialGradient><linearGradient id="lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9bd65a"/><stop offset="1" stop-color="#3c8a2e"/></linearGradient></defs><ellipse cx="100" cy="176" rx="58" ry="7" fill="#000" opacity=".22" filter="url(#sh)"/><path d="M100 60 C60 38 22 76 34 120 C44 164 80 182 100 168 C120 182 156 164 166 120 C178 76 140 38 100 60 Z" fill="url(#ap)"/><path d="M86 58 q14 10 28 0" stroke="#5a0a12" stroke-width="3" fill="none" opacity=".6"/><ellipse cx="68" cy="92" rx="12" ry="20" fill="#fff" opacity=".28" transform="rotate(-20 68 92)"/>${range(28).map((i) => `<circle cx="${40 + (i * 37) % 120}" cy="${50 + (i * 23) % 110}" r=".9" fill="#ffd9a0" opacity=".6"/>`).join('')}<path d="M100 62 q2-18 9-28" stroke="#5b3a1e" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M108 40 q22-14 36 2 q-20 12-36-2Z" fill="url(#lf)"/><path d="M108 40 q18-4 34 2" stroke="#2c6b22" stroke-width="1" fill="none"/>`,
  },
  pencil: {
    crop: [3, 91, 18],
    svg: `${BG}<defs><linearGradient id="pb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#f2b632"/><stop offset="1" stop-color="#c98a10"/></linearGradient><linearGradient id="pw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9c99c"/><stop offset="1" stop-color="#f6dfba"/></linearGradient></defs><ellipse cx="96" cy="122" rx="86" ry="6" fill="#000" opacity=".18" filter="url(#sh)"/><rect x="30" y="88" width="118" height="24" fill="url(#pb)"/><rect x="146" y="87" width="10" height="26" fill="#b9b6c4"/><rect x="156" y="87" width="20" height="26" rx="4" fill="#ef8aa5"/><polygon points="30,88 30,112 8,100" fill="url(#pw)"/><path d="M14 97 L30 92 M14 103 L30 108" stroke="#d4ae7c" stroke-width=".6"/><polygon points="14,96.6 14,103.4 8,100" fill="#2a2830"/>`,
  },
  pearl: {
    crop: [80, 152, 24],
    svg: `${BG}<defs><linearGradient id="tea" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a27a"/><stop offset=".45" stop-color="#e7cba6"/><stop offset="1" stop-color="#b88d63"/></linearGradient></defs><rect x="113" y="8" width="8" height="74" rx="2" fill="#e85d7a" transform="rotate(12 116 44)"/><path d="M58 46 L142 46 L128 182 L72 182 Z" fill="url(#tea)"/>${range(24).map((i) => { const x = 77 + (i % 8) * 6.4 + (Math.floor(i / 8) % 2) * 3; const y = 177 - Math.floor(i / 8) * 6.5; return `<circle cx="${x}" cy="${y}" r="3.4" fill="#2b1d16"/><circle cx="${x - 1}" cy="${y - 1.2}" r=".9" fill="#fff" opacity=".45"/>`; }).join('')}<ellipse cx="100" cy="46" rx="44" ry="7" fill="#f4f2f8" stroke="#cfcbdc"/>`,
  },
  keyboard: {
    crop: [36, 80, 22],
    svg: `${BG}<rect x="16" y="56" width="168" height="88" rx="9" fill="#2b2a31"/>${(() => { let o = ''; ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach((r, ri) => [...r].forEach((ch, ci) => { const x = 24 + ci * 15.6 + ri * 5; const y = 64 + ri * 19; o += `<rect x="${x}" y="${y}" width="13" height="15" rx="2.5" fill="#3d3c45"/><text x="${x + 6.5}" y="${y + 11}" font-size="7.5" text-anchor="middle" font-family="Inter,sans-serif" fill="#e9e7f0">${ch}</text>`; })); return `${o}<rect x="54" y="122" width="92" height="14" rx="2.5" fill="#3d3c45"/>`; })()}`,
  },
  orange: {
    crop: [90, 38, 22],
    svg: `${BG}<defs><radialGradient id="pulp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#f39a1f"/></radialGradient></defs><circle cx="100" cy="100" r="80" fill="#e8820f"/><circle cx="100" cy="100" r="71" fill="#fff3dc"/><circle cx="100" cy="100" r="66" fill="url(#pulp)"/>${range(10).map((i) => { const a = (i * Math.PI) / 5; return `<line x1="100" y1="100" x2="${(100 + 66 * Math.cos(a)).toFixed(1)}" y2="${(100 + 66 * Math.sin(a)).toFixed(1)}" stroke="#fff3dc" stroke-width="2.5"/>`; }).join('')}${range(40).map((i) => `<ellipse cx="${(100 + (20 + (i * 7) % 44) * Math.cos(i)).toFixed(1)}" cy="${(100 + (20 + (i * 7) % 44) * Math.sin(i)).toFixed(1)}" rx="2.2" ry="1" fill="#fff" opacity=".35" transform="rotate(${(i * 57) % 180} ${(100 + (20 + (i * 7) % 44) * Math.cos(i)).toFixed(1)} ${(100 + (20 + (i * 7) % 44) * Math.sin(i)).toFixed(1)})"/>`).join('')}<circle cx="100" cy="100" r="7" fill="#fff3dc"/>`,
  },
  pineapple: {
    crop: [72, 92, 40],
    svg: `${BG}<defs><radialGradient id="pa" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#e9b23a"/><stop offset="1" stop-color="#9a6410"/></radialGradient></defs><path d="M100 60 l-14-40 l14 22 l6-30 l4 32 l16-22 l-12 40Z" fill="#3c8a2e"/><ellipse cx="100" cy="120" rx="56" ry="70" fill="url(#pa)"/>${(() => { let o = ''; for (let r = 0; r < 9; r += 1) for (let c = 0; c < 8; c += 1) { const x = 58 + c * 12 + (r % 2) * 6; const y = 62 + r * 14; o += `<path d="M${x} ${y} l6 7 l-6 7 l-6 -7Z" fill="#c98a1e" stroke="#6b4a12" stroke-width="1"/><circle cx="${x}" cy="${y + 7}" r="1.6" fill="#4a3208"/><path d="M${x} ${y + 5} l1.5 -4" stroke="#7fae3a" stroke-width="1"/>`; } return o; })()}`,
  },
};

const uniq = (svg, p) => svg.replace(/id="([\w-]+)"/g, `id="$1-${p}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1-${p})`);
const vb = (a) => a.map((v) => v.toFixed(2)).join(' ');

// full = true -> cả hình (dùng khi lộ đáp án)
export function builtinSvg(key, uid, full = false) {
  const a = ART[key];
  if (!a) return '';
  const c = full ? [0, 0, 200] : a.crop;
  const h = c[2] * 0.75;
  return `<svg viewBox="${vb([c[0], c[1] + (c[2] - h) / 2, c[2], h])}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${uniq(a.svg, uid)}</svg>`;
}
export const BUILTIN_KEYS = Object.keys(ART);
