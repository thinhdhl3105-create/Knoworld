// ---------------------------------------------------------------------------
// v40: KNOWORLD MUSEUM — game pixel đi tham quan bảo tàng (kiểu RPG nhìn từ trên xuống, giống Temple).
//   • Ngoài đảo: Cầu Ký Ức về Main City (dưới), cầu sang Temple Isle (phải), đài phun nước, đèn đá.
//   • Trong bảo tàng: Sảnh Chính · Phòng Lớp Học · Phòng Sự Kiện · Sảnh Thành Tích · Phòng Ống Kính · Phòng Riêng.
//   • Ảnh thật lấy từ Supabase (museum_photos), tự treo vào khung trống kế tiếp của phòng;
//     phòng chưa có ảnh nào thì hiện ảnh minh họa. Ảnh vượt số khung -> xem trong Album của phòng.
//   • Phòng Riêng: nhập đúng mật khẩu (RPC museum_love_photos) mới mở cửa và tải ảnh.
//   • Điểm khám phá, trò chơi "Tìm 10 em vịt" (mỗi ngày vịt trốn chỗ mới), khách tham quan ra vào,
//     nhiều người chơi thấy nhau (Supabase Realtime kênh 'kw-museum'), Sổ lưu bút, bảng xếp hạng.
// mountMuseum(root, opts) -> cleanup()
//   opts: load/save/flush (điểm khám phá), me(), online(handlers), isAdmin(), photos(), unlockLove(pass),
//         guestbook: { load(), sign(name, msg) }, leaderboard(), onExit('city'|'temple'), adminHref(room), from
// ---------------------------------------------------------------------------
import { MUSEUM_ROOMS } from './museum';

/* =====================================================================
   NỘI DUNG — sửa thoải mái phần này
   ===================================================================== */
export const LOVE_SINCE = '2021-02-14'; // ngày bắt đầu yêu nhau (trái tim trong Phòng Riêng đếm ngày)

const ROOMS = {
  lobby: { name: 'Sảnh Chính', sub: 'Quầy hướng dẫn · Sổ lưu bút · Bảng xếp hạng', color: '#7ee8ff' },
  ...Object.fromEntries(MUSEUM_ROOMS.map((r) => [r.id, r])),
};

// Ảnh minh họa — chỉ hiện khi phòng CHƯA có ảnh thật nào.
const SAMPLES = {
  lobby: [
    { id: 'about', art: 'about', title: 'Về chủ bảo tàng', taken: 'Giảng viên Marketing – Truyền thông', place: 'Hoa Sen University',
      caption: 'Xin chào, mình là Thịnh. Bảo tàng nhỏ này lưu lại những lớp học, những chương trình làm cùng sinh viên, vài cột mốc của bản thân — và những bức ảnh mình chụp trên đường đi.' },
  ],
  class: [
    { id: 'c1', art: 'class', title: 'Lớp E-Business', taken: 'Ảnh minh họa', place: 'Hoa Sen University', caption: 'Phòng này đang chờ ảnh thật. Ảnh các lớp học sẽ được treo ở đây.' },
    { id: 'c2', art: 'class', title: 'Social Marketing — thuyết trình nhóm', taken: 'Ảnh minh họa', place: 'Hoa Sen University', caption: 'Ảnh minh họa.' },
    { id: 'c3', art: 'group', title: 'Ảnh cả lớp ngày cuối môn', taken: 'Ảnh minh họa', place: 'Hoa Sen University', caption: 'Ảnh minh họa.' },
  ],
  event: [
    { id: 'e1', art: 'stage', title: 'EYEKONIC — đêm chung kết', taken: 'Ảnh minh họa', place: 'HSU', caption: 'Phòng này đang chờ ảnh thật các chương trình cùng sinh viên.' },
    { id: 'e2', art: 'group', title: 'Chuyến tham quan doanh nghiệp', taken: 'Ảnh minh họa', place: 'TP. Hồ Chí Minh', caption: 'Ảnh minh họa.' },
    { id: 'e3', art: 'stage', title: 'Workshop cùng doanh nghiệp', taken: 'Ảnh minh họa', place: 'HSU', caption: 'Ảnh minh họa.' },
  ],
  award: [
    { id: 'a1', art: 'trophy', tag: 'Thành tích', title: 'Cột mốc lớn nhất', taken: 'Ảnh minh họa', place: '', caption: 'Sảnh này đang chờ ảnh thật: giấy khen, chứng nhận, khoảnh khắc nhận giải…' },
    { id: 'a2', art: 'cert', tag: 'Chứng nhận', title: 'Giấy khen', taken: 'Ảnh minh họa', place: '', caption: 'Ảnh minh họa.' },
    { id: 'a3', art: 'trophy', tag: 'Thành tích', title: 'Thành tích', taken: 'Ảnh minh họa', place: '', caption: 'Ảnh minh họa.' },
  ],
  lens: [
    { id: 'l1', art: 'sunset', title: 'Hoàng hôn trên sông', taken: 'Ảnh minh họa', place: '', caption: 'Phòng này đang chờ những bức ảnh tự chụp.' },
    { id: 'l2', art: 'oldtown', title: 'Phố đèn lồng', taken: 'Ảnh minh họa', place: '', caption: 'Ảnh minh họa.' },
    { id: 'l3', art: 'sea', title: 'Biển buổi sáng', taken: 'Ảnh minh họa', place: '', caption: 'Ảnh minh họa.' },
  ],
  love: [
    { id: 'v1', art: 'love', title: 'Ngày đầu gặp nhau', taken: 'Ảnh minh họa', place: '', caption: 'Phòng Riêng đang chờ ảnh của hai người.' },
    { id: 'v2', art: 'love', title: 'Ngày mình thương nhau', taken: 'Ảnh minh họa', place: '', caption: 'Ảnh minh họa.' },
  ],
};

export const PHRASES = ['Chào cả nhà! 👋', 'Ảnh này đẹp quá 😍', 'Ra đây xem nè!', 'Tìm được vịt chưa? 🦆', 'Có vịt ở gần đây!', 'Haha 😄', 'Cảm ơn nha!', 'Hẹn gặp lại!'];
const NPC_LINES = {
  guard: ['Chào mừng đến Knoworld Museum! Mở cửa 24/7, vào cửa miễn phí.', 'Nghe nói hôm nay có 10 em vịt trốn quanh bảo tàng. Tìm được hết là có thưởng đó!', 'Đi hết Cầu Ký Ức là về Main City, còn cây cầu bên phải dẫn sang chùa.'],
  curator: [],
  visitor: ['Ảnh lớp mình có trong này nè!', 'Mình vừa thấy một em vịt đội nón lá chạy qua…', 'Phòng Ống Kính đẹp lắm, đi lên từ Phòng Sự Kiện đó.', 'Cánh cửa hồng kia khóa kỹ lắm, mình thử rồi.', 'Mình đang tìm xem có mặt mình trong tấm nào không.'],
};
const VISITOR_WHO = ['Khách tham quan', 'Cựu sinh viên', 'Sinh viên năm 2', 'Du khách', 'Phụ huynh', 'Bạn học'];

// Điểm khám phá
const PTS = { view: 10, room: 5, roomDone: 30, duck: 20, ducksAll: 100, guest: 15, curator: 5 };
const RANKS = [[0, 'Khách tham quan'], [100, 'Người tò mò'], [300, 'Nhà thám hiểm'], [600, 'Chuyên gia bảo tàng'], [1000, 'Huyền thoại Knoworld']];
const rankOf = (p) => { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (p >= n) r = name; return r; };
const nextRank = (p) => RANKS.find(([n]) => n > p) || null;

// 10 em vịt (thiết kế riêng cho Knoworld)
export const DUCKS = [
  { id: 'plain', name: 'Vịt Trắng' }, { id: 'nonla', name: 'Vịt Nón Lá' }, { id: 'grad', name: 'Vịt Tốt Nghiệp' },
  { id: 'rain', name: 'Vịt Áo Mưa' }, { id: 'chef', name: 'Vịt Đầu Bếp' }, { id: 'santa', name: 'Vịt Noel' },
  { id: 'cool', name: 'Vịt Kính Râm' }, { id: 'cam', name: 'Vịt Nhiếp Ảnh' }, { id: 'cape', name: 'Vịt Siêu Nhân' },
  { id: 'crown', name: 'Vịt Hoàng Gia' },
];

/* ===================================================================== */
const T = 16;
const KEY = 'kw_museum';
const vnNow = () => new Date(Date.now() + 7 * 3600e3);
const vnDay = () => vnNow().toISOString().slice(0, 10);
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const hashStr = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function normalizeState(s) {
  const base = { pts: 0, seen: {}, rooms: {}, done: {}, duckDay: '', ducks: [], duckEver: {}, gb: 0, cur: 0, intro: false, sound: true, ts: 0 };
  if (!s || typeof s !== 'object') return base;
  const n = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  return {
    ...base, pts: Math.min(99999, n(s.pts)), seen: obj(s.seen), rooms: obj(s.rooms), done: obj(s.done),
    duckDay: typeof s.duckDay === 'string' ? s.duckDay : '', ducks: Array.isArray(s.ducks) ? s.ducks.filter((d) => typeof d === 'string').slice(0, 10) : [],
    duckEver: obj(s.duckEver), gb: n(s.gb), cur: n(s.cur), intro: !!s.intro, sound: s.sound !== false, ts: n(s.ts),
  };
}

/* ---------- tiles ---------- */
const G = 0, FL = 1, TR = 2, SAND = 3, STONE = 4, WATER = 5, PLANK = 6, RAIL = 7, SOLID = 8, DOOR = 9, WOOD = 10, MARBLE = 11, CARPET = 12, PINK = 13, WALLI = 14;
const isSolid = (c) => c === TR || c === WATER || c === RAIL || c === SOLID || c === WALLI;

function newMap(id, W, H, fillT) {
  return { id, W, H, tile: Array.from({ length: H }, () => Array(W).fill(fillT)), base: Array.from({ length: H }, () => Array(W).fill(fillT)),
    obj: Array.from({ length: H }, () => Array(W).fill(null)), labels: [], glows: [] };
}
function fillM(m, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { m.tile[y][x] = c; m.base[y][x] = c; } }
function placeM(m, id, x0, y0, w, h) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (m.tile[y][x] !== SOLID) m.base[y][x] = m.tile[y][x]; m.tile[y][x] = SOLID; m.obj[y][x] = id; } }

/* ---------- OUTSIDE: Museum Isle (36×28) ---------- */
const OUT_EXIT_S = [[15, 27], [16, 27]], OUT_EXIT_E = [[35, 10], [35, 11]], OUT_DOOR = [[15, 8], [16, 8]];
function buildOutMap() {
  const m = newMap('out', 36, 28, WATER);
  for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const d = ((x + 0.5 - 16) / 14) ** 2 + ((y + 0.5 - 10.2) / 9.6) ** 2;
    if (d <= 1) { const c = d > 0.8 ? SAND : (hash(x, y, 3) < 0.1 ? FL : G); m.tile[y][x] = c; m.base[y][x] = c; }
    if (d > 0.5 && d <= 0.8 && hash(x, y, 9) < 0.34) { m.tile[y][x] = TR; m.base[y][x] = G; }
  }
  placeM(m, 'museum', 9, 1, 14, 8);
  for (const [x, y] of OUT_DOOR) { m.tile[y][x] = DOOR; m.base[y][x] = DOOR; m.obj[y][x] = null; }
  fillM(m, 9, 9, 22, 11, STONE); fillM(m, 15, 12, 16, 18, STONE); fillM(m, 23, 10, 28, 11, STONE);
  fillM(m, 15, 19, 16, 27, PLANK); fillM(m, 29, 10, 35, 11, PLANK);
  for (let y = 20; y <= 27; y++) for (const x of [14, 17]) { m.tile[y][x] = RAIL; m.base[y][x] = RAIL; }
  for (let x = 30; x <= 35; x++) for (const y of [9, 12]) { m.tile[y][x] = RAIL; m.base[y][x] = RAIL; }
  for (let y = 12; y <= 18; y++) for (const x of [13, 14, 17, 18]) if (m.tile[y][x] === TR) { m.tile[y][x] = G; m.base[y][x] = G; }
  for (let x = 23; x <= 29; x++) for (const y of [9, 12]) if (m.tile[y][x] === TR) { m.tile[y][x] = G; m.base[y][x] = G; }
  for (const [x, y] of [[13, 14], [18, 15], [18, 16], [12, 16], [19, 13]]) if (!isSolid(m.tile[y][x])) { m.tile[y][x] = FL; m.base[y][x] = FL; }
  placeM(m, 'fountain', 10, 13, 2, 2);
  placeM(m, 'sign', 19, 14, 1, 1);
  placeM(m, 'duckboard', 13, 15, 1, 1);
  for (const [x, y] of [[14, 13], [17, 13], [14, 17], [17, 17]]) placeM(m, 'lamp', x, y, 1, 1);
  placeM(m, 'bench', 11, 11, 2, 1);
  m.labels = [{ t: 'Knoworld Museum', x: 16 * T, y: 1 * T - 4 }, { t: 'Cầu Ký Ức', x: 16 * T, y: 23 * T }, { t: 'Về Main City ↓', x: 16 * T, y: 27 * T + 6 },
    { t: 'Sang Temple Isle →', x: 32.5 * T, y: 8 * T + 6 }];
  m.glows = [[15 * T + 6, 6 * T + 8, 30], [14 * T + 8, 13 * T - 10, 22], [17 * T + 8, 13 * T - 10, 22], [14 * T + 8, 17 * T - 10, 22], [17 * T + 8, 17 * T - 10, 22], [9 * T + 60, 1 * T + 70, 14], [9 * T + 164, 1 * T + 70, 14]];
  m.areas = [{ id: 'isle', x0: 0, y0: 0, x1: 35, y1: 27 }];
  return m;
}

/* ---------- INSIDE: the museum (36×33) ---------- */
const F = (x, y) => ({ k: 'frame', x, y, w: 2 }), P = (x, y) => ({ k: 'panel', x, y, w: 2 }), D = (x, y, w = 1) => ({ k: 'ped', x, y, w });
const SLOTS = {
  lobby: [F(13, 20)],
  love: [F(2, 1), F(5, 1), F(8, 1), P(2, 5), P(8, 5), P(2, 8), P(8, 8)],
  award: [D(17, 5, 2), F(13, 1), F(20, 1), D(14, 6), D(21, 6), D(14, 10), D(21, 10), D(14, 14), D(21, 14)],
  lens: [F(26, 1), F(29, 1), F(32, 1), P(26, 5), P(31, 5), P(26, 8), P(31, 8)],
  class: [F(2, 12), F(8, 12), P(2, 16), P(7, 16), P(2, 19), P(7, 19), P(2, 22), P(7, 22), P(2, 25), P(7, 25)],
  event: [F(26, 12), F(32, 12), P(26, 16), P(31, 16), P(26, 19), P(31, 19), P(26, 22), P(31, 22), P(26, 25), P(31, 25)],
};
const ALBUMS = { love: [10, 2], award: [23, 2], lens: [25, 2], class: [10, 29], event: [25, 29] };
const RECTS = [['love', 1, 2, 10, 10], ['award', 12, 2, 23, 18], ['lens', 25, 2, 34, 10], ['class', 1, 13, 10, 31], ['event', 25, 13, 34, 31], ['lobby', 12, 21, 23, 31]];
const IN_DOOR = [[17, 32], [18, 32]];
const LOVE_DOOR = [[5, 11], [6, 11], [5, 12], [6, 12]];
const inLoveZone = (x, y) => (x >= 1 && x <= 10 && y >= 1 && y <= 10) || LOVE_DOOR.some(([a, b]) => a === x && b === y);
function buildInMap(items, loveOpen) {
  const m = newMap('in', 36, 33, WALLI);
  fillM(m, 1, 2, 10, 10, PINK);
  fillM(m, 12, 2, 23, 18, MARBLE); fillM(m, 17, 2, 18, 20, CARPET);
  fillM(m, 25, 2, 34, 10, WOOD);
  fillM(m, 1, 13, 10, 31, WOOD); fillM(m, 25, 13, 34, 31, WOOD);
  fillM(m, 12, 21, 23, 31, MARBLE); fillM(m, 17, 21, 18, 31, CARPET);
  fillM(m, 11, 26, 11, 27, WOOD); fillM(m, 24, 26, 24, 27, WOOD); fillM(m, 29, 11, 30, 12, WOOD);
  for (const [x, y] of IN_DOOR) { m.tile[y][x] = DOOR; m.base[y][x] = DOOR; }
  for (let i = 16; i <= 19; i++) { m.obj[0][i] = 'banner'; m.obj[1][i] = 'banner'; }
  if (loveOpen) for (const [x, y] of LOVE_DOOR) { m.tile[y][x] = PINK; m.base[y][x] = PINK; }
  else for (const [x, y] of LOVE_DOOR) m.obj[y][x] = 'heart';
  m.slots = [];
  for (const room of Object.keys(SLOTS)) {
    const list = items[room] || [];
    SLOTS[room].forEach((sl, i) => {
      if (!list[i]) return;
      const id = `s:${room}:${i}`;
      m.slots.push({ ...sl, room, i, id });
      if (sl.k === 'frame') { for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) m.obj[sl.y - 1 + j][sl.x + k] = id; }
      else placeM(m, id, sl.x, sl.y, sl.w, 1);
    });
  }
  m.obj[19][21] = m.obj[19][22] = m.obj[20][21] = m.obj[20][22] = 'map';
  for (const [room, [x, y]] of Object.entries(ALBUMS)) if (room !== 'love' || loveOpen) placeM(m, `album:${room}`, x, y, 1, 1);
  placeM(m, 'lovec', 5, 6, 2, 1);
  placeM(m, 'cam', 34, 9, 1, 1);
  placeM(m, 'desk', 13, 23, 3, 1);
  placeM(m, 'guest', 21, 23, 1, 1);
  placeM(m, 'dir', 14, 28, 1, 1);
  placeM(m, 'rank', 21, 28, 1, 1);
  placeM(m, 'bench', 4, 30, 2, 1); placeM(m, 'bench', 29, 30, 2, 1);
  for (const [x, y] of [[12, 21], [23, 21], [12, 31], [23, 31], [1, 31], [10, 13], [34, 31], [25, 13], [12, 18], [23, 18], [34, 2]]) placeM(m, 'plant', x, y, 1, 1);
  m.labels = [{ t: 'Phòng Lớp Học', x: 5.5 * T + 8, y: 14 * T + 2 }, { t: 'Phòng Sự Kiện', x: 29.5 * T + 8, y: 14 * T + 2 },
    { t: 'Sảnh Thành Tích', x: 17.5 * T + 8, y: 2 * T + 6 }, { t: 'Phòng Ống Kính', x: 29.5 * T + 8, y: 2 * T + 6 }, { t: 'Lối ra ↓', x: 18 * T, y: 32 * T + 8 }];
  if (loveOpen) m.labels.push({ t: 'Phòng Riêng ♥', x: 6 * T, y: 2 * T + 6, pink: true });
  m.areas = RECTS.map(([id, x0, y0, x1, y1]) => ({ id, x0, y0, x1, y1 }));
  return m;
}

