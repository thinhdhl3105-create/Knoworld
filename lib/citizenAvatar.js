// ---------------------------------------------------------------------------
// v33: NHÂN VẬT CƯ DÂN — mỗi người đăng ký tự tạo 1 nhân vật nhỏ (kiểu đồ chơi vinyl).
// Toàn bộ nhân vật vẽ bằng SVG (chuỗi), không cần ảnh -> nhẹ, hiện được ở mọi kích thước.
// Lưu: localStorage (kw_avatar) + Supabase site_visitors.avatar qua RPC set_visitor_avatar.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

export const SKIN = [['Sáng', '#FCE6D8'], ['Hồng', '#F7D3BC'], ['Vàng ấm', '#EBC09A'], ['Bánh mật', '#CF9670'], ['Nâu', '#A46A48'], ['Nâu đậm', '#6F4532']];
export const HAIR = [['Đen', '#2B2530'], ['Nâu đen', '#4A3226'], ['Hạt dẻ', '#8A5434'], ['Caramel', '#C98B4E'], ['Vàng', '#EDCB7A'], ['Hồng', '#F2A7C3'], ['Tím', '#B9A3E8'], ['Bạc hà', '#9ED9C4'], ['Xanh trời', '#8EC2F0'], ['Bạc', '#DAD7E2'], ['Cam đỏ', '#D9603F']];
export const HAIRSTYLES = { m: [['short', 'Ngắn gọn'], ['messy', 'Bù xù'], ['side', 'Rẽ ngôi']], f: [['bob', 'Tóc bob'], ['buns', 'Búi đôi'], ['long', 'Tóc dài']] };
export const EXPR = [['smile', 'Cười'], ['wow', 'Ngơ ngác'], ['wink', 'Nháy mắt'], ['sleepy', 'Ngủ gật']];
export const GENDERS = [['f', 'Nữ'], ['m', 'Nam']];

export const DEFAULT_AVATAR = { v: 1, gender: 'f', hairstyle: 'bob', hair: '#2B2530', skin: '#F7D3BC', expr: 'smile', outfit: 'dino' };