/* ---------- pixel helpers ---------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function disc(g, c, cx, cy, r) { g.fillStyle = c; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1); }
function ell(g, c, cx, cy, rx, ry) { g.fillStyle = c; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1); }
function heartPx(g, c, x, y, sz = 1) { ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') R(g, c, x + i * sz, y + j * sz, sz, sz); })); }
function outline(c, col = '#241a26') {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data, w = c.width, h = c.height, m = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (a[i + 3]) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] > 0;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) m.push([x, y]);
  }
  g.fillStyle = col; m.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return c;
}
function fitText(g, t, x, y, size, maxW, col) {
  let f = size; g.font = `${f}px VT323, monospace`;
  while (f > 5 && g.measureText(t).width > maxW) { f -= 0.5; g.font = `${f}px VT323, monospace`; }
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}

/* ---------- outside tiles ---------- */
function drawGrass(g, px, py, x, y) {
  R(g, '#6dbb5a', px, py, T, T);
  for (let i = 0; i < 4; i++) { const hx = Math.floor(hash(x, y, i) * 15), hy = Math.floor(hash(x, y, i + 9) * 15); R(g, '#5aa84b', px + hx, py + hy, 2, 1); R(g, '#5aa84b', px + hx, py + hy - 1, 1, 1); }
  R(g, '#86cf6e', px + Math.floor(hash(x, y, 21) * 14), py + Math.floor(hash(x, y, 22) * 14), 1, 1);
}
function drawFlower(g, px, py, x, y) {
  drawGrass(g, px, py, x, y);
  const cols = ['#ffffff', '#ffd34d', '#ff9fc0', '#c6bfff'];
  for (let i = 0; i < 2; i++) {
    const fx = 2 + Math.floor(hash(x, y, 30 + i) * 11), fy = 2 + Math.floor(hash(x, y, 40 + i) * 11), c = cols[Math.floor(hash(x, y, 50 + i) * 4)];
    R(g, c, px + fx - 1, py + fy, 3, 1); R(g, c, px + fx, py + fy - 1, 1, 3); R(g, '#f6a623', px + fx, py + fy, 1, 1);
  }
}
function drawSand(g, px, py, x, y) {
  R(g, '#ecd9a4', px, py, T, T);
  for (let i = 0; i < 4; i++) R(g, i % 2 ? '#dcc58a' : '#f6e8bf', px + Math.floor(hash(x, y, 60 + i) * 15), py + Math.floor(hash(x, y, 70 + i) * 15), 1, 1);
}
function drawStone(g, px, py) {
  R(g, '#d6cbb5', px, py, T, T);
  R(g, '#b6a98f', px, py, T, 1); R(g, '#b6a98f', px, py + 8, T, 1); R(g, '#b6a98f', px, py, 1, 8); R(g, '#b6a98f', px + 8, py + 8, 1, 8);
  R(g, '#e6ddca', px + 1, py + 1, 7, 1); R(g, '#e6ddca', px + 9, py + 1, 7, 1); R(g, '#e6ddca', px, py + 9, 8, 1); R(g, '#e6ddca', px + 9, py + 9, 7, 1);
}
function drawTree(g, px, py, x, y) {
  drawGrass(g, px, py, x, y);
  R(g, 'rgba(30,70,30,.35)', px + 2, py + 13, 12, 3);
  R(g, '#7b4a2a', px + 7, py + 10, 3, 5); R(g, '#5a3420', px + 9, py + 10, 1, 5);
  for (let j = 0; j < 13; j++) for (let i = 0; i < 16; i++) {
    const d = Math.hypot(i + 0.5 - 8, j + 0.5 - 6.3); if (d > 6.6) continue;
    let c = '#3d8c43'; if (d > 5.7) c = '#255f2c'; else if ((i - 5) ** 2 + (j - 3.5) ** 2 < 6) c = '#66b85c'; else if (i + j > 15 && d > 3.5) c = '#2f7536';
    R(g, c, px + i, py + j, 1, 1);
  }
  R(g, '#8fd27c', px + 5, py + 2, 2, 1);
}
function wetAt(m, x, y) { if (x < 0 || y < 0 || x >= m.W || y >= m.H) return true; const c = m.base[y][x]; return c === WATER || c === RAIL || (c === PLANK && (y > 18 || x > 29)); }
function drawWater(g, px, py, x, y, m) {
  R(g, '#3f95d1', px, py, T, T); R(g, '#3786c0', px, py + 10, T, 6);
  if (hash(x, y, 81) < 0.3) R(g, '#5aaee3', px + Math.floor(hash(x, y, 82) * 10), py + 4 + Math.floor(hash(x, y, 83) * 8), 4, 1);
  if (!wetAt(m, x, y - 1)) { R(g, '#bfe6f7', px, py, T, 2); R(g, '#7cc4ea', px, py + 2, T, 1); }
  if (!wetAt(m, x - 1, y)) R(g, '#7cc4ea', px, py, 1, T);
  if (!wetAt(m, x + 1, y)) R(g, '#7cc4ea', px + 15, py, 1, T);
  if (!wetAt(m, x, y + 1)) R(g, '#2f78ad', px, py + 14, T, 2);
}
function drawPlank(g, px, py, x, y, horiz) {
  R(g, '#a8774a', px, py, T, T);
  if (horiz) { for (let i = 0; i < T; i += 4) { R(g, '#8a5c36', px + i + 3, py, 1, T); R(g, '#bf8f5e', px + i, py, 1, T); } }
  else for (let j = 0; j < T; j += 4) { R(g, '#8a5c36', px, py + j + 3, T, 1); R(g, '#bf8f5e', px, py + j, T, 1); }
  R(g, '#7a4e2c', px + (x % 2 ? 2 : 10), py + Math.floor(hash(x, y, 4) * 3) * 4 + 1, 1, 2);
}
function drawRail(g, px, py, x, y, m) {
  drawWater(g, px, py, x, y, m);
  if (y === 9 || y === 12) { // cầu ngang (sang chùa)
    const top = y === 12, ry = top ? py : py + 11;
    R(g, 'rgba(0,0,0,.18)', px, ry + (top ? 0 : -1), T, 6);
    R(g, '#a8774a', px, ry, T, 5); R(g, '#e9d3a8', px, ry + 1, T, 3); R(g, '#7a4e2c', px, ry + (top ? 4 : 0), T, 1);
    if (x % 2 === 0) { R(g, '#5c3a20', px + 4, ry, 5, 5); R(g, '#8a5c36', px + 4, ry + 1, 4, 3); }
    return;
  }
  const right = x === 17, rx = right ? px : px + 11;
  R(g, 'rgba(0,0,0,.18)', rx + (right ? 0 : -1), py, 6, T);
  R(g, '#a8774a', rx, py, 5, T); R(g, '#7a4e2c', rx + (right ? 4 : 0), py, 1, T);
  R(g, '#e9d3a8', rx + 1, py, 3, T); R(g, '#c9a878', rx + 1, py + 1, 3, 1);
  if (y % 2 === 0) { R(g, '#5c3a20', rx, py + 4, 5, 5); R(g, '#8a5c36', rx + 1, py + 4, 3, 4); }
}

/* ---------- outside props ---------- */
function drawMuseum(g, ox, oy) { // 14×8 ô
  const W2 = 224;
  R(g, 'rgba(20,40,20,.25)', ox + 2, oy + 124, W2 - 4, 4);
  R(g, '#cfc6b4', ox + 6, oy + 116, W2 - 12, 12); R(g, '#e6ddca', ox + 6, oy + 116, W2 - 12, 2); R(g, '#b6a98f', ox + 6, oy + 122, W2 - 12, 1);
  R(g, '#d8cfbc', ox + 12, oy + 108, W2 - 24, 8); R(g, '#ece4d2', ox + 12, oy + 108, W2 - 24, 2);
  R(g, '#e0d7c4', ox + 18, oy + 100, W2 - 36, 8); R(g, '#f3ecdd', ox + 18, oy + 100, W2 - 36, 2);
  R(g, '#cbbfa5', ox + 22, oy + 46, W2 - 44, 54); R(g, '#b9ad92', ox + 22, oy + 46, W2 - 44, 6);
  R(g, '#7a5a24', ox + 94, oy + 56, 36, 44); R(g, '#c99a3a', ox + 95, oy + 57, 34, 43);
  R(g, '#2a1f2a', ox + 98, oy + 60, 28, 40);
  for (let j = 0; j < 40; j++) R(g, `rgba(255,${190 + j},${110 + j},${(j / 40) * 0.55})`, ox + 98, oy + 60 + j, 28, 1);
  R(g, '#ffd27a', ox + 111, oy + 60, 2, 40);
  for (const [c, bx] of [['#a99cff', 33], ['#5ee0a0', 65], ['#ffd27a', 145], ['#7ee8ff', 177]]) {
    R(g, '#6a5a3a', bx - 1, oy + 52, 16, 2);
    R(g, c, bx, oy + 54, 14, 26); R(g, 'rgba(0,0,0,.18)', bx + 11, oy + 54, 3, 26);
    R(g, c, bx, oy + 80, 5, 3); R(g, c, bx + 9, oy + 80, 5, 3);
    R(g, 'rgba(255,255,255,.75)', bx + 4, oy + 60, 6, 6); R(g, c, bx + 5, oy + 61, 4, 4); R(g, 'rgba(255,255,255,.75)', bx + 6, oy + 62, 2, 2);
    R(g, 'rgba(255,255,255,.55)', bx + 3, oy + 70, 8, 1); R(g, 'rgba(255,255,255,.55)', bx + 4, oy + 73, 6, 1);
  }
  for (const c of [24, 56, 88, 136, 168, 200]) {
    R(g, 'rgba(0,0,0,.12)', ox + c + 5, oy + 50, 3, 50);
    R(g, '#f3ecdd', ox + c - 5, oy + 50, 10, 50);
    for (let i = -3; i <= 3; i += 3) R(g, '#d6cbb5', ox + c + i, oy + 52, 1, 46);
    R(g, '#ffffff', ox + c - 4, oy + 50, 1, 50);
    R(g, '#e6ddca', ox + c - 7, oy + 46, 14, 4); R(g, '#b6a98f', ox + c - 7, oy + 49, 14, 1);
    R(g, '#e6ddca', ox + c - 6, oy + 97, 12, 3);
  }
  R(g, '#efe6d2', ox + 8, oy + 34, W2 - 16, 12); R(g, '#b6a98f', ox + 8, oy + 45, W2 - 16, 1); R(g, '#d6cbb5', ox + 8, oy + 34, W2 - 16, 1);
  fitText(g, 'K N O W O R L D   M U S E U M', ox + W2 / 2, oy + 40.5, 11, 190, '#5b4a3a');
  for (let y = 0; y < 30; y++) {
    const half = Math.round((y / 29) * 108), x0 = ox + 112 - half, w = half * 2;
    R(g, y < 2 ? '#bfb39b' : '#e6ddca', x0, oy + 4 + y, w, 1);
    R(g, '#bfb39b', x0, oy + 4 + y, 2, 1); R(g, '#bfb39b', x0 + w - 2, oy + 4 + y, 2, 1);
    if (y > 6 && y < 28) { const ih = Math.round(((y - 6) / 22) * 84); R(g, '#d6c9ae', ox + 112 - ih, oy + 4 + y, ih * 2, 1); }
  }
  R(g, '#bfb39b', ox + 4, oy + 32, W2 - 8, 2);
  const ex = ox + 112, ey = oy + 22;
  R(g, '#5b4a6e', ex - 9, ey - 4, 18, 11); R(g, '#5b4a6e', ex - 4, ey - 6, 8, 2); R(g, '#3b3350', ex - 9, ey + 6, 18, 1);
  disc(g, '#ffd27a', ex, ey + 1, 4); disc(g, '#3b3350', ex, ey + 1, 2.5); R(g, '#c6bfff', ex - 1, ey, 1, 1);
  for (let i = 0; i < 5; i++) { R(g, '#8fae5a', ex - 16 - i * 3, ey + 4 - i * 2, 2, 2); R(g, '#8fae5a', ex + 14 + i * 3, ey + 4 - i * 2, 2, 2); }
  for (const lx of [60, 164]) { R(g, '#3b3350', ox + lx, oy + 62, 1, 6); R(g, '#c99a3a', ox + lx - 3, oy + 68, 7, 9); R(g, '#ffe39a', ox + lx - 2, oy + 69, 5, 7); }
}
function drawFountain(g, ox, oy) {
  ell(g, 'rgba(0,0,0,.18)', ox + 16, oy + 22, 15, 8);
  ell(g, '#b6a98f', ox + 16, oy + 18, 15, 10); ell(g, '#e6ddca', ox + 16, oy + 17, 14, 9);
  ell(g, '#3f95d1', ox + 16, oy + 17, 11, 6.5); ell(g, '#5aaee3', ox + 14, oy + 15, 6, 3);
  R(g, '#cfc6b4', ox + 14, oy + 6, 4, 11); R(g, '#e6ddca', ox + 14, oy + 6, 1, 11);
  ell(g, '#e6ddca', ox + 16, oy + 7, 5, 2); ell(g, '#5aaee3', ox + 16, oy + 6.6, 3.5, 1.2);
}
function drawLamp(g, px, py, part) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.2)', px + 4, py + 13, 8, 2); R(g, '#3b3350', px + 6, py + 11, 4, 4); R(g, '#3b3350', px + 7, py, 2, 12); }
  if (part !== 'base') { R(g, '#3b3350', px + 7, py - 6, 2, 6); R(g, '#3b3350', px + 4, py - 12, 8, 2); R(g, '#ffe39a', px + 5, py - 10, 6, 5); R(g, '#c99a3a', px + 4, py - 5, 8, 1); R(g, '#3b3350', px + 7, py - 14, 2, 2); }
}
function drawSignOut(g, px, py, part, duck) {
  if (part !== 'top') { R(g, '#6b4a2a', px + 3, py + 4, 2, 11); R(g, '#6b4a2a', px + 11, py + 4, 2, 11); }
  if (part !== 'base') {
    R(g, '#8a5c36', px - 2, py - 8, 20, 14); R(g, duck ? '#fff1b8' : '#e9d3a8', px - 1, py - 7, 18, 12);
    if (duck) { ell(g, '#ffffff', px + 8, py - 1, 4, 3); disc(g, '#ffffff', px + 10, py - 4, 2.2); R(g, '#f08a1c', px + 12, py - 4, 2, 1); R(g, '#241a26', px + 10, py - 5, 1, 1); }
    else { R(g, '#7a5a3a', px + 1, py - 5, 14, 1); R(g, '#9a8a70', px + 1, py - 2, 10, 1); R(g, '#9a8a70', px + 1, py + 1, 12, 1); }
  }
}
function drawBenchOut(g, px, py) {
  R(g, 'rgba(0,0,0,.18)', px + 1, py + 12, 30, 3);
  R(g, '#8a5c36', px + 2, py + 4, 28, 3); R(g, '#a8774a', px + 2, py + 7, 28, 4); R(g, '#c99a6a', px + 2, py + 7, 28, 1);
  R(g, '#3b3350', px + 4, py + 11, 2, 3); R(g, '#3b3350', px + 26, py + 11, 2, 3);
}

/* ---------- inside tiles ---------- */
function drawWood(g, px, py, x, y) {
  R(g, '#b5845a', px, py, T, T);
  for (let j = 0; j < T; j += 4) { R(g, '#9a6b44', px, py + j + 3, T, 1); R(g, '#c49468', px, py + j, T, 1); R(g, '#9a6b44', px + Math.floor(hash(x, y, j) * 14), py + j, 1, 3); }
}
function drawMarble(g, px, py, x, y) {
  const a = (x + y) % 2 === 0;
  R(g, a ? '#ece5d6' : '#ddd3c0', px, py, T, T); R(g, '#cbbfa8', px, py, T, 1); R(g, '#cbbfa8', px, py, 1, T);
  if (hash(x, y, 5) < 0.5) { const vx = Math.floor(hash(x, y, 6) * 10); R(g, a ? '#d9cfbc' : '#cdc2ad', px + vx + 2, py + 4, 1, 3); R(g, a ? '#d9cfbc' : '#cdc2ad', px + vx + 3, py + 7, 1, 3); }
  R(g, 'rgba(255,255,255,.35)', px + 2, py + 2, 3, 1);
}
function drawCarpet(g, px, py, x, y, m) {
  R(g, '#9e2f2a', px, py, T, T);
  for (let j = 2; j < T; j += 6) for (let i = 3; i < T; i += 6) R(g, '#b8433a', px + i, py + j, 2, 2);
  const cp = (xx) => xx >= 0 && xx < m.W && (m.base[y][xx] === CARPET || m.base[y][xx] === DOOR);
  if (!cp(x - 1)) { R(g, '#e0b35a', px + 1, py, 1, T); R(g, '#7a221e', px, py, 1, T); }
  if (!cp(x + 1)) { R(g, '#e0b35a', px + 14, py, 1, T); R(g, '#7a221e', px + 15, py, 1, T); }
}
function drawPink(g, px, py, x, y) {
  R(g, '#f4c3cf', px, py, T, T); R(g, '#efb4c3', px, py + 15, T, 1);
  if (hash(x, y, 11) < 0.35) heartPx(g, '#eb9fb4', px + 3 + Math.floor(hash(x, y, 12) * 6), py + 3 + Math.floor(hash(x, y, 13) * 6));
}
const floorAt = (m, x, y) => x >= 0 && y >= 0 && x < m.W && y < m.H && m.base[y][x] !== WALLI;
const wallAt = (m, x, y) => x >= 0 && y >= 0 && x < m.W && y < m.H && m.base[y][x] === WALLI;
function themeOf(m, x, y) {
  for (const yy of [y + 1, y + 2]) if (floorAt(m, x, yy)) { const b = m.base[yy][x]; return b === PINK ? 'love' : (b === MARBLE || b === CARPET) ? 'marble' : 'wood'; }
  return 'wood';
}
const WALLC = { wood: ['#e9dfc9', '#d9ccb2'], marble: ['#efe3c4', '#ddcfa8'], love: ['#f6d3dd', '#e9b9c7'] };
function drawWallTile(g, px, py, x, y, m) {
  const lower = floorAt(m, x, y + 1), upper = !lower && wallAt(m, x, y + 1) && floorAt(m, x, y + 2);
  if (lower || upper) {
    const [c1, c2] = WALLC[themeOf(m, x, y)];
    R(g, c1, px, py, T, T);
    for (let j = 1; j < T; j += 4) R(g, c2, px + ((x + j) % 3) * 5, py + j, 1, 1);
    if (upper) { R(g, '#3b3350', px, py, T, 3); R(g, '#5b4a6e', px, py + 3, T, 1); R(g, c2, px, py + 4, T, 1); }
    if (lower) { R(g, '#a07a58', px, py + 10, T, 1); R(g, '#7a5a44', px, py + 11, T, 4); R(g, '#4a3528', px, py + 15, T, 1); }
    if (!wallAt(m, x - 1, y)) R(g, 'rgba(0,0,0,.15)', px, py, 1, T);
    if (!wallAt(m, x + 1, y)) R(g, 'rgba(0,0,0,.15)', px + 15, py, 1, T);
    return;
  }
  R(g, '#2a2638', px, py, T, T);
  if (floorAt(m, x - 1, y)) R(g, '#4a4360', px, py, 2, T);
  if (floorAt(m, x + 1, y)) R(g, '#4a4360', px + 14, py, 2, T);
  if (floorAt(m, x, y - 1)) R(g, '#4a4360', px, py, T, 2);
  if (hash(x, y, 2) < 0.2) R(g, '#332e45', px + 4, py + 6, 6, 1);
}

/* ---------- ảnh minh họa (vẽ bằng code) ---------- */
const SHIRTS = ['#8b7cf6', '#5ee0a0', '#ffd27a', '#ff8fb1', '#7ee8ff', '#f08a3c', '#ffffff', '#e6463a'];
const HAIRS = ['#2b2530', '#3a2a22', '#6b4024', '#1f1a24'];
function fig(g, x, y, shirt, hair, skin = '#f2c9a6', pants = '#3b3f6b') {
  R(g, hair, x + 1, y, 5, 2); R(g, skin, x + 1, y + 2, 5, 3); R(g, hair, x + 1, y + 1, 1, 2); R(g, hair, x + 5, y + 1, 1, 2);
  R(g, '#2a1f2a', x + 2, y + 3, 1, 1); R(g, '#2a1f2a', x + 4, y + 3, 1, 1);
  R(g, shirt, x, y + 5, 7, 5); R(g, skin, x - 1, y + 6, 1, 3); R(g, skin, x + 7, y + 6, 1, 3);
  R(g, pants, x + 1, y + 10, 2, 3); R(g, pants, x + 4, y + 10, 2, 3);
}
function portraitArt(g) {
  const c = mk(24, 24), p = c.getContext('2d'), r = (col, x, y, w, h) => R(p, col, x, y, w, h);
  disc(p, '#4a3f6b', 12, 12, 11.5);
  r('#2b3a6b', 5, 18, 14, 6); r('#ffffff', 10, 18, 4, 3); r('#c2412d', 11, 19, 2, 5);
  r('#f2c9a6', 7, 6, 10, 11); r('#f2c9a6', 10, 16, 4, 2);
  r('#1f1a24', 6, 3, 12, 4); r('#1f1a24', 6, 6, 1, 4); r('#1f1a24', 17, 6, 1, 4); r('#1f1a24', 9, 2, 7, 1);
  r('#1f1a24', 7, 9, 4, 3); r('#1f1a24', 13, 9, 4, 3); r('#9fd0ff', 8, 10, 2, 1); r('#9fd0ff', 14, 10, 2, 1); r('#1f1a24', 11, 10, 2, 1);
  r('#b5523f', 10, 14, 4, 1); r('#f4a08a', 7, 13, 1, 1); r('#f4a08a', 16, 13, 1, 1);
  R(g, '#2a2448', 0, 0, 64, 48); for (let i = 0; i < 64; i += 8) R(g, '#332c57', i, 0, 4, 48);
  g.drawImage(c, 14, 4, 36, 36); R(g, '#ffd27a', 18, 41, 28, 4); R(g, '#7a5a24', 20, 42, 24, 1);
}
const artCache = {};
function sampleArt(it) {
  if (artCache[it.id]) return artCache[it.id];
  const c = mk(64, 48), g = c.getContext('2d'), sd = hashStr(it.id), rnd = (k) => hash(sd % 9973, k, 7);
  const pick = (arr, k) => arr[Math.floor(rnd(k) * arr.length)];
  const k = it.art;
  if (k === 'class') {
    R(g, pick(['#f3ead8', '#e6eef3', '#efe6f6'], 1), 0, 0, 64, 30); R(g, 'rgba(0,0,0,.06)', 0, 26, 64, 4);
    R(g, '#5b4a3a', 5, 3, 38, 21); R(g, rnd(2) < 0.5 ? '#fbfbf7' : '#2f4a3f', 6, 4, 36, 19);
    const ink = rnd(2) < 0.5 ? pick(['#2f4a7a', '#c2412d', '#3f8f3e'], 3) : '#e9f0e4';
    for (let i = 0; i < 4; i++) R(g, ink, 9, 7 + i * 4, 8 + Math.floor(rnd(10 + i) * 22), 1);
    R(g, ink, 32, 8, 6, 6); R(g, rnd(4) < 0.5 ? '#ffd27a' : '#ff8fb1', 33, 9, 4, 4);
    fig(g, 48, 9, '#2f4a7a', '#1f1a24');
    R(g, '#c79a68', 0, 30, 64, 18); R(g, '#b5845a', 0, 30, 64, 1);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) { const x = 2 + i * 9 + (row % 2) * 4, y = 30 + row * 6; R(g, pick(SHIRTS, 20 + row * 9 + i), x - 1, y + 4, 8, 4); disc(g, pick(HAIRS, 40 + row * 9 + i), x + 3, y + 2, 2.8); }
  } else if (k === 'stage') {
    R(g, '#1b1730', 0, 0, 64, 48);
    R(g, pick(['#8b7cf6', '#5ee0a0', '#ff8fb1', '#7ee8ff'], 1), 8, 4, 48, 10); R(g, 'rgba(255,255,255,.85)', 14, 7, 24, 2); R(g, 'rgba(255,255,255,.55)', 14, 10, 34, 1);
    g.fillStyle = 'rgba(255,240,180,.16)';
    for (const sx of [10, 54]) { g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx - 10 + (sx > 32 ? -10 : 10), 30); g.lineTo(sx + 10 + (sx > 32 ? -10 : 10), 30); g.fill(); }
    R(g, '#4b3f6b', 0, 28, 64, 6); R(g, '#6a5a94', 0, 28, 64, 1);
    fig(g, 18, 15, pick(SHIRTS, 5), pick(HAIRS, 6)); fig(g, 29, 14, '#ffffff', '#1f1a24'); fig(g, 40, 15, pick(SHIRTS, 7), pick(HAIRS, 8));
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) disc(g, row === 0 ? '#2e2847' : '#0f0d1a', 3 + i * 7 + row * 2, 38 + row * 4, 3);
    for (let i = 0; i < 5; i++) R(g, '#fff6c0', 4 + Math.floor(rnd(30 + i) * 56), 34 + Math.floor(rnd(40 + i) * 8), 1, 2);
  } else if (k === 'group') {
    for (let y = 0; y < 30; y++) R(g, `rgb(${150 + y * 2},${205 + y},240)`, 0, y, 64, 1);
    for (let i = 0; i < 6; i++) disc(g, '#3d8c43', 4 + i * 12, 22 + (i % 2) * 2, 7);
    R(g, '#6dbb5a', 0, 30, 64, 18); R(g, '#5aa84b', 0, 30, 64, 1);
    for (let i = 0; i < 7; i++) fig(g, 3 + i * 8 + (i > 3 ? 1 : 0), 16, pick(SHIRTS, 10 + i), pick(HAIRS, 20 + i));
    for (let i = 0; i < 6; i++) fig(g, 7 + i * 8, 27, pick(SHIRTS, 30 + i), pick(HAIRS, 40 + i));
  } else if (k === 'trophy') {
    R(g, '#2a2448', 0, 0, 64, 48); disc(g, '#3b3366', 32, 22, 22); disc(g, '#4a3f80', 32, 22, 14);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; R(g, '#ffe39a', Math.round(32 + Math.cos(a) * 26), Math.round(22 + Math.sin(a) * 20), 1, 1); }
    for (let y = 0; y < 14; y++) { const w = Math.round(18 - (y * y) / 16); R(g, '#f2c14e', 32 - w / 2, 8 + y, w, 1); R(g, '#c9922e', 32 + w / 2 - 3, 8 + y, 3, 1); R(g, '#ffe39a', 32 - w / 2 + 2, 8 + y, 2, 1); }
    R(g, '#f2c14e', 13, 10, 3, 7); R(g, '#f2c14e', 48, 10, 3, 7); R(g, '#f2c14e', 15, 16, 3, 2); R(g, '#f2c14e', 46, 16, 3, 2);
    R(g, '#c9922e', 30, 22, 4, 7); R(g, '#f2c14e', 24, 29, 16, 3); R(g, '#7a5a3a', 21, 32, 22, 8); R(g, '#ffd27a', 26, 34, 12, 3);
  } else if (k === 'cert') {
    R(g, '#3a3046', 0, 0, 64, 48); R(g, '#fbf3dc', 6, 4, 52, 40);
    g.strokeStyle = '#c99a3a'; g.lineWidth = 1; g.strokeRect(8.5, 6.5, 47, 35); g.strokeRect(10.5, 8.5, 43, 31);
    R(g, '#b3342a', 18, 12, 28, 3); R(g, '#9a8a70', 16, 19, 32, 1); R(g, '#9a8a70', 20, 23, 24, 1); R(g, '#9a8a70', 18, 27, 28, 1);
    disc(g, '#c2412d', 46, 34, 5); disc(g, '#e5604a', 46, 34, 3);
    for (let i = 0; i < 12; i++) R(g, '#2f4a7a', 14 + i, 35 + Math.round(Math.sin(i) * 1.5), 1, 1);
  } else if (k === 'sunset') {
    for (let y = 0; y < 34; y++) R(g, `rgb(255,${130 + y * 3},${110 - y})`, 0, y, 64, 1);
    disc(g, '#fff1c8', 42, 24, 7);
    for (let i = 0; i < 10; i++) { const h = 6 + Math.floor(rnd(i) * 16); R(g, '#3a2846', i * 6 + 1, 34 - h, 5, h); R(g, '#ffd27a', i * 6 + 2, 34 - h + 3, 1, 1); }
    for (let y = 34; y < 48; y++) R(g, y % 3 ? '#5a3a5e' : '#6a4570', 0, y, 64, 1);
    for (let i = 0; i < 6; i++) R(g, '#ffb37a', 36 + Math.floor(rnd(20 + i) * 12), 36 + i * 2, 4, 1);
  } else if (k === 'oldtown') {
    R(g, '#bfe3f2', 0, 0, 64, 48);
    for (let i = 0; i < 4; i++) { const x = i * 16, h = 18 + Math.floor(rnd(i) * 6); R(g, '#f2c94c', x, 40 - h, 16, h); R(g, '#b3542a', x - 1, 40 - h - 4, 18, 4); R(g, '#7a3a1a', x + 4, 30, 6, 10); R(g, '#3f8f3e', x + 11, 40 - h + 5, 3, 4); }
    for (let i = 0; i < 7; i++) { const x = 4 + i * 9, y = 9 + Math.round(Math.sin((i / 6) * Math.PI) * 4); ell(g, i % 2 ? '#e6463a' : '#ff9a3a', x, y + 3, 2.5, 3); R(g, '#ffe39a', x - 1, y + 2, 1, 2); }
    R(g, '#c9b48a', 0, 40, 64, 8); R(g, '#b39a6a', 0, 40, 64, 1);
  } else if (k === 'sea') {
    for (let y = 0; y < 22; y++) R(g, `rgb(${140 + y * 3},${200 + y},240)`, 0, y, 64, 1);
    disc(g, '#fff6c0', 14, 10, 5);
    for (let y = 22; y < 38; y++) R(g, y % 4 ? '#3f8fc8' : '#5aaee3', 0, y, 64, 1);
    for (let i = 0; i < 8; i++) R(g, '#ffffff', Math.floor(rnd(i) * 60), 24 + Math.floor(rnd(i + 9) * 12), 4, 1);
    R(g, '#f0dca8', 0, 38, 64, 10); R(g, '#e3c98a', 0, 38, 64, 1);
    R(g, '#8a5c36', 38, 30, 14, 3); R(g, '#6b4024', 40, 33, 10, 1); R(g, '#3b3350', 44, 22, 1, 8); R(g, '#ffffff', 45, 23, 5, 6);
  } else if (k === 'love') {
    for (let y = 0; y < 34; y++) R(g, `rgb(${247 - y},${168 + y * 2},${192 - y * 2})`, 0, y, 64, 1);
    disc(g, '#fff1c8', 46, 20, 6);
    ell(g, '#6a4a7a', 32, 52, 46, 18); ell(g, '#5a3e6a', 10, 48, 20, 12);
    R(g, '#3a2846', 9, 18, 3, 16); disc(g, '#3a2846', 10, 16, 8); disc(g, '#3a2846', 5, 20, 5); disc(g, '#3a2846', 16, 21, 5);
    const sx = 26 + Math.floor(rnd(1) * 6);
    fig(g, sx, 22, '#3a2846', '#3a2846', '#3a2846', '#3a2846'); fig(g, sx + 9, 23, '#3a2846', '#3a2846', '#3a2846', '#3a2846');
    heartPx(g, '#ff5a8a', sx + 5, 12); heartPx(g, '#ffd1e0', 52, 6);
  } else portraitArt(g);
  artCache[it.id] = c; return c;
}

/* ---------- inside props ---------- */
function drawFrameBox(g, px, py, love) {
  const gold = love ? '#f39ab5' : '#c99a3a', dark = love ? '#b4577a' : '#7a5a24';
  R(g, 'rgba(255,226,160,.18)', px + 6, py + 2, 20, 3); R(g, '#3b3350', px + 14, py + 1, 4, 2);
  R(g, 'rgba(0,0,0,.25)', px + 4, py + 6, 26, 21);
  R(g, dark, px + 3, py + 5, 26, 21); R(g, gold, px + 4, py + 6, 24, 19); R(g, '#f6eedb', px + 5, py + 7, 22, 17);
  if (love) heartPx(g, '#ff5a8a', px + 12, py + 25); else { R(g, '#e9d3a8', px + 11, py + 27, 10, 3); R(g, '#9a8a70', px + 12, py + 28, 8, 1); }
  return [px + 6, py + 8, 20, 15];
}
function drawMapFrame(g, px, py) {
  R(g, 'rgba(0,0,0,.25)', px + 4, py + 6, 26, 21); R(g, '#3b3350', px + 3, py + 5, 26, 21); R(g, '#f6eedb', px + 4, py + 6, 24, 19);
  const cols = { love: '#ff8fb1', award: '#ffd27a', lens: '#7ee8ff', class: '#a99cff', event: '#5ee0a0', lobby: '#cfe9ef' };
  for (const [id, x0, y0, x1, y1] of RECTS) R(g, cols[id], px + 5 + Math.round((x0 * 22) / 36), py + 7 + Math.round((y0 * 17) / 33), Math.max(2, Math.round(((x1 - x0 + 1) * 22) / 36)), Math.max(2, Math.round(((y1 - y0 + 1) * 17) / 33)));
  R(g, '#e23b2b', px + 16, py + 22, 2, 2);
  fitText(g, 'SƠ ĐỒ', px + 16, py + 29, 8, 22, '#3b3350');
}
function drawBanner(g, px, py) {
  R(g, '#6a5a3a', px + 2, py + 3, 60, 2);
  R(g, '#9e2f2a', px + 6, py + 5, 52, 20); R(g, '#7a221e', px + 6, py + 23, 52, 2);
  R(g, '#e0b35a', px + 6, py + 5, 52, 1); R(g, '#e0b35a', px + 8, py + 7, 48, 1);
  for (let i = 0; i < 6; i++) R(g, '#9e2f2a', px + 8 + i * 9, py + 25, 5, 3);
  fitText(g, 'THÀNH TÍCH', px + 32, py + 15.5, 12, 44, '#ffe39a');
}
function drawHeartDoor(g, px, py) {
  R(g, '#7a3a52', px + 2, py + 2, 28, 30); R(g, '#e86a98', px + 4, py + 4, 24, 28); R(g, '#d4507f', px + 15, py + 4, 2, 28);
  R(g, '#f39ab5', px + 4, py + 4, 24, 2);
  heartPx(g, '#ffd1e0', px + 6, py + 10); heartPx(g, '#ffd1e0', px + 19, py + 10);
  R(g, '#ffd27a', px + 12, py + 20, 2, 3); R(g, '#ffd27a', px + 18, py + 20, 2, 3);
  disc(g, '#ffd27a', px + 16, py + 26, 2.5); R(g, '#7a3a52', px + 15, py + 26, 2, 2);
}
function drawPanel(g, px, py, part) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.22)', px + 2, py + 11, 28, 4); R(g, '#3b3350', px + 4, py + 6, 2, 8); R(g, '#3b3350', px + 26, py + 6, 2, 8); R(g, '#2a2638', px + 3, py + 13, 4, 2); R(g, '#2a2638', px + 25, py + 13, 4, 2); }
  if (part !== 'base') { R(g, '#2a2638', px + 1, py - 14, 30, 22); R(g, '#f2ead8', px + 2, py - 13, 28, 20); R(g, '#ddd2bb', px + 2, py + 5, 28, 2); R(g, '#c99a3a', px + 5, py - 11, 22, 15); }
  return [px + 6, py - 10, 20, 13];
}
function drawPedBase(g, px, py, w) {
  const pw = w * T;
  R(g, 'rgba(0,0,0,.2)', px + 1, py + 12, pw - 2, 4);
  R(g, '#e6ddca', px + 2, py + 2, pw - 4, 12); R(g, '#cfc6b4', px + 2, py + 10, pw - 4, 4); R(g, '#f6f0e2', px + 1, py + 1, pw - 2, 2);
  R(g, '#c99a3a', px + pw / 2 - 4, py + 6, 8, 2);
}
function drawPedTop(g, px, py, w, img) { // khung ảnh nhỏ đứng trên bệ + cúp
  const pw = w * T, cx = px + pw / 2;
  if (w === 2) {
    R(g, '#7a5a24', cx - 13, py - 20, 26, 21); R(g, '#f2c14e', cx - 12, py - 19, 24, 19);
    return [cx - 10, py - 17, 20, 15];
  }
  R(g, '#7a5a24', cx - 7, py - 13, 14, 14); R(g, '#f2c14e', cx - 6, py - 12, 12, 12);
  return [cx - 5, py - 11, 10, 10];
}
function drawPlant(g, px, py, part) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.2)', px + 3, py + 13, 10, 2); R(g, '#b3542a', px + 4, py + 7, 8, 7); R(g, '#8a3a1a', px + 4, py + 12, 8, 2); R(g, '#d06a3a', px + 4, py + 7, 8, 1); }
  if (part !== 'base') for (const [x, y, r, c] of [[8, 1, 4, '#3d8c43'], [5, 4, 3.4, '#2f7536'], [11, 3, 3.4, '#3d8c43'], [8, -3, 3, '#66b85c']]) disc(g, c, px + x, py + y, r);
}
function drawDesk(g, px, py, part) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.2)', px + 1, py + 12, 46, 4); R(g, '#7a4e2c', px + 1, py + 2, 46, 12); R(g, '#9a6b44', px + 3, py + 4, 42, 8); R(g, '#c99a3a', px + 18, py + 6, 12, 3); }
  if (part !== 'base') { R(g, '#c49468', px, py - 3, 48, 5); R(g, '#e0b388', px, py - 3, 48, 1); R(g, '#f6eedb', px + 6, py - 6, 8, 3); R(g, '#3b3350', px + 34, py - 9, 8, 6); R(g, '#7ee8ff', px + 35, py - 8, 6, 4); }
}
function drawLectern(g, px, py, part, col = '#c2412d') {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.2)', px + 3, py + 12, 10, 3); R(g, '#7a4e2c', px + 6, py + 2, 4, 12); R(g, '#5a3420', px + 4, py + 12, 8, 2); }
  if (part !== 'base') { R(g, '#9a6b44', px + 1, py - 5, 14, 7); R(g, '#f6eedb', px + 2, py - 6, 12, 6); R(g, '#9a8a70', px + 8, py - 6, 1, 6); R(g, col, px + 7, py, 3, 3); for (let i = 0; i < 3; i++) { R(g, '#b6a98f', px + 3, py - 4 + i * 2, 4, 1); R(g, '#b6a98f', px + 10, py - 4 + i * 2, 3, 1); } }
}
function drawStand(g, px, py, part, cols = ['#a99cff', '#ffd27a', '#5ee0a0']) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.2)', px + 3, py + 12, 10, 3); R(g, '#3b3350', px + 7, py + 2, 2, 12); R(g, '#3b3350', px + 4, py + 13, 8, 2); }
  if (part !== 'base') { R(g, '#3b3350', px, py - 10, 16, 13); R(g, '#f6eedb', px + 1, py - 9, 14, 11); cols.forEach((c, i) => R(g, c, px + 2 + i * 4, py - 8 + (i % 2) * 2, 3, 9 - (i % 2) * 2)); }
}
function drawBench(g, px, py) {
  R(g, 'rgba(0,0,0,.2)', px + 1, py + 11, 30, 4);
  R(g, '#5b4a6e', px + 2, py + 3, 28, 7); R(g, '#7a6a94', px + 2, py + 3, 28, 2); R(g, '#3b3350', px + 2, py + 9, 28, 1);
  R(g, '#2a2638', px + 4, py + 10, 2, 4); R(g, '#2a2638', px + 26, py + 10, 2, 4);
}
function drawLoveCounter(g, px, py, part) {
  if (part !== 'top') { R(g, 'rgba(0,0,0,.18)', px + 2, py + 12, 28, 4); R(g, '#ffffff', px + 3, py + 3, 26, 11); R(g, '#f3d6df', px + 3, py + 11, 26, 3); }
  if (part !== 'base') { heartPx(g, '#e23b6a', px + 6, py - 14, 3); heartPx(g, '#ff8fb1', px + 9, py - 11, 2); R(g, '#ffd1e0', px + 10, py - 12, 2, 2); }
}
function drawCamera(g, px, py, part) {
  if (part !== 'top') { R(g, '#2a2638', px + 7, py - 2, 2, 14); R(g, '#2a2638', px + 3, py + 8, 2, 6); R(g, '#2a2638', px + 11, py + 8, 2, 6); R(g, 'rgba(0,0,0,.2)', px + 2, py + 13, 12, 2); }
  if (part !== 'base') { R(g, '#3b3350', px + 2, py - 10, 12, 8); R(g, '#5b4a6e', px + 5, py - 12, 5, 2); disc(g, '#7ee8ff', px + 8, py - 6, 3); disc(g, '#2a2638', px + 8, py - 6, 1.6); R(g, '#e23b2b', px + 12, py - 9, 1, 1); }
}