/* ---------- helpers ---------- */
const shade = (hex, p) => {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round((t - r) * a + r); g = Math.round((t - g) * a + g); b = Math.round((t - b) * a + b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};
// Mọi mảng màu đặc thành gradient tròn (sáng góc trên-trái) -> nhìn như nhựa vinyl có khối.
let GR = null;
const grad = (c) => { if (!GR) return c; if (!GR.has(c)) GR.set(c, `g${GR.u}_${GR.size}`); return `url(#${GR.get(c)})`; };
const F = (c, w = 1.1) => `fill="${grad(c)}" stroke="${shade(c, -0.34)}" stroke-width="${w}" stroke-linejoin="round"`;
const gradDefs = () => [...GR].map(([c, id]) => `<radialGradient id="${id}" cx=".4" cy=".32" r=".78" fx=".3" fy=".2"><stop offset="0" stop-color="${shade(c, 0.5)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.28)}"/></radialGradient>`).join('');
const GLOSS = (x, y, rx, ry, rot, op = 0.55) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#fff" opacity="${op}" filter="url(#b${GR.u})"/>`;
const P = (cx, cy, r, deg) => { const a = (deg * Math.PI) / 180; return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; };
const spikes = (angles, r1, r2, hw, c) => angles.map((a) => {
  const b1 = P(60, 58, r1, a - hw), b2 = P(60, 58, r1, a + hw), t = P(60, 58, r2, a);
  return `<path d="M${b1} L${t} L${b2}Z" ${F(c)}/>`;
}).join('');
const INK = '#2A2230';
let UID = 0;

/* ---------- body ---------- */
const TORSO = 'M41 94 Q38 122 42 128 L78 128 Q82 122 79 94 Q60 86 41 94Z';
function body({ torso, sleeve, hand, pants, shoe, extra = '', clip }) {
  return `<rect x="46" y="122" width="10" height="14" rx="3" ${F(pants)}/><rect x="64" y="122" width="10" height="14" rx="3" ${F(pants)}/>
  <ellipse cx="50.5" cy="138" rx="7.5" ry="4.4" ${F(shoe)}/><ellipse cx="69.5" cy="138" rx="7.5" ry="4.4" ${F(shoe)}/>
  <path d="${TORSO}" ${F(torso)}/>
  <g clip-path="url(#${clip})">${extra}</g>
  <ellipse cx="37" cy="106" rx="6.5" ry="12" transform="rotate(22 37 106)" ${F(sleeve)}/>
  <ellipse cx="83" cy="106" rx="6.5" ry="12" transform="rotate(-22 83 106)" ${F(sleeve)}/>
  <circle cx="32.5" cy="117.5" r="4.6" ${F(hand)}/><circle cx="87.5" cy="117.5" r="4.6" ${F(hand)}/>`;
}

/* ---------- face ---------- */
function face(s) {
  const lash = s.gender === 'f';
  const open = (x) => `<ellipse cx="${x}" cy="68" rx="${s.expr === 'wow' ? 4.2 : 3.6}" ry="${s.expr === 'wow' ? 5 : 4.4}" fill="url(#e${GR.u})"/><circle cx="${x + 1.3}" cy="66.1" r="1.5" fill="#fff"/><circle cx="${x - 1.2}" cy="70.2" r=".75" fill="#fff" opacity=".85"/>`;
  const closed = (x, up) => `<path d="M${x - 4} 68 Q${x} ${up ? 64 : 71.5} ${x + 4} 68" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const lashes = (l, r) => (lash ? `${l ? `<path d="M46.8 65.6 L44.4 63.8" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` : ''}${r ? `<path d="M73.2 65.6 L75.6 63.8" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>` : ''}` : '');
  let eyes, mouth;
  switch (s.expr) {
    case 'wow': eyes = open(50) + open(70) + lashes(1, 1); mouth = '<ellipse cx="60" cy="78.5" rx="2.2" ry="2.6" fill="#B2475F"/>'; break;
    case 'wink': eyes = open(50) + closed(70, true) + lashes(1, 0); mouth = `<path d="M55.5 76 Q60 83 64.5 76Z" fill="#B2475F" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`; break;
    case 'sleepy': eyes = closed(50, false) + closed(70, false); mouth = `<path d="M58 78 Q60 79.5 62 78" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><text x="90" y="34" font-family="Space Grotesk,sans-serif" font-weight="700" font-size="11" fill="#c4b5fd">z</text><text x="97" y="24" font-family="Space Grotesk,sans-serif" font-weight="700" font-size="8" fill="#c4b5fd">z</text>`; break;
    default: eyes = open(50) + open(70) + lashes(1, 1); mouth = `<path d="M56 77 Q60 81 64 77" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  }
  return `<g filter="url(#b${GR.u})"><ellipse cx="43.5" cy="75" rx="5" ry="3" fill="#FF7F98" opacity=".55"/><ellipse cx="76.5" cy="75" rx="5" ry="3" fill="#FF7F98" opacity=".55"/></g>` + eyes + mouth;
}

/* ---------- hair ---------- */
const HAIR_BACK = {
  short: '<ellipse cx="60" cy="55" rx="34" ry="31"/>',
  messy: '<ellipse cx="60" cy="55" rx="34.5" ry="31.5"/>',
  side: '<ellipse cx="60" cy="55" rx="34" ry="31"/>',
  bob: '<path d="M25 62 C22 20 98 20 95 62 L96 92 Q88 97 82 91 L38 91 Q32 97 24 92Z"/>',
  buns: '<circle cx="31" cy="31" r="12"/><circle cx="89" cy="31" r="12"/><ellipse cx="60" cy="55" rx="34" ry="31"/>',
  long: '<path d="M25 60 C22 18 98 18 95 60 L98 118 Q92 127 84 121 L36 121 Q28 127 22 118Z"/>',
};
const HAIR_FRONT = {
  short: 'M27 62 C24 24 96 24 93 62 C90 52 84 46 76 48 C70 42 62 42 56 47 C50 43 40 44 36 50 C32 52 29 56 27 62Z',
  messy: 'M27 64 C22 26 98 26 93 64 L88 52 L82 58 L78 46 L70 54 L64 44 L58 54 L50 46 L46 56 L38 48 L34 58Z M57 30 Q60 16 70 21 Q63 23 64 31Z',
  side: 'M27 62 C24 24 96 24 93 62 C92 50 86 42 74 42 C60 42 50 49 40 46 C34 48 30 54 27 62Z',
  bob: 'M27 64 C24 22 96 22 93 64 C92 56 89 50 85 50 L35 50 C31 50 28 56 27 64Z',
  buns: 'M27 62 C24 22 96 22 93 62 C90 54 86 50 80 52 C74 46 66 48 62 52 C56 46 46 48 42 52 C36 50 30 54 27 62Z',
  long: 'M27 64 C24 22 96 22 93 64 C90 50 80 40 62 38 L60 44 L58 38 C40 40 30 50 27 64Z',
};
const BANGS = 'M30 56 C34 40 86 40 90 56 C84 50 78 50 74 54 C70 46 62 46 60 52 C56 46 48 46 46 54 C42 50 36 50 30 56Z';