/* ---------- vịt ---------- */
function makeDuck(cos, frame = 0) {
  const c = mk(16, 18), g = c.getContext('2d'), Y = 2 + (frame ? 1 : 0), r = (col, x, y, w, h) => R(g, col, x, y + Y, w, h);
  const body = cos === 'rain' ? '#ffd23a' : '#ffffff', shade = cos === 'rain' ? '#e0a91c' : '#dcdde6';
  // chân
  r('#f08a1c', 5, 13, 2, 2); r('#f08a1c', 9, 13, 2, 2); r('#f08a1c', 4, 15 - (frame ? 1 : 0), 3, 1); r('#f08a1c', 9, 15 - (frame ? 1 : 0), 3, 1);
  if (cos === 'cape') { r('#e23b3b', 2, 6, 12, 8); r('#b52a2a', 2, 12, 12, 2); }
  // thân
  ell(g, body, 8, 10 + Y, 5.5, 4); r(shade, 4, 12, 8, 1); r(shade, 3, 9, 2, 3);
  // đầu
  disc(g, '#ffffff', 8, 4.5 + Y, 3.6);
  r('#241a26', 6, 4, 1, 1); r('#241a26', 10, 4, 1, 1);
  r('#f08a1c', 7, 6, 3, 2); r('#c96a10', 7, 7, 3, 1);
  if (cos === 'nonla') { for (let i = 0; i < 4; i++) r(i === 3 ? '#c9a24a' : '#e9d39a', 7 - i * 2, -2 + i, 2 + i * 4, 1); r('#b38a3a', 1, 1, 14, 1); }
  if (cos === 'grad') { r('#241a26', 3, -1, 10, 2); r('#241a26', 5, 1, 6, 1); r('#ffd27a', 12, 0, 1, 4); r('#ffd27a', 11, 4, 3, 1); }
  if (cos === 'rain') { r('#ffd23a', 4, 0, 8, 2); r('#ffd23a', 3, 1, 2, 5); r('#ffd23a', 11, 1, 2, 5); r('#e0a91c', 3, 6, 10, 1); }
  if (cos === 'chef') { r('#ffffff', 5, -3, 6, 4); disc(g, '#ffffff', 6, -3 + Y, 2); disc(g, '#ffffff', 10, -3 + Y, 2); r('#cfd0da', 5, 0, 6, 1); }
  if (cos === 'santa') { r('#e23b3b', 4, 0, 8, 2); r('#e23b3b', 9, -2, 3, 2); r('#e23b3b', 11, -3, 2, 1); r('#ffffff', 12, -4, 2, 2); r('#ffffff', 3, 1, 10, 1); }
  if (cos === 'cool') { r('#241a26', 4, 3, 9, 1); r('#241a26', 5, 4, 3, 2); r('#241a26', 9, 4, 3, 2); r('#7ee8ff', 5, 4, 1, 1); r('#7ee8ff', 9, 4, 1, 1); }
  if (cos === 'cam') { r('#3b3350', 5, 9, 6, 4); r('#7ee8ff', 7, 10, 2, 2); r('#241a26', 4, 8, 1, 2); r('#241a26', 11, 8, 1, 2); r('#e23b2b', 10, 9, 1, 1); }
  if (cos === 'cape') { r('#ffd27a', 7, 9, 2, 2); }
  if (cos === 'crown') { r('#f2c14e', 4, -1, 8, 2); r('#f2c14e', 4, -3, 1, 2); r('#f2c14e', 7, -3, 2, 2); r('#f2c14e', 11, -3, 1, 2); r('#e23b6a', 7, -1, 2, 1); }
  return outline(c);
}

/* ---------- người ---------- */
const PAL = {
  player: { skin: '#f2c9a6', hair: '#2b2530', shirt: '#8b7cf6', shirt2: '#6f5fe0', pants: '#3b3f6b', shoe: '#4a3020', bag: '#f08a3c', bag2: '#c56a24' },
  guard: { skin: '#e8b98f', hair: '#2b2530', shirt: '#2f3f6b', shirt2: '#22305a', pants: '#22305a', shoe: '#1f1a24', cap: '#22305a' },
  curator: { skin: '#f0c49e', hair: '#3a2a22', shirt: '#7a3b4f', shirt2: '#5e2a3b', pants: '#2b2530', shoe: '#2b2530', tie: '#ffd27a' },
  remote: { skin: '#f5d0b0', hair: '#6b4024', shirt: '#ffffff', shirt2: '#d6d3e0', pants: '#2f4a7a', shoe: '#2b2530' },
};
const VISITOR_PALS = [
  { skin: '#f5d0b0', hair: '#1f1a24', shirt: '#ffffff', shirt2: '#d6d3e0', pants: '#2f4a7a', shoe: '#2b2530', book: true },
  { skin: '#e8b98f', hair: '#6b4024', shirt: '#ff8fb1', shirt2: '#e86a98', pants: '#3b3f6b', shoe: '#2b2530' },
  { skin: '#f5d0b0', hair: '#6b4024', shirt: '#5ee0a0', shirt2: '#3fbf80', pants: '#3b3f6b', shoe: '#4a3020', hat: true },
  { skin: '#f2c9a6', hair: '#2b2530', shirt: '#ffd27a', shirt2: '#e0b04a', pants: '#2b2530', shoe: '#2b2530' },
  { skin: '#d9a77f', hair: '#1f1a24', shirt: '#7ee8ff', shirt2: '#4fc3e0', pants: '#3b3f6b', shoe: '#2b2530', bag: '#c2412d', bag2: '#8a2a1a' },
  { skin: '#f5d0b0', hair: '#9a9aa6', shirt: '#a99cff', shirt2: '#7f6fe0', pants: '#4a4458', shoe: '#2b2530' },
];
function human(o, dir, f) {
  const c = mk(16, 20), g = c.getContext('2d'), Y = 3;
  const r = (col, x, y, w, h) => R(g, col, x, y + Y, w, h);
  const side = dir === 'left' || dir === 'right';
  if (!side) { const lA = f === 1 ? 1 : 2, lB = f === 2 ? 1 : 2; r(o.pants, 5, 12, 2, lA); r(o.shoe, 5, 12 + lA, 2, 1); r(o.pants, 9, 12, 2, lB); r(o.shoe, 9, 12 + lB, 2, 1); }
  else if (f === 0) { r(o.pants, 6, 12, 4, 2); r(o.shoe, 6, 14, 4, 1); }
  else { r(o.pants, 5, 12, 2, 2); r(o.shoe, 4, 14, 3, 1); r(o.pants, 9, 12, 2, 2); r(o.shoe, 9, 14, 3, 1); }
  r(o.shirt, 4, 8, 8, 4); r(o.shirt2, 4, 11, 8, 1);
  const sw = f === 0 ? 0 : (f === 1 ? -1 : 1);
  if (!side) { r(o.shirt, 3, 8, 1, 3); r(o.skin, 3, 11 + (sw < 0 ? -1 : 0), 1, 1); r(o.shirt, 12, 8, 1, 3); r(o.skin, 12, 11 + (sw > 0 ? -1 : 0), 1, 1); }
  else { const ax = dir === 'right' ? 7 : 8; r(o.shirt2, ax, 8, 1, 3); r(o.skin, ax + (f ? (f === 1 ? 1 : -1) : 0), 11, 1, 1); }
  if (o.tie && dir === 'down') { r('#ffffff', 7, 8, 2, 1); r(o.tie, 7, 9, 2, 3); }
  if (o.bag && dir === 'up') { r(o.bag, 5, 8, 6, 4); r(o.bag2, 5, 11, 6, 1); r(o.bag2, 7, 9, 2, 1); }
  if (o.bag && dir === 'down') { r(o.bag2, 5, 8, 1, 3); r(o.bag2, 10, 8, 1, 3); }
  if (o.bag && side) { const bx = dir === 'right' ? 3 : 11; r(o.bag, bx, 8, 2, 4); r(o.bag2, bx, 11, 2, 1); }
  if (o.book && dir === 'down') { r('#e23b2b', 6, 9, 4, 3); r('#ffd27a', 6, 9, 4, 1); }
  r(o.skin, 4, 2, 8, 6);
  if (dir === 'down') {
    r(o.hair, 4, 1, 8, 2); r(o.hair, 3, 2, 1, 4); r(o.hair, 12, 2, 1, 4); r(o.hair, 4, 3, 3, 1); r(o.hair, 9, 3, 3, 1);
    r('#2a1f2a', 6, 5, 1, 2); r('#2a1f2a', 9, 5, 1, 2); r('#f4a08a', 5, 7, 1, 1); r('#f4a08a', 10, 7, 1, 1);
  } else if (dir === 'up') { r(o.hair, 4, 1, 8, 6); r(o.hair, 3, 2, 1, 4); r(o.hair, 12, 2, 1, 4); }
  else {
    const eye = dir === 'right' ? 9 : 6;
    r(o.hair, 4, 1, 8, 2); r(o.hair, dir === 'right' ? 4 : 9, 2, 3, 5); r(o.hair, dir === 'right' ? 3 : 12, 2, 1, 4);
    r('#2a1f2a', eye, 5, 1, 2); r(o.skin, dir === 'right' ? 12 : 3, 5, 1, 1); r('#f4a08a', dir === 'right' ? 10 : 5, 7, 1, 1);
  }
  if (o.cap) { r(o.cap, 3, 0, 10, 2); r(o.cap, 4, -1, 8, 1); if (dir === 'down') { r('#111111', 3, 2, 10, 1); r('#ffd27a', 7, 0, 2, 1); } }
  if (o.hat) { r('#e9d39a', 5, -1, 6, 1); r('#e9d39a', 3, 0, 10, 1); r('#e9d39a', 1, 1, 14, 1); r('#c9b06e', 1, 2, 14, 1); }
  return outline(c);
}

/* ---------- markup ---------- */
const MARKUP = `
<div class="mu-hud">
  <span class="mu-chip mu-loc" title="Bạn đang ở">📍 <b data-id="hLoc">Cầu Ký Ức</b></span>
  <button type="button" class="mu-chip mu-pts" data-id="hPts" title="Điểm khám phá — bấm để xem bảng xếp hạng">⭐ <b data-id="hPtsN">0</b> <span data-id="hRank">Khách tham quan</span></button>
  <button type="button" class="mu-chip mu-duck" data-id="hDuck" title="Tìm 10 em vịt — bấm để xem">🦆 <b data-id="hDuckN">0</b>/10</button>
  <span class="mu-sp"></span>
  <button type="button" class="mu-chip mu-on" data-id="hOn" hidden title="Người đang ở bảo tàng"><i></i><b data-id="hOnN">1</b>&nbsp;người ở đây</button>
  <button type="button" class="mu-ic" data-id="bChat" hidden title="Nói với mọi người (phím T)">💬 Nói</button>
  <a class="mu-ic mu-admin" data-id="bAdmin" hidden href="/museum/admin" target="_blank" rel="noopener">＋ Treo ảnh</a>
  <button type="button" class="mu-ic" data-id="bSound">Âm: Bật</button>
  <button type="button" class="mu-ic" data-id="bHelp" aria-label="Cách chơi">?</button>
</div>
<div class="mu-stage" data-id="stage" tabindex="0" aria-label="Knoworld Museum — game">
  <canvas data-id="cv"></canvas>
  <div class="mu-hint">Đi: ← ↑ ↓ → / WASD · Shift: chạy · Space: xem / nói chuyện</div>
  <div class="mu-banner" data-id="banner"><b></b><span></span></div>
  <div class="mu-sleep" data-id="sleep" hidden><span>Nhấp vào đây để tiếp tục tham quan</span></div>
  <div class="mu-dlg" data-id="dlg"><div class="who"></div><div class="txt"></div><div class="choices"></div><div class="more">▼</div></div>
  <div class="mu-modal" data-id="modal"></div>
  <div class="mu-toast" data-id="toast"></div>
  <div class="mu-pad">
    <div class="dpad"><button type="button" data-d="up" aria-label="Lên">▲</button><button type="button" data-d="left" aria-label="Trái">◀</button><button type="button" data-d="right" aria-label="Phải">▶</button><button type="button" data-d="down" aria-label="Xuống">▼</button></div>
    <div class="ab"><button type="button" class="a" data-id="tA">A</button><button type="button" class="b" data-id="tB">B</button></div>
  </div>
</div>`;

function ensureFont() {
  if (document.getElementById('kw-vt323')) return;
  const l = document.createElement('link'); l.id = 'kw-vt323'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
  document.head.appendChild(l);
}

export function mountMuseum(root, opts = {}) {
  ensureFont();
  root.innerHTML = MARKUP;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);
  const stageEl = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  const dlg = $('dlg'), modal = $('modal');
  const offs = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  let dead = false;
  const isAdmin = () => !!(opts.isAdmin && opts.isAdmin());

  /* ---------- state ---------- */
  let st = normalizeState(null);
  try { st = normalizeState(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { /* ignore */ }
  function save(remote = true) {
    st.ts = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ }
    if (remote && opts.save) opts.save(st);
  }
  function rollDuckDay() { const d = vnDay(); if (st.duckDay !== d) { st.duckDay = d; st.ducks = []; save(false); } }
  rollDuckDay();
  if (opts.load) {
    Promise.resolve(opts.load()).then((remote) => {
      if (dead || !remote) return;
      const r = normalizeState(remote);
      if (r.ts > st.ts) { st = r; rollDuckDay(); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } hud(); placeDucks(); }
      else if (st.ts > r.ts && opts.save) opts.save(st);
    }).catch(() => {});
  }

  /* ---------- sound ---------- */
  let AC = null;
  const ac = () => { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* ignore */ } } return AC; };
  function tone(freq, dur, type = 'sine', vol = 0.2, when = 0) {
    if (!st.sound) return; const a = ac(); if (!a) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    blip() { tone(660, 0.06, 'square', 0.06); },
    door() { tone(220, 0.12, 'triangle', 0.15); tone(330, 0.18, 'triangle', 0.1, 0.08); },
    view() { tone(988, 0.08, 'sine', 0.12); tone(1318, 0.14, 'sine', 0.08, 0.06); },
    chime() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.14, i * 0.11)); },
    bad() { tone(160, 0.14, 'square', 0.08); tone(120, 0.2, 'square', 0.06, 0.1); },
    key() { tone(880, 0.04, 'square', 0.05); },
    quack() { tone(520, 0.07, 'sawtooth', 0.06); tone(380, 0.1, 'sawtooth', 0.05, 0.07); },
    pts() { tone(1046, 0.06, 'square', 0.04); tone(1568, 0.09, 'square', 0.04, 0.05); },
  };

  /* ---------- exhibits ---------- */
  let photos = [];          // ảnh thật công khai
  let lovePhotos = null;    // null = chưa mở khóa
  let loveOpen = false;
  const items = {};         // room -> [{ key, title, ..., url | art }]
  function rebuildItems() {
    for (const room of ['lobby', 'class', 'event', 'award', 'lens', 'love']) {
      let list;
      if (room === 'lobby') list = SAMPLES.lobby.map((s) => ({ ...s, key: 's' + s.id, sample: true }));
      else if (room === 'love') {
        if (!loveOpen) list = [];
        else list = lovePhotos && lovePhotos.length ? lovePhotos.map((p) => ({ ...p, key: 'p' + p.id.slice(0, 8) })) : SAMPLES.love.map((s) => ({ ...s, key: 's' + s.id, sample: true }));
      } else {
        const real = photos.filter((p) => p.room === room);
        list = real.length ? real.map((p) => ({ ...p, key: 'p' + p.id.slice(0, 8) })) : SAMPLES[room].map((s) => ({ ...s, key: 's' + s.id, sample: true }));
      }
      items[room] = list;
    }
  }
  const imgs = new Map();
  let rebuildT = null;
  function imgOf(url) {
    let e = imgs.get(url);
    if (!e) {
      e = { img: new Image(), ok: false };
      e.img.decoding = 'async';
      e.img.onload = () => { e.ok = true; clearTimeout(rebuildT); rebuildT = later(() => buildInStatic(), 120); };
      e.img.src = url; imgs.set(url, e);
    }
    return e;
  }
  function drawItemThumb(g, it, x, y, w, h) {
    if (it.url) {
      const e = imgOf(it.url);
      if (e.ok) {
        const iw = e.img.naturalWidth, ih = e.img.naturalHeight, sc = Math.max(w / iw, h / ih), sw = w / sc, sh = h / sc;
        g.imageSmoothingEnabled = true; g.drawImage(e.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); g.imageSmoothingEnabled = false;
      } else { R(g, '#3b3350', x, y, w, h); R(g, '#5b4a6e', x + w / 2 - 2, y + h / 2 - 1, 4, 2); }
      return;
    }
    g.imageSmoothingEnabled = true; g.drawImage(sampleArt(it), x, y, w, h); g.imageSmoothingEnabled = false;
  }
  const itemSrc = (it) => (it.url ? it.url : sampleArt(it).toDataURL());

  /* ---------- maps + static layers ---------- */
  const OUT = buildOutMap();
  let IN = null;
  const layers = { out: null, in: null };
  function prep(m) {
    const c = { stat: mk(m.W * T, m.H * T), over: mk(m.W * T, m.H * T) };
    const sg = c.stat.getContext('2d'), og = c.over.getContext('2d'); sg.imageSmoothingEnabled = og.imageSmoothingEnabled = false;
    return [c, sg, og];
  }
  function buildOutStatic() {
    const m = OUT, [c, sg, og] = prep(m);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const px = x * T, py = y * T, t = m.tile[y][x], b = t === SOLID ? m.base[y][x] : t;
      if (t === TR) drawTree(sg, px, py, x, y);
      else if (b === WATER) drawWater(sg, px, py, x, y, m);
      else if (b === RAIL) drawRail(sg, px, py, x, y, m);
      else if (b === PLANK) { const horiz = y === 10 || y === 11; if ((!horiz && y <= 18) || (horiz && x <= 29)) drawSand(sg, px, py, x, y); drawPlank(sg, px, py, x, y, horiz); }
      else if (b === SAND) drawSand(sg, px, py, x, y);
      else if (b === STONE || b === DOOR) drawStone(sg, px, py);
      else if (b === FL) drawFlower(sg, px, py, x, y);
      else drawGrass(sg, px, py, x, y);
    }
    drawMuseum(sg, 9 * T, 1 * T); drawFountain(sg, 10 * T, 13 * T); drawBenchOut(sg, 11 * T, 11 * T);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const o = m.obj[y][x], px = x * T, py = y * T;
      if (o === 'lamp') { drawLamp(sg, px, py); drawLamp(og, px, py, 'top'); }
      if (o === 'sign') { drawSignOut(sg, px, py); drawSignOut(og, px, py, 'top'); }
      if (o === 'duckboard') { drawSignOut(sg, px, py, null, true); drawSignOut(og, px, py, 'top', true); }
    }
    layers.out = c;
  }
  function buildInStatic() {
    if (!IN) return;
    const m = IN, [c, sg, og] = prep(m);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const px = x * T, py = y * T, b = m.base[y][x];
      if (b === WALLI) drawWallTile(sg, px, py, x, y, m);
      else if (b === WOOD) drawWood(sg, px, py, x, y);
      else if (b === MARBLE) drawMarble(sg, px, py, x, y);
      else if (b === CARPET) drawCarpet(sg, px, py, x, y, m);
      else if (b === PINK) drawPink(sg, px, py, x, y);
      else if (b === DOOR) { drawCarpet(sg, px, py, x, y, m); R(sg, 'rgba(255,214,140,.35)', px, py, T, T); }
    }
    R(sg, '#ffe39a', 17 * T + 12, 32 * T + 6, 8, 2); R(sg, '#ffe39a', 17 * T + 14, 32 * T + 8, 4, 2);
    drawBanner(sg, 16 * T, 0); drawMapFrame(sg, 21 * T, 19 * T);
    if (!loveOpen) drawHeartDoor(sg, 5 * T, 11 * T);
    else {
      for (const x of [4, 7]) R(og, '#e86a98', x * T + (x === 4 ? 12 : 0), 11 * T, 4, 32);
      R(og, '#e86a98', 4 * T + 12, 11 * T - 2, 40, 4);
      for (let i = 0; i < 6; i++) heartPx(og, i % 2 ? '#ffd1e0' : '#ff5a8a', 4 * T + 12 + i * 6, 11 * T - 4);
    }
    for (const sl of m.slots) {
      const it = items[sl.room][sl.i], px = sl.x * T, love = sl.room === 'love';
      if (sl.k === 'frame') { const [x, y, w, h] = drawFrameBox(sg, px, (sl.y - 1) * T, love); drawItemThumb(sg, it, x, y, w, h); }
      else if (sl.k === 'panel') {
        drawPanel(sg, px, sl.y * T); const [x, y, w, h] = drawPanel(og, px, sl.y * T, 'top');
        drawItemThumb(og, it, x, y, w, h);
      } else {
        drawPedBase(sg, px, sl.y * T, sl.w); const [x, y, w, h] = drawPedTop(og, px, sl.y * T, sl.w);
        drawItemThumb(og, it, x, y, w, h);
      }
    }
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) {
      const o = m.obj[y][x], px = x * T, py = y * T; if (!o || m.tile[y][x] !== SOLID) continue;
      if (x > 0 && m.obj[y][x - 1] === o) continue;
      if (o === 'plant') { drawPlant(sg, px, py); drawPlant(og, px, py, 'top'); }
      else if (o === 'desk') { drawDesk(sg, px, py); drawDesk(og, px, py, 'top'); }
      else if (o === 'guest') { drawLectern(sg, px, py); drawLectern(og, px, py, 'top'); }
      else if (o.startsWith('album:')) { const col = ROOMS[o.slice(6)].color; drawLectern(sg, px, py, null, col); drawLectern(og, px, py, 'top', col); }
      else if (o === 'dir') { drawStand(sg, px, py); drawStand(og, px, py, 'top', ['#a99cff', '#ffd27a', '#5ee0a0']); }
      else if (o === 'rank') { drawStand(sg, px, py); drawStand(og, px, py, 'top', ['#ffd27a', '#c6bfff', '#ff8fb1']); }
      else if (o === 'bench') drawBench(sg, px, py);
      else if (o === 'lovec') { drawLoveCounter(sg, px, py); drawLoveCounter(og, px, py, 'top'); }
      else if (o === 'cam') { drawCamera(sg, px, py); drawCamera(og, px, py, 'top'); }
    }
    layers.in = c;
  }
  function rebuildIn() {
    rebuildItems();
    IN = buildInMap(items, loveOpen);
    buildInStatic();
    if (M && M.id === 'in') { M = IN; unstick(player); for (const v of visitors) if (v.m === 'in' && isSolid(IN.tile[v.ty][v.tx])) v.gone = true; }
    placeDucks();
  }

  /* ---------- entities ---------- */
  const ent = (kind, tx, ty, dir = 'down') => ({ kind, tx, ty, x: tx * T, y: ty * T, dir, moving: false, prog: 0, f: 0, alt: false, nx: tx, ny: ty, dur: 0.2, timer: 1 + Math.random() * 2 });
  const fromTemple = opts.from === 'temple';
  const player = ent('player', fromTemple ? 34 : 15, fromTemple ? 10 : 26, fromTemple ? 'left' : 'up');
  let M = OUT;
  const guard = Object.assign(ent('guard', 14, 9, 'down'), { m: 'out' });
  const curator = Object.assign(ent('curator', 14, 22, 'down'), { m: 'in' });
  const statics = [guard, curator];
  const visitors = [];
  const remotes = new Map();
  let ducks = []; // { id, name, m, tx, ty, found }
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const opposite = (d) => ({ up: 'down', down: 'up', left: 'right', right: 'left' })[d];
  const here = (e) => (e.m || 'out') === M.id;
  function blocker(x, y, self) {
    for (const e of [player, ...statics, ...visitors]) {
      if (e === self || e.gone) continue;
      if (e !== player && !here(e)) continue;
      if (self.kind === 'visitor' && e.kind === 'visitor') continue;
      if ((e.tx === x && e.ty === y) || (e.moving && e.nx === x && e.ny === y)) return e;
    }
    for (const d of ducks) if (!d.found && d.m === M.id && d.tx === x && d.ty === y) return d;
    return null;
  }
  const inMap = (x, y) => x >= 0 && y >= 0 && x < M.W && y < M.H;
  const walkable = (x, y, self, ghost) => inMap(x, y) && !isSolid(M.tile[y][x]) && (ghost || !blocker(x, y, self));
  function startMove(e, d, dur, ghost) {
    const [dx, dy] = DIRS[d]; e.dir = d;
    if (!walkable(e.tx + dx, e.ty + dy, e, ghost)) return false;
    e.nx = e.tx + dx; e.ny = e.ty + dy; e.moving = true; e.prog = 0; e.dur = dur; e.alt = !e.alt; return true;
  }
  function stepEnt(e, dt) {
    if (!e.moving) return false;
    e.prog += dt / e.dur;
    if (e.prog >= 1) { e.prog = 1; e.moving = false; e.tx = e.nx; e.ty = e.ny; }
    e.x = (e.tx + (e.nx - e.tx) * e.prog) * T; e.y = (e.ty + (e.ny - e.ty) * e.prog) * T;
    if (!e.moving) { e.x = e.tx * T; e.y = e.ty * T; e.f = 0; return true; }
    e.f = e.prog < 0.5 ? (e.alt ? 1 : 2) : 0; return false;
  }
  function teleport(e, x, y, d) { Object.assign(e, { tx: x, ty: y, nx: x, ny: y, x: x * T, y: y * T, moving: false, f: 0 }); if (d) e.dir = d; }
  function unstick(e) { // ô hiện tại bị đặt vật lên -> nhảy sang ô trống gần nhất
    if (!isSolid(M.tile[e.ty][e.tx])) return;
    for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = e.tx + dx, y = e.ty + dy; if (inMap(x, y) && !isSolid(M.tile[y][x])) { teleport(e, x, y); return; }
    }
  }
  function findPath(m, sx, sy, gx, gy, avoid, noLove) {
    if (sx === gx && sy === gy) return [];
    const W = m.W, H = m.H, block = new Set(statics.filter((e) => e.m === m.id).map((e) => e.ty * W + e.tx));
    for (const d of ducks) if (!d.found && d.m === m.id) block.add(d.ty * W + d.tx);
    if (avoid) block.add(avoid);
    const prev = new Int32Array(W * H).fill(-1), start = sy * W + sx, goal = gy * W + gx, q = [start];
    prev[start] = start;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi]; if (cur === goal) break;
      const cx = cur % W, cy = (cur - cx) / W;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[k] !== -1 || isSolid(m.tile[ny][nx]) || (block.has(k) && k !== goal)) continue;
        if (noLove && m.id === 'in' && inLoveZone(nx, ny)) continue;
        prev[k] = cur; q.push(k);
      }
    }
    if (prev[goal] === -1) return null;
    const path = []; for (let k = goal; k !== start; k = prev[k]) path.push([k % W, Math.floor(k / W)]);
    return path.reverse();
  }

  /* ---------- particles ---------- */
  const fx = [], dust = [], drops = [];
  const floatTxt = (txt, x, y, col = '#ffd27a') => fx.push({ txt, x, y, t: 0, col });
  const puff = (x, y, col = 'rgba(255,255,255,') => { for (let i = 0; i < 8; i++) dust.push({ x: x + Math.random() * 12, y: y + 4 + Math.random() * 8, vx: (Math.random() - 0.5) * 34, vy: -14 - Math.random() * 16, t: 0, col }); };

  /* ---------- UI ---------- */
  const held = [];
  let shift = false, turnT = 0, active = true, pushT = 0;
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  let trans = null;
  const ui = {
    mode: null, typing: false, full: '', shown: 0, resolve: null, choices: null, sel: 0, queue: [], onModalKey: null,
    busy() { return !!this.mode || !!trans; },
    onKey(e) {
      if (this.mode === 'dialog') {
        if (this.choices && !this.typing) {
          if (e.key === 'ArrowUp' || e.key === 'w') { this.sel = (this.sel + this.choices.length - 1) % this.choices.length; this.paintChoices(); sfx.blip(); return true; }
          if (e.key === 'ArrowDown' || e.key === 's') { this.sel = (this.sel + 1) % this.choices.length; this.paintChoices(); sfx.blip(); return true; }
          if (e.key === 'Escape') { this.pick(this.choices.length - 1); return true; }
        }
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Escape') { if (!e.repeat) this.advance(); return true; }
        return !!KEYMAP[e.key];
      }
      if (this.mode === 'modal') {
        if (e.key === 'Escape') { closeModal(); return true; }
        if (this.onModalKey && this.onModalKey(e)) return true;
        return !!KEYMAP[e.key] || e.key === ' ';
      }
      return false;
    },
    advance() {
      if (this.typing) { this.shown = this.full.length; return; }
      if (this.choices) { this.pick(this.sel); return; }
      if (this.queue.length) { this.show(this.queue.shift()); return; }
      this.close(null);
    },
    show(text) { this.full = text; this.shown = 0; this.typing = true; dlg.querySelector('.choices').innerHTML = ''; dlg.querySelector('.more').style.display = 'none'; },
    tick(dt) {
      if (this.mode !== 'dialog' || !this.typing) return;
      this.shown = Math.min(this.full.length, this.shown + dt * 55);
      dlg.querySelector('.txt').textContent = this.full.slice(0, Math.floor(this.shown));
      if (this.shown >= this.full.length) { this.typing = false; if (!this.queue.length && this.choices) this.paintChoices(); else dlg.querySelector('.more').style.display = 'block'; }
    },
    paintChoices() {
      const box = dlg.querySelector('.choices'); box.innerHTML = '';
      this.choices.forEach((c, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = c; if (i === this.sel) b.className = 'on';
        b.onclick = (ev) => { ev.stopPropagation(); this.pick(i); };
        b.onmouseenter = () => { this.sel = i; [...box.children].forEach((x, j) => { x.className = j === i ? 'on' : ''; }); };
        box.appendChild(b);
      });
    },
    pick(i) { sfx.blip(); this.close(i); },
    close(v) { this.mode = null; dlg.style.display = 'none'; const r = this.resolve; this.resolve = null; this.choices = null; if (r) r(v); },
  };
  on(dlg, 'click', () => { if (!ui.choices || ui.typing) ui.advance(); });
  function say(lines, o = {}) {
    lines = [].concat(lines);
    return new Promise((res) => {
      ui.mode = 'dialog'; ui.resolve = res; ui.choices = o.choices || null; ui.sel = 0; ui.queue = lines.slice(1);
      const who = dlg.querySelector('.who'); who.textContent = o.who || ''; who.style.display = o.who ? 'block' : 'none';
      dlg.style.display = 'block'; ui.show(lines[0]); held.length = 0;
    });
  }
  let modalKind = null;
  function openModal(html, onKey, kind = null, cls = '') {
    ui.mode = 'modal'; ui.onModalKey = onKey || null; modalKind = kind;
    modal.innerHTML = `<div class="mu-panel ${cls}">${html}<button type="button" class="x" aria-label="Đóng">✕</button></div>`;
    modal.style.display = 'flex'; modal.querySelector('.x').onclick = closeModal; held.length = 0;
    if (online) sendPos(true);
  }
  function closeModal() { modalKind = null; ui.mode = null; ui.onModalKey = null; modal.style.display = 'none'; modal.innerHTML = ''; if (online) sendPos(true); }
  on(modal, 'pointerdown', (e) => { if (e.target === modal) closeModal(); });
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = later(() => t.classList.remove('on'), 2800); }
  let bannerT;
  function banner(room) {
    const b = $('banner'), r = ROOMS[room]; if (!r) return;
    b.querySelector('b').textContent = r.name.toUpperCase(); b.querySelector('b').style.color = r.color; b.querySelector('span').textContent = r.sub;
    b.classList.add('on'); clearTimeout(bannerT); bannerT = later(() => b.classList.remove('on'), 2200);
  }

  /* ---------- điểm + HUD ---------- */
  let curRoom = fromTemple ? 'isle' : 'bridge';
  const locName = (r) => (r === 'bridge' ? 'Cầu Ký Ức' : r === 'tbridge' ? 'Cầu sang chùa' : r === 'isle' ? 'Đảo Bảo Tàng' : ROOMS[r] ? ROOMS[r].name : '—');
  function hud() {
    $('hLoc').textContent = locName(curRoom);
    $('hPtsN').textContent = st.pts; $('hRank').textContent = rankOf(st.pts);
    $('hDuckN').textContent = st.ducks.length;
    $('bSound').textContent = `Âm: ${st.sound ? 'Bật' : 'Tắt'}`;
    const a = $('bAdmin'); a.hidden = !isAdmin();
  }
  function addPts(n, label) {
    if (!n) return;
    const before = rankOf(st.pts);
    st.pts = Math.min(99999, st.pts + n); save(); hud(); sfx.pts();
    floatTxt(`+${n}`, player.x + 8, player.y - 6);
    if (label) toast(`${label} +${n} điểm khám phá`);
    const after = rankOf(st.pts);
    if (after !== before) later(() => { toast(`Lên hạng: ${after}! ⭐`); sfx.chime(); }, 1200);
  }
  on($('bSound'), 'click', () => { st.sound = !st.sound; save(false); hud(); });
  on($('bHelp'), 'click', () => { setActive(true); openHelp(); });
  on($('hPts'), 'click', () => { setActive(true); openRank(); });
  on($('hDuck'), 'click', () => { setActive(true); openDucks(); });
  on($('bAdmin'), 'click', () => { setActive(false); });

  /* ---------- vịt ---------- */
  const duckSprites = {};
  const duckSprite = (id, f) => { const k = id + f; if (!duckSprites[k]) duckSprites[k] = makeDuck(id, f); return duckSprites[k]; };
  const DUCK_AREAS = [['out', 'isle'], ['out', 'isle'], ['out', 'isle'], ['in', 'lobby'], ['in', 'class'], ['in', 'event'], ['in', 'award'], ['in', 'lens'], ['in', 'class'], ['in', 'event']];
  // Bản đồ tham chiếu: mọi khung/vách/bệ đều có ảnh -> chỗ trốn của vịt không đổi khi ảnh tải xong.
  const DUCK_REF = buildInMap(Object.fromEntries(Object.keys(SLOTS).map((k) => [k, SLOTS[k].map(() => ({}))])), false);
  function duckSpots(m0, area) {
    const m = m0.id === 'in' ? DUCK_REF : m0;
    const a = m.areas.find((r) => r.id === area), out = [];
    if (!a) return out;
    const busy = new Set();
    if (m.id === 'in') for (const sl of m.slots) for (let i = 0; i < sl.w; i++) busy.add((sl.y + 1) * m.W + sl.x + i);
    for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
      const t = m.tile[y][x];
      if (isSolid(t) || t === DOOR || t === STONE || t === PLANK || t === CARPET) continue;
      if (m.id === 'out' && (y >= 19 || x >= 27)) continue;
      if (m.id === 'in' && (inLoveZone(x, y) || x === 11 || x === 24 || (y >= 11 && y <= 12))) continue;
      if (busy.has(y * m.W + x)) continue;
      if (statics.some((e) => e.m === m.id && Math.abs(e.tx - x) + Math.abs(e.ty - y) <= 1)) continue;
      const sol = (nx, ny) => nx < 0 || ny < 0 || nx >= m.W || ny >= m.H || isSolid(m.tile[ny][nx]);
      const u = sol(x, y - 1), dn = sol(x, y + 1), l = sol(x - 1, y), r = sol(x + 1, y), solidN = u + dn + l + r;
      if (solidN >= 1 && solidN <= 2 && !(u && dn) && !(l && r)) out.push([x, y]);
    }
    return out;
  }
  function placeDucks() {
    if (!IN) return;
    rollDuckDay();
    const rnd = seeded(hashStr('ducks' + st.duckDay));
    const order = DUCKS.map((d) => d).sort(() => rnd() - 0.5);
    const used = new Set();
    ducks = order.map((d, i) => {
      const [mid, area] = DUCK_AREAS[i], m = mid === 'out' ? OUT : IN;
      const spots = duckSpots(m, area).filter(([x, y]) => !used.has(`${mid}${x},${y}`) && ![...used].some((u) => { const [um, rest] = [u.slice(0, mid.length), u.slice(mid.length)]; if (um !== mid) return false; const [ux, uy] = rest.split(',').map(Number); return Math.abs(ux - x) + Math.abs(uy - y) < 4; }));
      if (!spots.length) return null;
      const [x, y] = spots[Math.floor(rnd() * spots.length)];
      used.add(`${mid}${x},${y}`);
      return { ...d, kind: 'duck', m: mid, tx: x, ty: y, x: x * T, y: y * T, found: st.ducks.includes(d.id), ph: rnd() * 6, quackT: 2 + rnd() * 6 };
    }).filter(Boolean);
    hud();
  }
  function findDuck(d) {
    if (d.found) return;
    d.found = true; st.ducks.push(d.id); st.duckEver[d.id] = 1;
    sfx.quack(); puff(d.x, d.y);
    let n = PTS.duck;
    const all = st.ducks.length >= DUCKS.length;
    save(); hud();
    toast(`Tìm thấy ${d.name}! (${st.ducks.length}/10)`);
    if (all) n += PTS.ducksAll;
    addPts(n);
    if (all) later(() => { sfx.chime(); say(['🦆🦆🦆 Bạn đã tìm đủ 10 em vịt hôm nay!', `Thưởng thêm ${PTS.ducksAll} điểm khám phá. Ngày mai vịt sẽ trốn ở chỗ mới nhé.`], { who: 'Tìm 10 em vịt' }); }, 600);
  }
  function openDucks() {
    const hint = (d) => (d.m === 'out' ? 'Ngoài đảo' : ROOMS[(IN.areas.find((a) => d.tx >= a.x0 && d.tx <= a.x1 && d.ty >= a.y0 && d.ty <= a.y1) || {}).id]?.name || 'Trong bảo tàng');
    const cells = DUCKS.map((dd) => {
      const d = ducks.find((x) => x.id === dd.id), found = st.ducks.includes(dd.id);
      const img = duckSprite(dd.id, 0).toDataURL();
      return `<div class="mu-dk ${found ? 'ok' : ''}"><img src="${img}" alt=""><b>${found ? esc(dd.name) : '???'}</b><small>${found ? 'Đã tìm thấy' : d ? 'Gợi ý: ' + esc(hint(d)) : 'Đang trốn'}</small></div>`;
    }).join('');
    openModal(`<h2>Tìm 10 em vịt 🦆</h2><p class="sub">Mỗi ngày (giờ VN) 10 em vịt trốn ở chỗ mới quanh đảo và trong bảo tàng. Đứng cạnh vịt rồi bấm Space để bắt. +${PTS.duck} điểm mỗi em, tìm đủ 10 em thưởng thêm +${PTS.ducksAll}.</p>
      <div class="mu-ducks">${cells}</div><p class="note">Mẹo: lại gần vịt sẽ nghe tiếng “quạc”.</p>`, null, 'duck');
  }

  /* ---------- khách tham quan ra vào ---------- */
  const viewSpots = () => (IN ? IN.slots.filter((s) => s.room !== 'love').map((s) => ({ x: s.x + (s.w > 1 && Math.random() < 0.5 ? 1 : 0), y: s.y + 1, face: 'up' })) : []);
  const OUT_POIS = [{ x: 12, y: 15, face: 'up' }, { x: 19, y: 15, face: 'up' }, { x: 11, y: 12, face: 'up' }, { x: 21, y: 12, face: 'down' }, { x: 9, y: 14, face: 'right' }, { x: 26, y: 13, face: 'down' }];
  let vid = 0;
  function makeVisitor(mid, tx, ty, from) {
    const v = ent('visitor', tx, ty, 'up');
    v.m = mid; v.id = vid++; v.pal = pickOne(VISITOR_PALS); v.palKey = 'v' + VISITOR_PALS.indexOf(v.pal); v.who = pickOne(VISITOR_WHO);
    v.goals = [];
    if (mid === 'out') {
      if (Math.random() < 0.6) v.goals.push('poi');
      v.goals.push(from === 'door' ? pickOne(['exitS', 'exitS', 'exitE']) : 'door');
    } else {
      const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) v.goals.push('view');
      if (Math.random() < 0.3) v.goals.splice(1, 0, 'lobby');
      v.goals.push('exit');
    }
    v.path = null; v.goal = null; v.wait = 0; v.blockT = 0;
    visitors.push(v); nextGoal(v); return v;
  }
  function nextGoal(v) {
    v.arrived = false; v.look = false;
    const g = v.goals.shift();
    if (!g) { v.gone = true; return; }
    const m = v.m === 'out' ? OUT : IN;
    let tgt;
    if (g === 'poi') tgt = pickOne(OUT_POIS);
    else if (g === 'door') { const [x, y] = pickOne(OUT_DOOR); tgt = { x, y, face: 'up' }; }
    else if (g === 'exitS') { const [x, y] = pickOne(OUT_EXIT_S); tgt = { x, y, face: 'down' }; }
    else if (g === 'exitE') { const [x, y] = pickOne(OUT_EXIT_E); tgt = { x, y, face: 'right' }; }
    else if (g === 'view') { const s = viewSpots(); if (!s.length) { nextGoal(v); return; } tgt = pickOne(s); }
    else if (g === 'lobby') tgt = pickOne([{ x: 14, y: 24, face: 'up' }, { x: 21, y: 24, face: 'up' }, { x: 13, y: 21, face: 'up' }]);
    else { const [x, y] = pickOne(IN_DOOR); tgt = { x, y, face: 'down' }; }
    v.goal = { kind: g, ...tgt };
    v.path = findPath(m, v.tx, v.ty, tgt.x, tgt.y, null, true);
    if (!v.path) nextGoal(v);
  }
  function arrive(v) {
    const g = v.goal; v.arrived = true; v.dir = g.face;
    if (['door', 'exitS', 'exitE', 'exit'].includes(g.kind)) { v.gone = true; return; }
    v.wait = g.kind === 'view' ? 3 + Math.random() * 4 : 2 + Math.random() * 3; v.look = g.kind === 'view';
  }
  function updVisitor(v, dt) {
    const m = v.m === 'out' ? OUT : IN;
    stepEnt(v, dt);
    if (v.moving || v.gone) return;
    if (v.talkT > 0) { v.talkT -= dt; return; }
    if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0) nextGoal(v); return; }
    if (v.arrived) { nextGoal(v); return; }
    if (!v.path) return;
    if (!v.path.length) { arrive(v); return; }
    const [nx, ny] = v.path[0], d = nx > v.tx ? 'right' : nx < v.tx ? 'left' : ny > v.ty ? 'down' : 'up';
    if (v.m !== M.id) { // ở bản đồ khác: đi "ảo", không cần né
      const [dx, dy] = DIRS[d]; v.dir = d;
      if (!isSolid(m.tile[ny][nx])) { v.nx = v.tx + dx; v.ny = v.ty + dy; v.moving = true; v.prog = 0; v.dur = 0.3; v.alt = !v.alt; v.path.shift(); }
      else nextGoal(v);
      return;
    }
    const b = blocker(nx, ny, v);
    if (b === player && v.path.length === 1) { v.goals.unshift(v.goal.kind); nextGoal(v); return; }
    if (startMove(v, d, 0.3, v.blockT > 3 && b !== player)) { v.path.shift(); v.blockT = 0; v.repathed = false; return; }
    v.dir = d; v.blockT += dt;
    if (v.blockT > 5) { v.blockT = 0; v.repathed = false; nextGoal(v); return; }
    if (v.blockT > 1.2 && !v.repathed) {
      v.repathed = true;
      const p = findPath(m, v.tx, v.ty, v.goal.x, v.goal.y, ny * m.W + nx, true);
      if (p) { v.path = p; v.blockT = 0; }
    }
  }
  const isNight = () => { const h = vnNow().getUTCHours(); return h >= 18 || h < 6; };
  let spawnT = 1.5;
  function seedVisitors() {
    for (let i = 0; i < 3; i++) { const [x, y] = pickOne(OUT_EXIT_S); makeVisitor('out', x, y - 2 - i * 2, 'bridge'); }
    for (let i = 0; i < 4; i++) { const s = pickOne(viewSpots()); if (s && !blockerIn(s.x, s.y)) { const v = makeVisitor('in', s.x, s.y, 'door'); v.goals.unshift('view'); } }
  }
  const blockerIn = (x, y) => visitors.some((v) => v.m === 'in' && v.tx === x && v.ty === y);
  function updVisitors(dt) {
    for (const v of visitors) updVisitor(v, dt);
    for (let i = visitors.length - 1; i >= 0; i--) if (visitors[i].gone) visitors.splice(i, 1);
    spawnT -= dt;
    if (spawnT > 0) return;
    spawnT = 2.5 + Math.random() * 4;
    const night = isNight(), nOut = visitors.filter((v) => v.m === 'out').length, nIn = visitors.length - nOut;
    const r = Math.random();
    if (r < 0.5 && nOut < (night ? 2 : 6)) {
      const src = pickOne(['bridge', 'bridge', 'east', 'door']), [x, y] = src === 'bridge' ? pickOne(OUT_EXIT_S) : src === 'east' ? pickOne(OUT_EXIT_E) : pickOne(OUT_DOOR);
      if (!(M === OUT && player.tx === x && player.ty === y)) makeVisitor('out', x, y, src === 'door' ? 'door' : 'bridge');
    } else if (nIn < (night ? 3 : 8)) {
      const [x, y] = pickOne(IN_DOOR);
      if (!(M === IN && player.tx === x && player.ty === y)) makeVisitor('in', x, y, 'door');
    }
  }

  /* ---------- tương tác ---------- */
  const facing = () => { const [dx, dy] = DIRS[player.dir]; return [player.tx + dx, player.ty + dy]; };
  const remoteAt = (x, y) => [...remotes.values()].find((e) => e.m === M.id && e.tx === x && e.ty === y && !e.moving);
  function targetAt(x, y) {
    if (remoteAt(x, y)) return 'remote';
    const dk = ducks.find((d) => !d.found && d.m === M.id && d.tx === x && d.ty === y); if (dk) return 'duck';
    const v = visitors.find((e) => e.m === M.id && e.tx === x && e.ty === y && !e.moving); if (v) return 'visitor';
    const n = statics.find((e) => e.m === M.id && e.tx === x && e.ty === y); if (n) return n.kind;
    if (!inMap(x, y)) return null;
    const o = M.obj[y][x]; if (o) return o;
    if (M === OUT && (M.tile[y][x] === WATER || M.tile[y][x] === RAIL)) return 'water';
    return null;
  }
  const canAct = (t) => !!t && (!!ACT[t] || t.startsWith('s:') || t.startsWith('album:'));
  function markSeen(it, room) {
    if (st.seen[it.key]) return;
    st.seen[it.key] = 1;
    let n = PTS.view, label = null;
    const list = items[room];
    if (list.length && list.every((x) => st.seen[x.key]) && !st.done[room]) { st.done[room] = 1; n += PTS.roomDone; label = `Xem hết ${ROOMS[room].name}!`; }
    save(); addPts(n, label);
  }
  function openExhibit(room, i) {
    const list = items[room], it = list[i]; if (!it) return;
    markSeen(it, room); sfx.view();
    const r = ROOMS[room], love = room === 'love', admin = isAdmin() && room !== 'lobby';
    const meta = [it.taken, it.place].filter(Boolean).map(esc).join(' · ');
    openModal(`
      <div class="lb-top"><span class="room" style="color:${r.color}">${esc(r.name)}</span><span>${i + 1} / ${list.length}</span>${it.tag ? `<span class="tag">${esc(it.tag)}</span>` : ''}</div>
      <div class="lb-img"><img src="${esc(itemSrc(it))}" class="${it.url ? '' : 'pix'}" alt="${esc(it.title)}">${it.sample ? '<span class="ribbon">Ảnh minh họa</span>' : ''}
        ${list.length > 1 ? '<button type="button" class="nav l" data-id="lbP" aria-label="Trước">‹</button><button type="button" class="nav r" data-id="lbN" aria-label="Sau">›</button>' : ''}</div>
      <div class="lb-dots">${list.map((x, j) => `<i class="${j === i ? 'on' : ''} ${st.seen[x.key] ? 'seen' : ''}"></i>`).join('')}</div>
      <div class="lb-body"><h3>${esc(it.title || 'Không tiêu đề')}</h3>${meta ? `<div class="meta">${meta}</div>` : ''}${it.caption ? `<p>${esc(it.caption)}</p>` : ''}</div>
      <div class="mu-row">${admin ? `<a class="mu-btn" href="/museum/admin?room=${room}" target="_blank" rel="noopener">＋ Thêm / sửa ảnh phòng này</a>` : ''}<button type="button" class="mu-btn ${love ? 'pink' : 'gold'}" data-id="lbOk">Xem tiếp</button></div>`,
    (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') { go(-1); return true; } if (e.key === 'ArrowRight' || e.key === 'd') { go(1); return true; } if (e.key === ' ' || e.key === 'Enter') { closeModal(); return true; } return false; },
    'view', 'wide' + (love ? ' love' : ''));
    function go(dx) { openExhibit(room, (i + dx + list.length) % list.length); }
    const p = $('lbP'), n = $('lbN'); if (p) p.onclick = () => go(-1); if (n) n.onclick = () => go(1);
    $('lbOk').onclick = closeModal;
  }
  function openAlbum(room) {
    const list = items[room], r = ROOMS[room], cap = SLOTS[room].length, admin = isAdmin();
    const cells = list.map((it, i) => `<button type="button" class="mu-al ${st.seen[it.key] ? 'seen' : ''}" data-i="${i}"><img src="${esc(itemSrc(it))}" class="${it.url ? '' : 'pix'}" alt="" loading="lazy"><span>${esc(it.title || 'Ảnh ' + (i + 1))}</span>${i >= cap ? '<em>Album</em>' : ''}</button>`).join('');
    openModal(`<h2 style="color:${r.color}">Album · ${esc(r.name)}</h2><p class="sub">${list.length} ảnh · ${Math.min(list.length, cap)} ảnh đang treo trên tường${list.length > cap ? `, ${list.length - cap} ảnh chỉ có trong album` : ''}. Bấm vào ảnh để xem.</p>
      <div class="mu-album">${cells}</div>
      ${admin ? `<div class="mu-row"><a class="mu-btn gold" href="/museum/admin?room=${room}" target="_blank" rel="noopener">＋ Tải ảnh lên phòng này</a></div>` : ''}`, null, 'view', 'wide' + (room === 'love' ? ' love' : ''));
    modal.querySelectorAll('.mu-al').forEach((b) => { b.onclick = () => openExhibit(room, +b.dataset.i); });
  }
  function openDirectory() {
    const tile = (id, extra = '') => `<div class="${id} ${curRoom === id ? 'here' : ''}" style="border-color:${ROOMS[id].color}55"><b style="color:${ROOMS[id].color}">${esc(ROOMS[id].name)}${extra}</b><span>${esc(ROOMS[id].sub)}${curRoom === id ? ' · bạn đang ở đây' : ''}</span></div>`;
    openModal(`<h2>Sơ đồ bảo tàng</h2><p class="sub">Đi theo thảm đỏ để tới Sảnh Thành Tích. Hai cánh trái – phải nối với Sảnh Chính. Phòng Ống Kính đi lên từ Phòng Sự Kiện.</p>
      <div class="mu-dir">${tile('love', loveOpen ? ' ♥' : ' 🔒')}${tile('award')}${tile('lens')}${tile('class')}${tile('event')}${tile('lobby')}</div>`);
  }
  async function openGuestbook() {
    openModal('<h2>Sổ lưu bút</h2><p class="sub">Đang mở sổ…</p>');
    const list = opts.guestbook ? await opts.guestbook.load() : [];
    if (dead || ui.mode !== 'modal') return;
    const rows = list.length ? list.map((g) => `<div class="gb"><b>${esc(g.name)}</b><small>${esc(String(g.created_at || '').slice(0, 10))}</small><br>${esc(g.message)}</div>`).join('') : '<p class="sub">Chưa có ai ký. Bạn là người đầu tiên!</p>';
    openModal(`<h2>Sổ lưu bút</h2><p class="sub">Để lại vài dòng cho chủ bảo tàng nhé.${st.gb ? '' : ` Ký lần đầu +${PTS.guest} điểm.`}</p>
      <div class="gb-list">${rows}</div>
      <div class="gb-form"><input data-id="gbN" maxlength="24" placeholder="Tên của bạn"><textarea data-id="gbM" rows="3" maxlength="140" placeholder="Lời nhắn (tối đa 140 ký tự)"></textarea></div>
      <div class="mu-row"><button type="button" class="mu-btn gold" data-id="gbOk">Ký tên</button></div>`, null, 'guest');
    $('gbOk').onclick = async () => {
      const n = $('gbN').value.trim(), m = $('gbM').value.trim();
      if (!n || !m) { toast('Ghi tên và lời nhắn trước đã nhé.'); return; }
      $('gbOk').disabled = true;
      const okk = opts.guestbook ? await opts.guestbook.sign(n, m) : false;
      if (!okk) { toast('Chưa ký được — đợi 1 phút rồi thử lại nhé.'); $('gbOk').disabled = false; return; }
      sfx.chime();
      if (!st.gb) { st.gb = 1; addPts(PTS.guest, 'Ký sổ lưu bút'); } else toast('Cảm ơn bạn đã ký sổ lưu bút!');
      openGuestbook();
    };
  }
  async function openRank() {
    openModal('<h2>Bảng xếp hạng khám phá</h2><p class="sub">Đang tải…</p>', null, 'rank');
    const list = opts.leaderboard ? await opts.leaderboard() : [];
    if (dead || ui.mode !== 'modal') return;
    const nr = nextRank(st.pts);
    const rows = list.length ? list.map((r, i) => `<li><span class="n">${i + 1}</span><b>${esc(r.name || 'Ẩn danh')}</b><span class="p">${r.pts}</span></li>`).join('') : '<li class="empty">Chưa có ai trên bảng. Đăng ký cư dân Knoworld để điểm của bạn được lưu và xếp hạng.</li>';
    openModal(`<h2>Bảng xếp hạng khám phá ⭐</h2>
      <div class="mu-me"><b>${st.pts}</b> điểm · ${esc(rankOf(st.pts))}${nr ? `<small>Còn ${nr[0] - st.pts} điểm nữa lên “${esc(nr[1])}”</small>` : '<small>Hạng cao nhất rồi!</small>'}</div>
      <ol class="mu-rank">${rows}</ol>
      <p class="note">Cách kiếm điểm: xem một hiện vật lần đầu +${PTS.view} · vào một phòng mới +${PTS.room} · xem hết một phòng +${PTS.roomDone} · mỗi em vịt +${PTS.duck} (đủ 10 em trong ngày +${PTS.ducksAll}) · ký sổ lưu bút +${PTS.guest}.</p>`, null, 'rank');
  }
  async function talkCurator() {
    curator.dir = 'down';
    if (!st.cur) { st.cur = 1; addPts(PTS.curator); }
    const c = await say('Xin chào! Mình là hướng dẫn viên của Knoworld Museum. Bạn cần gì nè?', { who: 'Hướng dẫn viên', choices: ['Bảo tàng có những phòng nào?', 'Điểm khám phá là gì?', 'Tìm 10 em vịt là sao?', 'Cánh cửa hồng là gì?', 'Cảm ơn, mình tự đi xem'] });
    if (c === 0) await say(['Bên trái là Phòng Lớp Học — ảnh các lớp thầy Thịnh đã dạy. Bên phải là Phòng Sự Kiện — các chương trình làm cùng sinh viên.', 'Đi lên từ Phòng Sự Kiện là Phòng Ống Kính, ảnh thầy tự chụp. Còn đi thẳng theo thảm đỏ là Sảnh Thành Tích.', 'Mỗi phòng có một bục Album: ảnh nào chưa có chỗ treo đều nằm trong đó.'], { who: 'Hướng dẫn viên' });
    if (c === 1) await say([`Mỗi hiện vật bạn xem lần đầu được +${PTS.view} điểm, vào phòng mới +${PTS.room}, xem hết một phòng +${PTS.roomDone}.`, 'Bấm vào ngôi sao trên thanh trên cùng hoặc ra bảng xếp hạng cạnh lối ra để xem ai đang dẫn đầu.'], { who: 'Hướng dẫn viên' });
    if (c === 2) await say(['Mỗi ngày có 10 em vịt trốn quanh đảo và trong các phòng — 3 em ngoài đảo, 7 em trong nhà.', `Đứng cạnh em vịt rồi bấm Space. Mỗi em +${PTS.duck} điểm, đủ 10 em +${PTS.ducksAll}. Bấm biểu tượng 🦆 để xem gợi ý.`], { who: 'Hướng dẫn viên' });
    if (c === 3) await say(['À, đó là Phòng Riêng của thầy Thịnh và người thương. Phải có mật khẩu mới mở được.', 'Khách như tụi mình thì… ngắm cửa thôi nha.'], { who: 'Hướng dẫn viên' });
  }
  async function knockHeart() {
    const c = await say(['Một cánh cửa màu hồng, khắc hai trái tim nhỏ.', 'Biển nhỏ: “Phòng Riêng — chỉ dành cho hai người.”'], { who: 'Cửa hồng', choices: ['Nhập mật khẩu', 'Thôi, để hai người riêng tư'] });
    if (c !== 0) return;
    openModal(`<div class="lock-art"><svg viewBox="0 0 16 16" width="56" height="56" shape-rendering="crispEdges"><rect x="4" y="2" width="8" height="2" fill="#ff8fb1"/><rect x="3" y="3" width="2" height="5" fill="#ff8fb1"/><rect x="11" y="3" width="2" height="5" fill="#ff8fb1"/><rect x="2" y="7" width="12" height="8" fill="#e86a98"/><rect x="7" y="9" width="2" height="4" fill="#2a0d18"/></svg></div>
      <h2 style="text-align:center">Phòng Riêng</h2><p class="sub" style="text-align:center">Nhập mật khẩu để mở cửa.</p>
      <form class="mu-pass" data-id="pf"><input data-id="pw" type="password" autocomplete="off" maxlength="64" placeholder="Mật khẩu"><button type="submit" class="mu-btn pink">Mở cửa</button></form>
      <p class="mu-err" data-id="pe"></p>`, null, 'love', 'love');
    later(() => { const i = $('pw'); if (i) i.focus(); }, 50);
    $('pf').onsubmit = async (e) => {
      e.preventDefault();
      const pw = $('pw').value; if (!pw) return;
      $('pe').textContent = 'Đang kiểm tra…';
      const res = opts.unlockLove ? await opts.unlockLove(pw) : { ok: false, offline: true };
      if (dead) return;
      if (!res.ok) {
        sfx.bad(); const f = $('pf'); if (f) { f.classList.remove('bad'); void f.offsetWidth; f.classList.add('bad'); }
        $('pe').textContent = res.locked ? 'Nhập sai quá nhiều lần. Đợi 10 phút rồi thử lại nhé.' : res.offline ? 'Chưa kết nối được máy chủ.' : 'Sai mật khẩu.';
        return;
      }
      closeModal(); sfx.chime();
      lovePhotos = res.photos || []; loveOpen = true; rebuildIn();
      if (!st.rooms.love) { st.rooms.love = 1; save(); }
      toast('Cửa Phòng Riêng đã mở.');
      say(['Cánh cửa hồng khẽ mở ra…', 'Chào mừng về nhà, hai người.'], { who: 'Phòng Riêng' });
    };
  }
  function loveCounter() {
    const days = Math.max(0, Math.floor((Date.now() - new Date(`${LOVE_SINCE}T00:00:00+07:00`)) / 864e5));
    return say(['Một trái tim đỏ đặt trên bệ trắng. Bên dưới khắc dòng chữ:', `“Đã bên nhau ${days.toLocaleString('vi-VN')} ngày.”`], { who: 'Trái tim' });
  }
  const ACT = {
    museum: () => say('Knoworld Museum. Cửa chính ở giữa bậc thềm — cứ đi thẳng vào.'),
    fountain: () => say('Đài phun nước. Dưới đáy có vài đồng xu — chắc ai đó ước được điểm A.'),
    sign: () => say(['KNOWORLD MUSEUM — mở cửa 24/7', 'Lớp học · Sự kiện · Thành tích · Ống kính.\nVào cửa miễn phí, nhớ ký sổ lưu bút ở Sảnh Chính.'], { who: 'Biển' }),
    duckboard: () => openDucks(),
    lamp: () => say('Cột đèn đá. Buổi tối (giờ VN) đèn sẽ sáng.'),
    bench: () => say(M === OUT ? 'Ghế đá cạnh đài phun nước. Ngồi một chút cho mát.' : 'Băng ghế cho khách nghỉ chân.'),
    plant: () => say('Một chậu cây xanh. Ai đó đã tưới rất đều tay.'),
    banner: () => say('Băng rôn đỏ: SẢNH THÀNH TÍCH.'),
    cam: () => say('Chiếc máy ảnh trên chân máy — “đồng tác giả” của cả phòng này.', { who: 'Máy ảnh' }),
    water: () => say('Nước trong veo, có đàn cá nhỏ bơi quanh chân cầu.'),
    desk: talkCurator, curator: talkCurator,
    guard: () => { guard.dir = opposite(player.dir); return say(pickOne(NPC_LINES.guard), { who: 'Bảo vệ' }); },
    guest: openGuestbook, dir: openDirectory, map: openDirectory, rank: openRank,
    heart: knockHeart, lovec: loveCounter,
    duck: () => { const [x, y] = facing(); const d = ducks.find((k) => !k.found && k.m === M.id && k.tx === x && k.ty === y); if (d) findDuck(d); },
    visitor: () => {
      const [x, y] = facing(); const v = visitors.find((e) => e.m === M.id && e.tx === x && e.ty === y); if (!v) return null;
      v.dir = opposite(player.dir); v.talkT = 4; return say(pickOne(NPC_LINES.visitor), { who: v.who });
    },
    remote: async () => {
      const [x, y] = facing(); const r = remoteAt(x, y); if (!r) return;
      const c = await say(`${r.name}${r.badge ? ' (Giảng viên)' : ''} — người thật, cũng đang tham quan.`, { who: r.name, choices: ['Chào bạn ấy 👋', 'Rủ đi tìm vịt 🦆', 'Thôi'] });
      if (c === 0) speak(0, r.sid); if (c === 1) speak(3, r.sid);
    },
  };
  function interact() {
    if (ui.busy() || player.moving) return;
    const [x, y] = facing(); const t = targetAt(x, y);
    if (!canAct(t)) return;
    if (t !== 'duck') sfx.blip();
    if (t.startsWith('s:')) { const [, room, i] = t.split(':'); openExhibit(room, +i); return; }
    if (t.startsWith('album:')) { openAlbum(t.slice(6)); return; }
    ACT[t]();
  }

  /* ---------- đổi cảnh ---------- */
  function goTo(mid, tx, ty, dir) { if (trans) return; trans = { t: 0, mid, tx, ty, dir, swapped: false }; held.length = 0; sfx.door(); }
  function roomAt(mid, x, y) {
    if (mid === 'out') return y >= 19 ? 'bridge' : x >= 29 ? 'tbridge' : 'isle';
    const r = RECTS.find(([, x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    return r ? r[0] : null;
  }
  function enterRoom(r) {
    if (!r || r === curRoom) return;
    curRoom = r; hud();
    if (M === IN && ROOMS[r]) banner(r);
    if (ROOMS[r] && !st.rooms[r]) { st.rooms[r] = 1; save(); addPts(PTS.room); }
  }
  async function onArrive() {
    const t = M.tile[player.ty][player.tx];
    if (M === OUT && t === DOOR) { goTo('in', 17, 31, 'up'); return; }
    if (M === IN && t === DOOR) { goTo('out', player.tx === 17 ? 15 : 16, 9, 'down'); return; }
    if (M === OUT && player.ty === M.H - 1) {
      const c = await say('Qua hết Cầu Ký Ức là về Main City. Rời đảo nhé?', { choices: ['Về Main City', 'Ở lại thêm chút'] });
      if (c === 0 && opts.onExit) { opts.onExit('city'); return; }
      startMove(player, 'up', 0.2, true); return;
    }
    if (M === OUT && player.tx === M.W - 1) {
      const c = await say('Cây cầu này dẫn sang Temple Isle. Sang chùa nhé?', { choices: ['Sang Temple Isle', 'Ở lại bảo tàng'] });
      if (c === 0 && opts.onExit) { opts.onExit('temple'); return; }
      startMove(player, 'left', 0.2, true); return;
    }
    enterRoom(roomAt(M.id, player.tx, player.ty));
  }

  function openHelp() {
    openModal(`<h2>Cách tham quan</h2><p class="sub">Mọi người đang mở trang này đều thấy nhau (thẻ tên xanh lá).</p>
      <ol class="mu-help">
        <li>Từ <b>Cầu Ký Ức</b> đi lên đảo, vào cửa chính. Cây cầu bên phải đảo dẫn sang <b>Temple Isle</b>.</li>
        <li><b>Sảnh Chính</b>: hướng dẫn viên, sơ đồ, <b>Sổ lưu bút</b>, <b>bảng xếp hạng</b>.</li>
        <li>Trái: <b>Phòng Lớp Học</b> · Phải: <b>Phòng Sự Kiện</b> · Trên Phòng Sự Kiện: <b>Phòng Ống Kính</b> · Theo thảm đỏ: <b>Sảnh Thành Tích</b>.</li>
        <li>Đứng trước khung ảnh / tấm vách / bệ trưng bày rồi bấm Space để xem. Trong khung xem: ← → để lật ảnh cùng phòng. Bục <b>Album</b> mỗi phòng có toàn bộ ảnh.</li>
        <li><b>Điểm khám phá</b> ⭐ và trò <b>Tìm 10 em vịt</b> 🦆 — bấm vào biểu tượng trên thanh trên cùng để xem.</li>
        <li><b>Phòng Riêng</b>: cửa hồng phía trên Phòng Lớp Học, cần mật khẩu.</li></ol>
      <p class="sub" style="margin:0">Máy tính: mũi tên / WASD để đi, Shift để chạy, Space để xem, T để nói, Esc để đóng.<br>Điện thoại: phím ảo, nút A để xem, B để đóng.</p>
      <div class="mu-row"><button type="button" class="mu-btn gold" data-id="hOk">Đi tiếp</button></div>`);
    $('hOk').onclick = closeModal;
  }

  /* ---------- input ---------- */
  function press(d) { if (!held.includes(d)) { held.push(d); if (!player.moving && player.dir !== d && !ui.busy()) { player.dir = d; turnT = 0.08; } } }
  function release(d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); }
  function setActive(v) { active = v; $('sleep').hidden = v; if (!v) held.length = 0; }
  on(window, 'keydown', (e) => {
    if (!active) return;
    const tg = e.target;
    if (tg && tg !== stageEl && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable) && e.key !== 'Escape') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const other = [...document.querySelectorAll('[aria-modal="true"]')].some((m) => !root.contains(m));
    if (other) { held.length = 0; return; }
    if (e.key === 'Shift') shift = true;
    if (ui.onKey(e)) { e.preventDefault(); return; }
    const d = KEYMAP[e.key];
    if (d) { ac(); press(d); e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); ac(); if (!e.repeat) interact(); }
    if ((e.key === 't' || e.key === 'T') && online && !e.repeat) { e.preventDefault(); openChat(); }
  });
  on(window, 'keyup', (e) => { if (e.key === 'Shift') shift = false; const d = KEYMAP[e.key]; if (d) release(d); });
  on(window, 'blur', () => { held.length = 0; shift = false; });
  on(document, 'pointerdown', (e) => { setActive(root.contains(e.target)); });
  on($('sleep'), 'click', () => setActive(true));
  if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) root.classList.add('touch');
  const ARROW = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  root.querySelectorAll('.dpad button').forEach((b) => {
    const d = b.dataset.d;
    on(b, 'pointerdown', (e) => {
      e.preventDefault(); ac();
      if (ui.mode === 'dialog') { ui.onKey({ key: d === 'up' ? 'ArrowUp' : d === 'down' ? 'ArrowDown' : '' }); return; }
      if (ui.mode === 'modal') { if (ui.onModalKey) ui.onModalKey({ key: ARROW[d] }); return; }
      press(d);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => on(b, ev, () => release(d)));
  });
  on($('tA'), 'pointerdown', (e) => { e.preventDefault(); ac(); if (!ui.onKey({ key: ' ' })) interact(); });
  on($('tB'), 'pointerdown', (e) => { e.preventDefault(); ui.onKey({ key: 'Escape' }); });

  /* ---------- nhiều người chơi ---------- */
  let online = false, net = { send() {}, leave() {}, sid: null }, sendT = 0, beatT = 0, lastSig = '', chatT = 0;
  const ME = (typeof opts.me === 'function' ? opts.me() : opts.me) || {};
  const darken = (hex, k = 0.2) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const lookPal = (l, base) => { const o = l && typeof l === 'object' ? l : {}; const shirt = HEX.test(o.shirt) ? o.shirt : base.shirt; return { ...base, skin: HEX.test(o.skin) ? o.skin : base.skin, hair: HEX.test(o.hair) ? o.hair : base.hair, shirt, shirt2: darken(shirt) }; };
  const myPal = ME.look ? lookPal(ME.look, PAL.player) : PAL.player;
  const sprites = {};
  const sprite = (key, dir, f, pal) => { const k = key + dir + f; if (!sprites[k]) sprites[k] = human(pal, dir, f); return sprites[k]; };
  const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Khách';
  const mapOf = (mid) => (mid === 'in' ? IN : OUT);
  const okTile = (mid, x, y) => { const m = mapOf(mid); return !!m && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < m.W && y < m.H && !isSolid(m.tile[y][x]); };
  const okDir = (d) => (DIRS[d] ? d : 'down');
  const okMap = (m) => (m === 'in' ? 'in' : 'out');
  function remoteFor(sid, p = {}) {
    let r = remotes.get(sid);
    if (!r) {
      const mid = okMap(p.m), [x, y] = okTile(mid, p.tx, p.ty) ? [p.tx, p.ty] : mid === 'in' ? [17, 30] : [15, 25];
      r = Object.assign(ent('remote', x, y, okDir(p.dir)), { sid, m: mid, q: [], name: 'Khách', badge: '' });
      remotes.set(sid, r);
    }
    if (p.name !== undefined) r.name = cleanName(p.name);
    if (p.badge !== undefined) r.badge = p.badge === 'GV' ? 'GV' : '';
    if (p.look !== undefined || !r.pal) { const pal = lookPal(p.look, PAL.remote); r.pal = pal; r.palKey = 'r' + pal.shirt + pal.hair + pal.skin; }
    return r;
  }
  function onlineHud() {
    const el = $('hOn'); el.hidden = !online; $('bChat').hidden = !online;
    $('hOnN').textContent = remotes.size + 1;
    el.title = ['Bạn', ...[...remotes.values()].map((r) => r.name + (r.badge ? ' (GV)' : ''))].join(', ');
  }
  function updRemotes(dt) {
    for (const r of remotes.values()) {
      stepEnt(r, dt);
      if (r.moving || !r.q.length) continue;
      if (r.q.length > 6) { const l = r.q[r.q.length - 1]; r.q.length = 0; r.m = l[4]; teleport(r, l[0], l[1], l[2]); continue; }
      const [x, y, d, run, mid] = r.q.shift();
      if (mid !== r.m) { r.m = mid; teleport(r, x, y, d); continue; }
      const dist = Math.abs(x - r.tx) + Math.abs(y - r.ty);
      if (dist === 0) r.dir = d;
      else if (dist === 1) { r.nx = x; r.ny = y; r.dir = x > r.tx ? 'right' : x < r.tx ? 'left' : y > r.ty ? 'down' : 'up'; r.moving = true; r.prog = 0; r.alt = !r.alt; r.dur = (run ? 0.12 : 0.2) * (r.q.length > 2 ? 0.6 : 1); }
      else teleport(r, x, y, d);
    }
  }
  const myPos = () => ({ m: M.id, tx: player.moving ? player.nx : player.tx, ty: player.moving ? player.ny : player.ty, dir: player.dir });
  function sendPos(force) {
    const p = myPos(), doing = modalKind === 'view' ? 'view' : modalKind === 'guest' ? 'guest' : '';
    const sig = `${p.m},${p.tx},${p.ty},${p.dir},${doing}`;
    if (!force && sig === lastSig) return;
    lastSig = sig; sendT = 0.08; beatT = 6;
    net.send('pos', { ...p, run: player.moving && player.dur < 0.15 ? 1 : 0, doing });
  }
  function netTick(dt) { if (!online) return; sendT -= dt; beatT -= dt; chatT -= dt; if (sendT <= 0) sendPos(beatT <= 0); }
  const showBubble = (e, txt) => { e.bubble = { txt, t: 0 }; };
  function speak(i, to) {
    if (!online || chatT > 0) { if (chatT > 0) toast('Từ từ thôi, nói chậm lại chút nhé.'); return; }
    chatT = 2; const target = to ? remotes.get(to) : null;
    showBubble(player, (target ? `@${target.name} ` : '') + PHRASES[i]);
    net.send('say', { p: i, to: to || '' });
  }
  async function openChat() {
    if (ui.busy() || !online) return;
    const c = await say('Nói gì với mọi người trong bảo tàng?', { who: 'Nói nhanh', choices: [...PHRASES, 'Thôi'] });
    if (c !== null && c < PHRASES.length) speak(c);
  }
  on($('bChat'), 'click', () => { setActive(true); openChat(); });
  on($('hOn'), 'click', () => toast(`Đang ở bảo tàng: ${$('hOn').title}`));
  const DOING = { view: 'đang xem ảnh', guest: 'đang ký sổ' };
  const handlers = {
    snapshot: myPos,
    onStatus(s) { online = s === 'online'; if (online) { lastSig = ''; sendPos(true); } onlineHud(); },
    onPeers(list) {
      const seen = new Set();
      for (const p of list) { if (!p.sid) continue; seen.add(p.sid); remoteFor(p.sid, p); }
      for (const k of [...remotes.keys()]) if (!seen.has(k)) remotes.delete(k);
      onlineHud();
    },
    onJoin() { later(() => sendPos(true), 200 + Math.random() * 600); },
    onEvent(e) {
      const sid = String(e.sid).slice(0, 16);
      if (!remotes.has(sid) && e.type !== 'pos') return;
      const r = remoteFor(sid);
      if (e.type === 'pos') {
        const mid = okMap(e.m);
        if (!okTile(mid, e.tx, e.ty)) return;
        r.q.push([e.tx, e.ty, okDir(e.dir), !!e.run, mid]); r.doing = DOING[e.doing] ? e.doing : '';
        onlineHud();
      } else if (e.type === 'say' && Number.isInteger(e.p) && PHRASES[e.p]) {
        const toMe = e.to && e.to === net.sid, other = e.to && remotes.get(e.to);
        showBubble(r, (toMe ? '@Bạn ' : other ? `@${other.name} ` : '') + PHRASES[e.p]);
        if (toMe) { sfx.blip(); toast(`${r.name}: ${PHRASES[e.p]}`); }
      }
    },
  };

  /* ---------- render ---------- */
  let s = 3, camX = 0, camY = 0, time = 0;
  function resize() {
    const r = stageEl.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const base = Math.max(2, Math.min(4, Math.floor(Math.min(r.width / 230, r.height / 165))));
    s = Math.max(1, Math.round(base * dpr));
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(stageEl); else on(window, 'resize', resize);
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function spriteOf(e) {
    if (e.kind === 'player') return sprite('player', e.dir, e.f, myPal);
    if (e.kind === 'remote' || e.kind === 'visitor') return sprite(e.palKey, e.dir, e.f, e.pal);
    return sprite(e.kind, e.dir, e.f, PAL[e.kind]);
  }
  function draw() {
    const L = layers[M.id]; if (!L) return;
    const vw = cv.width / s, vh = cv.height / s, MW = M.W * T, MH = M.H * T;
    camX = player.x + 8 - vw / 2; camY = player.y + 8 - vh / 2;
    camX = MW <= vw ? (MW - vw) / 2 : Math.max(0, Math.min(MW - vw, camX));
    camY = MH <= vh ? (MH - vh) / 2 : Math.max(0, Math.min(MH - vh, camY));
    camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = M === OUT ? '#2f78ad' : '#15131f'; ctx.fillRect(0, 0, cv.width, cv.height);
    const sx = (x) => Math.round((x - camX) * s), sy = (y) => Math.round((y - camY) * s);
    ctx.drawImage(L.stat, sx(0), sy(0), MW * s, MH * s);
    if (M === OUT) {
      ctx.fillStyle = 'rgba(220,240,255,.7)';
      const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(M.W - 1, Math.ceil((camX + vw) / T)), y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(M.H - 1, Math.ceil((camY + vh) / T));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (M.tile[y][x] !== WATER) continue;
        const ph = (time * 1.1 + hash(x, y, 77) * 7) % 7; if (ph > 2) continue;
        ctx.fillRect(sx(x * T + 3 + Math.floor(hash(x, y, 78) * 8) + Math.floor(ph * 1.5)), sy(y * T + 5 + Math.floor(hash(x, y, 79) * 7)), 3 * s, s);
      }
      ctx.fillStyle = 'rgba(200,235,255,.9)';
      for (const p of drops) ctx.fillRect(sx(p.x), sy(p.y), s, s);
    }
    const hideLove = (e) => M === IN && !loveOpen && inLoveZone(e.tx, e.ty);
    const people = [player, ...statics.filter(here), ...visitors.filter(here), ...[...remotes.values()].filter((r) => r.m === M.id && !hideLove(r))];
    const dks = ducks.filter((d) => !d.found && d.m === M.id);
    const all = [...people, ...dks].sort((a, b) => a.y - b.y);
    for (const e of all) {
      if (e.kind === 'duck') {
        const bob = Math.sin(time * 3 + e.ph) > 0.6 ? 1 : 0;
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx(e.x + 8), sy(e.y + 15), 4 * s, 1.6 * s, 0, 0, 7); ctx.fill();
        ctx.drawImage(duckSprite(e.id, bob), sx(e.x), sy(e.y - 2), 16 * s, 18 * s);
        continue;
      }
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx(e.x + 8), sy(e.y + 15), 5 * s, 2 * s, 0, 0, 7); ctx.fill();
      ctx.drawImage(spriteOf(e), sx(e.x), sy(e.y - 4), 16 * s, 20 * s);
    }
    ctx.drawImage(L.over, sx(0), sy(0), MW * s, MH * s);
    if (M === IN && !loveOpen) { // Phòng Riêng khóa: che kín
      ctx.fillStyle = '#2a1626'; ctx.fillRect(sx(1 * T), sy(2 * T), 10 * T * s, 9 * T * s);
      ctx.fillStyle = 'rgba(255,143,177,.08)';
      for (let i = 0; i < 6; i++) ctx.fillRect(sx(1 * T + i * 27), sy(2 * T), 12 * s, 9 * T * s);
      ctx.font = `${Math.round(9 * s)}px VT323, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff8fb1'; ctx.fillText('♥ PHÒNG RIÊNG ♥', sx(6 * T), sy(6 * T));
      ctx.font = `${Math.round(6 * s)}px VT323, monospace`; ctx.fillStyle = '#e9b9c7'; ctx.fillText('cần mật khẩu', sx(6 * T), sy(7 * T));
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (M === IN) for (const sl of IN.slots) {
      if (sl.k !== 'ped') continue;
      const ph = (time * 1.4 + sl.x) % 3; if (ph > 0.6) continue;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; const px = sl.x * T + (sl.w * T) / 2 + (sl.x % 2 ? 6 : -7), py = sl.y * T - (sl.w === 2 ? 18 : 12);
      ctx.fillRect(sx(px), sy(py - 1), s, 3 * s); ctx.fillRect(sx(px - 1), sy(py), 3 * s, s);
    }
    for (const p of dust) { ctx.fillStyle = `${p.col}${Math.max(0, 0.9 - p.t * 1.6)})`; ctx.fillRect(sx(p.x), sy(p.y), 2 * s, 2 * s); }
    if (M === OUT && isNight()) {
      ctx.fillStyle = 'rgba(18,20,58,.42)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of M.glows) {
        const fl = 1 + Math.sin(time * 3 + x) * 0.05, gr = ctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * s * fl);
        gr.addColorStop(0, 'rgba(255,200,110,.4)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gr;
        ctx.fillRect(sx(x) - r * s * 1.2, sy(y) - r * s * 1.2, r * s * 2.4, r * s * 2.4);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.font = `${Math.round(6.5 * s)}px VT323, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of M.labels) {
      const w = ctx.measureText(l.t).width + 5 * s, h = 8 * s, x = sx(l.x), y = sy(l.y);
      if (x < -w || y < -h || x > cv.width + w || y > cv.height + h) continue;
      ctx.fillStyle = 'rgba(19,18,27,.82)'; roundRect(x - w / 2, y - h / 2, w, h, 3 * s); ctx.fill();
      ctx.strokeStyle = l.pink ? 'rgba(255,143,177,.9)' : 'rgba(255,210,122,.8)'; ctx.lineWidth = Math.max(1, s / 2.5); ctx.stroke();
      ctx.fillStyle = l.pink ? '#ffd1e0' : '#ffe9b8'; ctx.fillText(l.t, x, y + s * 0.4);
    }
    // vịt kêu khi người chơi lại gần
    for (const d of dks) {
      const dist = Math.abs(d.tx - player.tx) + Math.abs(d.ty - player.ty);
      if (dist <= 5 && d.quackT < 0.9) { ctx.fillStyle = '#fff4dc'; ctx.fillText('quạc!', sx(d.x + 8), sy(d.y - 6 - d.quackT * 6)); }
    }
    // thẻ tên người chơi thật
    for (const r of remotes.values()) {
      if (r.m !== M.id || hideLove(r)) continue;
      const label = r.name + (r.doing ? ` · ${DOING[r.doing]}` : '');
      const tw = ctx.measureText(label).width, gv = r.badge ? ctx.measureText('GV').width + 4 * s : 0;
      const w = tw + 11 * s + gv, h = 8 * s, x = sx(r.x + 8), y = sy(r.y - 9);
      ctx.fillStyle = 'rgba(14,40,28,.9)'; roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.fill();
      ctx.strokeStyle = '#6ee7a0'; ctx.lineWidth = Math.max(1, s / 2.5); ctx.stroke();
      ctx.fillStyle = '#6ee7a0'; ctx.beginPath(); ctx.arc(x - w / 2 + 4.5 * s, y, 1.8 * s, 0, 7); ctx.fill();
      let tx = x - w / 2 + 8 * s;
      if (gv) { ctx.fillStyle = '#ffd27a'; roundRect(tx, y - 3 * s, gv - s, 6 * s, 2 * s); ctx.fill(); ctx.fillStyle = '#2a1a06'; ctx.textAlign = 'left'; ctx.fillText('GV', tx + 1.5 * s, y + s * 0.4); tx += gv; }
      ctx.textAlign = 'left'; ctx.fillStyle = '#eafff2'; ctx.fillText(label, tx, y + s * 0.4); ctx.textAlign = 'center';
    }
    for (const e of [player, ...remotes.values()]) {
      if (!e.bubble || (e !== player && e.m !== M.id)) continue;
      const b = e.bubble, w = ctx.measureText(b.txt).width + 8 * s, h = 10 * s, x = sx(e.x + 8), y = sy(e.y - (e === player ? 14 : 22)) - h / 2;
      ctx.globalAlpha = Math.min(1, (4 - b.t) * 2);
      ctx.fillStyle = '#fffaf0'; roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 2 * s, y + h / 2 - s); ctx.lineTo(x, y + h / 2 + 3 * s); ctx.lineTo(x + 2 * s, y + h / 2 - s); ctx.fill();
      ctx.strokeStyle = '#241a26'; ctx.lineWidth = Math.max(1, s / 2.5); roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.stroke();
      ctx.fillStyle = '#241a26'; ctx.fillText(b.txt, x, y + s * 0.4); ctx.globalAlpha = 1;
    }
    ctx.font = `${Math.round(8 * s)}px VT323, monospace`;
    for (const f of fx) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      ctx.fillStyle = '#13121b'; ctx.fillText(f.txt, sx(f.x) + s, sy(f.y - f.t * 18) + s);
      ctx.fillStyle = f.col; ctx.fillText(f.txt, sx(f.x), sy(f.y - f.t * 18));
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!ui.busy() && !player.moving) {
      const [fx2, fy2] = facing(), t = targetAt(fx2, fy2);
      if (canAct(t)) {
        const fresh = (t.startsWith('s:') && (() => { const [, room, i] = t.split(':'); const it = items[room][+i]; return it && !st.seen[it.key]; })()) || t === 'duck';
        const bx = sx(player.x + 5), by = sy(player.y - 14 + Math.round(Math.sin(time * 6)));
        ctx.fillStyle = '#241a26'; ctx.fillRect(bx - s, by - s, 8 * s, 10 * s);
        ctx.fillStyle = fresh ? '#ffd27a' : '#ffffff'; ctx.fillRect(bx, by, 6 * s, 8 * s);
        ctx.fillStyle = '#e23b2b'; ctx.fillRect(bx + 2 * s, by + s, 2 * s, 4 * s); ctx.fillRect(bx + 2 * s, by + 6 * s, 2 * s, s);
      }
    }
    if (trans) { const a = trans.t < 0.25 ? trans.t / 0.25 : Math.max(0, 1 - (trans.t - 0.25) / 0.25); ctx.fillStyle = `rgba(10,9,16,${a})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  }

  /* ---------- loop ---------- */
  let lastT = performance.now(), raf = 0, dropT = 0, adminT = 1;
  function update(dt) {
    time += dt; ui.tick(dt);
    if (trans) {
      trans.t += dt;
      if (trans.t >= 0.25 && !trans.swapped) {
        trans.swapped = true; M = mapOf(trans.mid); teleport(player, trans.tx, trans.ty, trans.dir); unstick(player);
        curRoom = ''; enterRoom(roomAt(M.id, player.tx, player.ty)); if (online) sendPos(true);
      }
      if (trans.t >= 0.5) trans = null;
    } else {
      if (stepEnt(player, dt)) onArrive();
      if (!player.moving && !ui.busy()) {
        const d = held[held.length - 1];
        if (d) {
          if (turnT > 0) turnT -= dt;
          else if (!startMove(player, d, shift ? 0.12 : 0.2)) {
            player.dir = d;
            const [dx, dy] = DIRS[d], b = blocker(player.tx + dx, player.ty + dy, player);
            if (b && b.kind === 'visitor') { pushT += dt; if (pushT > 0.35 && startMove(player, d, 0.24, true)) pushT = 0; }
          } else pushT = 0;
        }
      }
    }
    updVisitors(dt); updRemotes(dt); netTick(dt);
    adminT -= dt; if (adminT <= 0) { adminT = 2; if (isAdmin() === $('bAdmin').hidden) hud(); }
    for (const e of [player, ...remotes.values()]) if (e.bubble && (e.bubble.t += dt) > 4) e.bubble = null;
    for (const d of ducks) {
      if (d.found || d.m !== M.id) continue;
      d.quackT -= dt;
      if (d.quackT <= 0) { d.quackT = 4 + Math.random() * 5; if (Math.abs(d.tx - player.tx) + Math.abs(d.ty - player.ty) <= 5) sfx.quack(); }
    }
    for (const p of dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    while (dust.length && dust[0].t > 0.6) dust.shift();
    for (const f of fx) f.t += dt;
    while (fx.length && fx[0].t > 1.1) fx.shift();
    if (M === OUT) {
      dropT -= dt;
      if (dropT <= 0) { dropT = 0.05; drops.push({ x: 10 * T + 16 + (Math.random() - 0.5) * 2, y: 13 * T + 6, vx: (Math.random() - 0.5) * 18, vy: -22 - Math.random() * 10, life: 0 }); }
      for (const p of drops) { p.life += dt; p.vy += 70 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      while (drops.length && drops[0].life > 0.9) drops.shift();
    }
  }
  function loop(now) {
    if (dead) return;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    update(dt); draw(); raf = requestAnimationFrame(loop);
  }

  /* ---------- start ---------- */
  resize(); rebuildItems(); IN = buildInMap(items, false); placeDucks(); hud();
  const fontReady = Promise.race([document.fonts ? document.fonts.load('16px VT323') : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);
  fontReady.then(() => {
    if (dead) return;
    buildOutStatic(); buildInStatic(); seedVisitors();
    raf = requestAnimationFrame(loop);
    if (opts.online) { try { net = opts.online(handlers) || net; } catch { /* chơi một mình */ } }
    if (!st.intro) {
      st.intro = true; save();
      const touch = root.classList.contains('touch');
      say(['Chào mừng đến Knoworld Museum!', 'Đi hết Cầu Ký Ức lên đảo rồi vào cửa chính. Bên trong có Phòng Lớp Học, Phòng Sự Kiện, Sảnh Thành Tích, Phòng Ống Kính — và một cánh cửa hồng.',
        `Xem hiện vật để tích điểm khám phá ⭐, và hôm nay có 10 em vịt 🦆 đang trốn đâu đó. ${touch ? 'Dùng phím ảo để đi, nút A để xem.' : 'Đi bằng phím mũi tên / WASD, Space để xem.'}`], { who: 'Knoworld Museum' });
    }
  });
  if (opts.photos) {
    Promise.resolve(opts.photos()).then((list) => {
      if (dead || !Array.isArray(list)) return;
      photos = list; rebuildIn();
    }).catch(() => {});
  }

  return () => {
    dead = true; cancelAnimationFrame(raf);
    try { net.leave(); } catch { /* ignore */ }
    offs.forEach((f) => f()); timers.forEach((t) => clearTimeout(t)); clearTimeout(toastT);
    if (ro) ro.disconnect();
    if (opts.flush) opts.flush();
    try { if (AC) AC.close(); } catch { /* ignore */ }
    root.innerHTML = '';
  };
}