/* ---------- outfits ---------- */
// kigu = đồ thú bông trùm đầu; behind = vẽ trước mũ (tai, vây), over = vẽ đè lên mũ.
const K = (id, name, main, belly, opt = {}) => ({ id, name, kind: 'kigu', main, belly, limb: opt.limb || main, feet: opt.feet || shade(main, -0.12), rim: opt.rim || shade(main, -0.18), ...opt });
export const OUTFITS = [
  K('dino', 'Khủng long', '#7CCB8A', '#EAF6C8', {
    tail: (o) => `<path d="M74 118 Q102 128 113 102 Q100 112 77 104Z" ${F(o.main)}/><path d="M92 113 L95 104 L99 111Z M102 108 L106 99 L108 106Z" ${F('#F6B04B', 1)}/>`,
    behind: () => spikes([-62, -31, 0, 31, 62], 37, 50, 11, '#F6B04B'),
  }),
  K('dolphin', 'Cá heo', '#7FB6E6', '#EAF4FC', {
    tail: (o) => `<path d="M76 118 Q92 122 98 112 L104 102 Q106 112 101 116 L112 118 Q104 124 96 121 Q88 130 76 128Z" ${F(o.main)}/>`,
    behind: (o) => `<path d="M52 23 Q63 0 79 4 Q70 11 71 25Z" ${F(o.main)}/>`,
  }),
  K('shark', 'Cá mập', '#8FA3BF', '#F2F4F8', {
    tail: (o) => `<path d="M76 118 Q92 120 100 111 L107 98 L105 113 L114 124 L100 120 Q90 130 76 128Z" ${F(o.main)}/>`,
    behind: (o) => `<path d="M50 23 L65 -3 L73 24Z" ${F(o.main)}/>`,
    over: (o) => {
      let t = '';
      const q = (d) => { const x = (d * Math.PI) / 180; return [60 + 26 * Math.sin(x), 65 - 23 * Math.cos(x)]; };
      for (let a = -60; a <= 60; a += 20) {
        const r = (a * Math.PI) / 180, tip = [60 + 20 * Math.sin(r), 65 - 17 * Math.cos(r)];
        t += `<path d="M${q(a - 8)} L${tip} L${q(a + 8)}Z" fill="#fff" stroke="${shade(o.main, -0.3)}" stroke-width=".9"/>`;
      }
      return t;
    },
  }),
  K('cat', 'Mèo mướp', '#F2B880', '#FFF1E2', {
    tail: (o) => `<path d="M78 124 Q101 126 99 108 Q97 96 105 91" stroke="${shade(o.main, -0.3)}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M78 124 Q101 126 99 108 Q97 96 105 91" stroke="${o.main}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,
    behind: (o) => `<path d="M26 40 L28 9 L51 22Z M94 40 L92 9 L69 22Z" ${F(o.main)}/><path d="M31 32 L32 16 L45 24Z M89 32 L88 16 L75 24Z" fill="#F7A9B8"/>`,
    over: (o) => `<path d="M54 22 L56 30 M60 21 L60 30 M66 22 L64 30" stroke="${shade(o.main, -0.25)}" stroke-width="2.2" stroke-linecap="round"/>`,
  }),
  K('bunny', 'Thỏ bông', '#F5F0F7', '#FFE3EC', {
    rim: '#E8C9D6',
    tail: () => `<circle cx="81" cy="124" r="6.5" ${F('#ffffff')}/>`,
    behind: (o) => `<ellipse cx="44" cy="2" rx="8.5" ry="23" transform="rotate(-14 44 2)" ${F(o.main)}/><ellipse cx="76" cy="2" rx="8.5" ry="23" transform="rotate(14 76 2)" ${F(o.main)}/><ellipse cx="44" cy="4" rx="4" ry="16" transform="rotate(-14 44 4)" fill="#F7B6C8"/><ellipse cx="76" cy="4" rx="4" ry="16" transform="rotate(14 76 4)" fill="#F7B6C8"/>`,
  }),
  K('bear', 'Gấu nâu', '#B98361', '#EBCFB2', {
    tail: (o) => `<circle cx="81" cy="124" r="6" ${F(o.main)}/>`,
    behind: (o) => `<circle cx="29" cy="29" r="11.5" ${F(o.main)}/><circle cx="91" cy="29" r="11.5" ${F(o.main)}/><circle cx="29" cy="29" r="6" fill="${o.belly}"/><circle cx="91" cy="29" r="6" fill="${o.belly}"/>`,
  }),
  K('panda', 'Gấu trúc', '#F7F6FA', '#F7F6FA', {
    limb: '#3A3445', feet: '#3A3445', rim: '#D9D6E2',
    behind: () => `<circle cx="29" cy="29" r="11.5" ${F('#3A3445')}/><circle cx="91" cy="29" r="11.5" ${F('#3A3445')}/>`,
  }),
  K('frog', 'Ếch xanh', '#9BD36B', '#F3F9D2', {
    over: (o) => [42, 78].map((x) => `<circle cx="${x}" cy="25" r="11.5" ${F(o.main)}/><circle cx="${x}" cy="25" r="7.8" fill="#fff"/><circle cx="${x + 1}" cy="26" r="3.8" fill="${INK}"/><circle cx="${x + 2}" cy="24.5" r="1.2" fill="#fff"/>`).join(''),
  }),
  K('chick', 'Gà con', '#FFE07A', '#FFF4C4', {
    feet: '#F4A23A',
    behind: (o) => `<path d="M55 22 Q55 8 61 12 Q63 4 69 9 Q64 14 66 22Z" ${F(o.main)}/>`,
    over: () => `<path d="M55 38 L65 38 L60 44Z" ${F('#F4A23A', 1)}/>`,
  }),
  K('penguin', 'Chim cánh cụt', '#3F4A68', '#F7F6FA', {
    feet: '#F4A23A', rim: '#F7F6FA',
    over: () => `<path d="M55 38 L65 38 L60 45Z" ${F('#F4A23A', 1)}/>`,
  }),
  K('fox', 'Cáo nhỏ', '#F08A4B', '#FFF1E4', {
    tail: (o) => `<path d="M76 120 Q104 132 110 104 Q112 92 104 86 Q106 108 76 111Z" ${F(o.main)}/><path d="M104 86 Q112 92 110 100 Q104 96 101 90Z" fill="#fff"/>`,
    behind: (o) => `<path d="M25 42 L25 4 L51 22Z M95 42 L95 4 L69 22Z" ${F(o.main)}/><path d="M30 33 L30 14 L44 24Z M90 33 L90 14 L76 24Z" fill="#fff"/>`,
  }),
  K('axolotl', 'Kỳ giông hồng', '#F7B3CC', '#FFE6EF', {
    tail: (o) => `<path d="M76 118 Q102 118 112 106 Q106 126 78 129Z" ${F(o.main)}/>`,
    behind: () => {
      let g = '';
      [-1, 1].forEach((sd) => [62, 88, 114].forEach((a) => {
        const [x, y] = P(60, 58, 44, sd * a);
        g += `<ellipse cx="${x}" cy="${y}" rx="10" ry="4.2" transform="rotate(${sd * a - 90} ${x} ${y})" ${F('#EE7FA6')}/>`;
      }));
      return g;
    },
  }),
  K('unicorn', 'Kỳ lân', '#F6F1FF', '#FFE9F4', {
    rim: '#E2D7F5',
    tail: () => ['#F7A8C8', '#C9B5F5', '#9FDCC8'].map((c, i) => `<path d="M78 ${120 + i * 2} Q${100 + i * 3} ${124 + i * 2} ${104 + i * 2} ${104 - i * 2}" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`).join(''),
    behind: (o) => [['#F7A8C8', -28], ['#C9B5F5', -48], ['#9FDCC8', -68], ['#FFD98A', -88]].map(([c, a]) => { const [x, y] = P(60, 58, 37, a); return `<circle cx="${x}" cy="${y}" r="9" ${F(c)}/>`; }).join('')
      + `<path d="M71 26 L84 12 L84 32Z" ${F(o.main)}/><path d="M54.5 24 L60 -5 L65.5 24Z" ${F('#FFD36B')}/><path d="M56 16 L64 14 M57 8 L63 6.5" stroke="#E0A93A" stroke-width="1.3"/>`,
  }),
  K('bee', 'Ong mật', '#FFD45C', '#FFD45C', {
    torsoExtra: () => '<rect x="30" y="102" width="60" height="6" fill="#3A3445"/><rect x="30" y="114" width="60" height="6" fill="#3A3445"/>',
    tail: () => '<ellipse cx="38" cy="96" rx="11" ry="7" transform="rotate(-35 38 96)" fill="#E3F4FF" stroke="#A8C8E0" stroke-width="1.2" opacity=".95"/><ellipse cx="82" cy="96" rx="11" ry="7" transform="rotate(35 82 96)" fill="#E3F4FF" stroke="#A8C8E0" stroke-width="1.2" opacity=".95"/>',
    behind: () => '<path d="M49 24 L40 4 M71 24 L80 4" stroke="#3A3445" stroke-width="2.6" stroke-linecap="round"/><circle cx="40" cy="4" r="4.2" fill="#3A3445"/><circle cx="80" cy="4" r="4.2" fill="#3A3445"/>',
  }),
  K('strawberry', 'Dâu tây', '#F2667A', '#FFD7DD', {
    feet: '#7CC47F',
    over: () => [[38, 34], [50, 26], [64, 24], [78, 30], [30, 52], [90, 52], [86, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2" fill="#FFE68A"/>`).join('')
      + [-46, -23, 0, 23, 46].map((a) => { const [x, y] = P(60, 58, 35, a); return `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="10" transform="rotate(${a} ${x} ${y})" ${F('#7CC47F')}/>`; }).join('')
      + `<rect x="58" y="10" width="4" height="10" rx="2" ${F('#5FA864', 1)}/>`,
  }),
  K('mushroom', 'Nấm đỏ', '#E8564F', '#FFF3E6', {
    limb: '#FFF3E6', feet: '#C89B78',
    over: () => [[42, 32, 5.5], [66, 26, 6.5], [85, 40, 4.5], [30, 54, 3.8], [91, 62, 3.6], [54, 24, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join(''),
  }),
  K('raincoat', 'Áo mưa vàng', '#F6CF4A', '#F6CF4A', {
    feet: '#5A8FD8',
    torsoExtra: () => '<circle cx="60" cy="100" r="2" fill="#C99A1E"/><circle cx="60" cy="110" r="2" fill="#C99A1E"/><circle cx="60" cy="120" r="2" fill="#C99A1E"/>',
  }),
  // Đồ thường ngày (thấy tóc)
  { id: 'hoodie', name: 'Hoodie tím', kind: 'wear', torso: '#A99BE8', sleeve: '#A99BE8', pants: '#3D4A7A', shoe: '#F4F2F8',
    back: (o) => `<ellipse cx="60" cy="92" rx="22" ry="7" ${F(shade(o.torso, -0.1))}/>`,
    torsoExtra: (o) => `<path d="M54 96 L54 107 M66 96 L66 107" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/><path d="M48 112 L72 112 L70 124 L50 124Z" fill="${shade(o.torso, -0.08)}" stroke="${shade(o.torso, -0.3)}" stroke-width="1"/>` },
  { id: 'overalls', name: 'Quần yếm', kind: 'wear', torso: '#FBF7F0', sleeve: '#FBF7F0', pants: '#5B86C9', shoe: '#E8564F',
    torsoExtra: (o) => `<rect x="30" y="98" width="60" height="3.5" fill="#F2A7C3"/><rect x="30" y="106" width="60" height="3.5" fill="#F2A7C3"/><path d="M44 106 L76 106 L80 130 L40 130Z" fill="${o.pants}" stroke="${shade(o.pants, -0.3)}" stroke-width="1.2"/><path d="M45 106 L44 92 M75 106 L76 92" stroke="${o.pants}" stroke-width="4"/><circle cx="47" cy="108" r="1.8" fill="#FFD36B"/><circle cx="73" cy="108" r="1.8" fill="#FFD36B"/><rect x="54" y="112" width="12" height="7" rx="2" fill="${shade(o.pants, -0.1)}"/>` },
  { id: 'sailor', name: 'Thủy thủ', kind: 'wear', torso: '#FBFBFF', sleeve: '#FBFBFF', pants: '#34406E', shoe: '#2E2A3A',
    torsoExtra: (o, s) => `<path d="M40 92 L60 112 L80 92 L84 99 L60 120 L36 99Z" fill="#34406E"/><path d="M44 96 L60 112 L76 96" stroke="#fff" stroke-width="1.3" fill="none"/><path d="M60 110 L52 104 L52 116Z M60 110 L68 104 L68 116Z" fill="#E8564F"/><circle cx="60" cy="110" r="2.6" fill="#C8403B"/>${s.gender === 'f' ? '<path d="M40 120 L80 120 L86 132 L34 132Z" fill="#34406E"/>' : ''}` },
  { id: 'aodai', name: 'Áo dài', kind: 'wear', torso: '#D94A67', sleeve: '#D94A67', pants: '#FBFBFF', shoe: '#F2D27A',
    front: (o) => `<path d="M51 122 L50 148 L70 148 L69 122Z" ${F(o.torso)}/><path d="M53 132 Q60 128 67 132 M54 140 Q60 136 66 140" stroke="#F2D27A" stroke-width="1.1" fill="none"/>`,
    torsoExtra: (o) => `<rect x="54" y="88" width="12" height="7" rx="2" fill="${shade(o.torso, -0.12)}"/><path d="M60 94 Q72 96 76 104" stroke="#F2D27A" stroke-width="1.3" fill="none"/><circle cx="68" cy="108" r="3" fill="none" stroke="#F2D27A" stroke-width="1.1"/><circle cx="54" cy="116" r="2" fill="#F2D27A"/>` },
  { id: 'astro', name: 'Phi hành gia', kind: 'wear', torso: '#EEF0F6', sleeve: '#EEF0F6', pants: '#EEF0F6', shoe: '#8C93A8', hand: '#EEF0F6',
    back: () => `<rect x="36" y="92" width="48" height="30" rx="8" ${F('#B7BDCC')}/>`,
    torsoExtra: () => '<rect x="50" y="102" width="20" height="13" rx="3" fill="#C9CEDB"/><circle cx="55" cy="108.5" r="2.2" fill="#E8564F"/><circle cx="61" cy="108.5" r="2.2" fill="#5B86C9"/><circle cx="67" cy="108.5" r="2.2" fill="#F6CF4A"/>',
    top: () => '<circle cx="60" cy="60" r="41" fill="rgba(170,215,255,.16)" stroke="#E4E9F3" stroke-width="3.2"/><path d="M33 44 Q40 30 54 25" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".75"/>' },
];
const BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
export const outfitName = (id) => BY_ID[id]?.name || '';

/* ---------- chuẩn hoá dữ liệu (dữ liệu từ localStorage / server có thể sai) ---------- */
const COLOR = /^#[0-9a-fA-F]{6}$/;
export function normalizeAvatar(a) {
  if (!a || typeof a !== 'object') return null;
  const gender = a.gender === 'm' ? 'm' : 'f';
  const styles = HAIRSTYLES[gender].map(([k]) => k);
  return {
    v: 1,
    gender,
    hairstyle: styles.includes(a.hairstyle) ? a.hairstyle : styles[0],
    hair: COLOR.test(a.hair) ? a.hair : DEFAULT_AVATAR.hair,
    skin: COLOR.test(a.skin) ? a.skin : DEFAULT_AVATAR.skin,
    expr: EXPR.some(([k]) => k === a.expr) ? a.expr : 'smile',
    outfit: BY_ID[a.outfit] ? a.outfit : DEFAULT_AVATAR.outfit,
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function randomAvatar() {
  const gender = pick(['f', 'm']);
  return { v: 1, gender, hairstyle: pick(HAIRSTYLES[gender])[0], hair: pick(HAIR)[1], skin: pick(SKIN)[1], expr: pick(EXPR)[0], outfit: pick(OUTFITS).id };
}

/* ---------- render: trả về chuỗi <svg> ---------- */
export const VIEW_FULL = '-6 -28 132 182';
export const VIEW_BUST = '8 -12 104 126';

export function renderAvatarSvg(avatar, viewBox = VIEW_FULL) {
  const s = normalizeAvatar(avatar) || DEFAULT_AVATAR;
  const u = `a${++UID}`, o = BY_ID[s.outfit], skin = s.skin, hair = s.hair;
  GR = new Map(); GR.u = u;
  const headShadow = `<g clip-path="url(#t${u})"><ellipse cx="60" cy="93" rx="23" ry="7" fill="#1a1024" opacity=".32" filter="url(#b${u})"/></g>`;
  let g = '';
  if (o.kind === 'kigu') {
    g += o.tail ? o.tail(o, s) : '';
    g += body({ torso: o.main, sleeve: o.limb, hand: skin, pants: o.limb, shoe: o.feet, clip: `t${u}`,
      extra: (o.belly !== o.main ? `<ellipse cx="60" cy="113" rx="13" ry="14" fill="${o.belly}"/>` : '') + (o.torsoExtra ? o.torsoExtra(o, s) : '') });
    g += headShadow;
    g += o.behind ? o.behind(o, s) : '';
    g += `<circle cx="60" cy="58" r="38" ${F(o.main, 1.4)}/>`;
    g += `<ellipse cx="60" cy="65" rx="26" ry="23" ${F(skin, 0.6)}/>`;
    g += `<g clip-path="url(#f${u})"><path d="${BANGS}" transform="translate(0 -4)" ${F(hair, 1)}/><ellipse cx="60" cy="60" rx="28" ry="25" fill="none" stroke="#2a1830" stroke-opacity=".22" stroke-width="7" filter="url(#b${u})"/></g>`;
    g += face(s);
    g += `<ellipse cx="60" cy="65" rx="26" ry="23" fill="none" stroke="${o.rim}" stroke-width="3.8"/><ellipse cx="60" cy="65" rx="26" ry="23" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="38 200" transform="rotate(-150 60 65)"/>`;
    g += o.over ? o.over(o, s) : '';
    g += GLOSS(38, 34, 10, 5, -40) + GLOSS(46, 104, 4, 7, 20, 0.35);
  } else {
    g += `<g ${F(hair)}>${HAIR_BACK[s.hairstyle]}</g>`;
    g += o.back ? o.back(o, s) : '';
    g += body({ torso: o.torso, sleeve: o.sleeve, hand: o.hand || skin, pants: o.pants, shoe: o.shoe, clip: `t${u}`, extra: o.torsoExtra ? o.torsoExtra(o, s) : '' });
    g += o.front ? o.front(o, s) : '';
    g += headShadow;
    g += `<ellipse cx="29.5" cy="66" rx="5" ry="6" ${F(skin)}/><ellipse cx="90.5" cy="66" rx="5" ry="6" ${F(skin)}/>`;
    g += `<ellipse cx="60" cy="61" rx="31" ry="29" ${F(skin)}/>`;
    g += `<path d="${HAIR_FRONT[s.hairstyle]}" transform="translate(0 3)" fill="#2a1830" opacity=".22" filter="url(#b${u})"/>`;
    g += face(s);
    g += `<path d="${HAIR_FRONT[s.hairstyle]}" ${F(hair)}/>`;
    g += GLOSS(42, 33, 10, 4.5, -25, 0.5) + GLOSS(46, 104, 4, 7, 20, 0.3);
    g += o.top ? o.top(o, s) : '';
  }
  const defs = `<defs>${gradDefs()}<radialGradient id="e${u}" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#6b5585"/><stop offset=".55" stop-color="#2a2033"/><stop offset="1" stop-color="#140f1a"/></radialGradient>`
    + `<filter id="b${u}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>`
    + `<filter id="d${u}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.2" stdDeviation="1.8" flood-color="#000" flood-opacity=".4"/></filter>`
    + `<clipPath id="t${u}"><path d="${TORSO}"/></clipPath><clipPath id="f${u}"><ellipse cx="60" cy="65" rx="26" ry="23"/></clipPath></defs>`;
  GR = null;
  return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${o.name}">${defs}<g filter="url(#d${u})">${g}</g></svg>`;
}

/* ---------- lưu trữ ---------- */
const KEY_AVATAR = 'kw_avatar';
const hasWindow = () => typeof window !== 'undefined';

export function getSavedAvatar() {
  if (!hasWindow()) return null;
  try { return normalizeAvatar(JSON.parse(localStorage.getItem(KEY_AVATAR) || 'null')); } catch { return null; }
}

// Lưu cục bộ + gửi lên Supabase (RPC theo anon_id, giống record_visit).
// Nếu chưa chạy migration v32 thì vẫn lưu cục bộ, không chặn người dùng.
export async function saveAvatar(avatar) {
  const clean = normalizeAvatar(avatar);
  if (!clean) return { ok: false };
  if (hasWindow()) {
    try { localStorage.setItem(KEY_AVATAR, JSON.stringify(clean)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('kw-avatar-changed', { detail: clean }));
  }
  if (!isSupabaseConfigured) return { ok: true, source: 'local' };
  try {
    const { error } = await supabase.rpc('set_visitor_avatar', { p_anon_id: getAnonId(), p_avatar: clean });
    if (error) return { ok: true, source: 'local', warning: error.message };
  } catch (e) {
    return { ok: true, source: 'local', warning: String(e) };
  }
  return { ok: true, source: 'supabase' };
}
