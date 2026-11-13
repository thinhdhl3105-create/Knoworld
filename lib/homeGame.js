// ---------------------------------------------------------------------------
// v51: MY HOME — nhà của Thịnh (thay cho Knoworld Museum).
//   • Game pixel nhìn từ trên xuống: 6 phòng + sân trước, cầu về Main City, lối sang Temple Isle.
//   • Chủ nhà (email admin) trang trí: chọn ghế, bàn, kệ, khung ảnh, tủ cúp… kéo thả, đổi màu, sàn, tường.
//   • Khung ảnh / tủ cúp / bục / bằng khen chứa ảnh & thành tích thật (Supabase bucket 'home').
//   • Khoá ở cửa chính: mở cho mọi người / thành viên Knoworld / chỉ khách mời / đóng cửa.
//     Khách mời vào bằng mã mời (link ?code=), người lạ gõ cửa -> chủ nhà duyệt.
//   • Mỗi ngày 10 em vịt trốn quanh nhà · mọi người thấy nhau (Realtime kênh 'kw-home').
// mountHome(root, opts) -> cleanup()  — xem chú thích ở hàm.
// ---------------------------------------------------------------------------
/* eslint-disable */
const T = 16, W = 40, H = 30, NW = W * T, NH = H * T;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function disc(g, c, cx, cy, r) { g.fillStyle = c; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1); }
function ell(g, c, cx, cy, rx, ry) { g.fillStyle = c; for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) g.fillRect(x, y, 1, 1); }
function heartPx(g, c, x, y) { ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'].forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') R(g, c, x + i, y + j, 1, 1); })); }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const t = k < 0 ? 0 : 255, a = Math.abs(k);
  r = Math.round(r + (t - r) * a); gg = Math.round(gg + (t - gg) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
function outline(c, col = '#241a26') {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data, w = c.width, h = c.height, m = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3]) continue;
    const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] > 0;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) m.push([x, y]);
  }
  g.fillStyle = col; m.forEach(([x, y]) => g.fillRect(x, y, 1, 1)); return c;
}
const SH = 'rgba(20,14,24,.22)';
const WD = { a: '#a8774a', d: '#7a4e2c', l: '#bf8f5e', k: '#5c3a20' };
const COLORS = [['Đỏ gạch', '#c8553d'], ['Xanh navy', '#3d5a80'], ['Xanh rêu', '#6a994e'], ['Mù tạt', '#e0a32e'], ['Tím', '#7b5ea7'], ['Hồng', '#f08fa8'], ['Xám', '#7d7a85'], ['Kem', '#e8dcc0']];
const FRAMEC = [['Vàng', '#c99a3a'], ['Đen', '#2b2a33'], ['Gỗ', '#8a5c36'], ['Trắng', '#f1ece2']];
const GROUPS = ['Người thân', 'Bạn bè', 'Đồng nghiệp', 'Sinh viên'];
const AVC = ['#ffd27a', '#ff8fb1', '#7ee8ff', '#5ee0a0', '#c6bfff', '#ffb38a'];

/* =====================================================================
   BẢN ĐỒ NGÔI NHÀ
   ===================================================================== */
const GR = 0, PATH = 1, FLOOR = 2, WALL = 3, DOOR = 4, WATER = 5, PLANK = 6, HEDGE = 7, FENCE = 8;
const RDEF = [
  { id: 'bed', x0: 2, y0: 2, x1: 12, y1: 8 }, { id: 'kitchen', x0: 14, y0: 2, x1: 25, y1: 8 }, { id: 'work', x0: 27, y0: 2, x1: 37, y1: 8 },
  { id: 'award', x0: 2, y0: 11, x1: 12, y1: 19 }, { id: 'living', x0: 14, y0: 11, x1: 25, y1: 19 }, { id: 'gallery', x0: 27, y0: 11, x1: 37, y1: 19 },
];
const RD = Object.fromEntries(RDEF.map((r) => [r.id, r]));
const DOORS = [
  { room: 'living', front: true, t: [[19, 20], [20, 20]] }, { room: 'award', t: [[13, 15], [13, 16]] }, { room: 'gallery', t: [[26, 15], [26, 16]] },
  { room: 'kitchen', t: [[19, 9], [20, 9], [19, 10], [20, 10]] }, { room: 'bed', t: [[6, 9], [7, 9], [6, 10], [7, 10]] },
  { room: 'work', t: [[31, 9], [32, 9], [31, 10], [32, 10]] }, { room: 'work', t: [[26, 5], [26, 6]] },
];
const DEFAULT_ROOMS = {
  bed: { name: 'Phòng Ngủ', floor: 'lilac', wall: '#ecdcf2' }, kitchen: { name: 'Bếp & Phòng Ăn', floor: 'tile', wall: '#e6efe9' },
  work: { name: 'Góc Làm Việc', floor: 'darkwood', wall: '#e8e1d2' }, award: { name: 'Phòng Thành Tích', floor: 'marble', wall: '#efe3c4' },
  living: { name: 'Phòng Khách', floor: 'wood', wall: '#f1e6d6' }, gallery: { name: 'Phòng Ảnh', floor: 'oak', wall: '#e3ecf3' },
};
const ROOM_IDS = RDEF.map((r) => r.id);
const base = [], roomAt = [], doorAt = [];
for (let y = 0; y < H; y++) { base.push(Array(W).fill(GR)); roomAt.push(Array(W).fill('yard')); doorAt.push(Array(W).fill(null)); }
for (let y = 0; y <= 20; y++) for (let x = 1; x <= 38; x++) { base[y][x] = WALL; roomAt[y][x] = null; }
for (const r of RDEF) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { base[y][x] = FLOOR; roomAt[y][x] = r.id; }
for (const d of DOORS) for (const [x, y] of d.t) { base[y][x] = DOOR; roomAt[y][x] = d.room; doorAt[y][x] = d; }
for (let y = 0; y <= 27; y++) for (const x of [0, 39]) if (!(x === 39 && (y === 23 || y === 24))) base[y][x] = HEDGE;
for (let x = 1; x <= 38; x++) if (x !== 19 && x !== 20) base[27][x] = FENCE;
for (let y = 21; y <= 27; y++) for (const x of [19, 20]) base[y][x] = PATH;
for (let x = 21; x <= 39; x++) for (const y of [23, 24]) base[y][x] = PATH;
for (let y = 28; y < H; y++) for (let x = 0; x < W; x++) base[y][x] = (x === 19 || x === 20) ? PLANK : WATER;
const DOORBELL = [21, 20];
const solidBase = (b) => b === WALL || b === WATER || b === HEDGE || b === FENCE;
const walkBase = (b) => b === GR || b === PATH || b === FLOOR;
const isFace = (x, y) => y >= 0 && y < H - 1 && x >= 0 && x < W && base[y][x] === WALL && walkBase(base[y + 1][x]);

/* =====================================================================
   ẢNH MẪU (vẽ pixel, chỉ để minh hoạ)
   ===================================================================== */
const artCache = {};
function genArt(key) {
  if (artCache[key]) return artCache[key];
  const c = mk(80, 60), g = c.getContext('2d');
  const sky = (a, b) => { for (let y = 0; y < 60; y++) { const t = y / 60; const m = (p, q) => Math.round(p + (q - p) * t); const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); R(g, `rgb(${m(A >> 16, B >> 16)},${m((A >> 8) & 255, (B >> 8) & 255)},${m(A & 255, B & 255)})`, 0, y, 80, 1); } };
  const person = (x, y, shirt, hair = '#2b2233') => { R(g, shirt, x - 3, y, 7, 8); disc(g, '#f2c9a0', x + 0.5, y - 3, 3); R(g, hair, x - 3, y - 7, 7, 3); };
  if (key === 'sunset') { sky('#ffb37a', '#7b5ea7'); disc(g, '#ffe39a', 40, 30, 9); for (let y = 34; y < 60; y++) R(g, y % 3 ? '#3d3a6b' : '#5a4f8a', 0, y, 80, 1); for (let y = 36; y < 58; y += 3) R(g, '#ffd27a', 34 + (y % 5), y, 12 - (y - 36) / 3, 1); R(g, '#1d1830', 0, 30, 18, 6); R(g, '#1d1830', 62, 28, 18, 8); }
  else if (key === 'sea') { sky('#9fd8ff', '#e6f6ff'); ell(g, '#fff', 18, 12, 9, 3); ell(g, '#fff', 58, 9, 7, 2.5); R(g, '#2f86c7', 0, 30, 80, 14); for (let x = 0; x < 80; x += 6) R(g, '#7cc4ea', x + (x % 4), 34 + (x % 7), 4, 1); R(g, '#ecd9a4', 0, 44, 80, 16); R(g, '#bfe6f7', 0, 43, 80, 2); R(g, '#c8553d', 60, 47, 8, 1); R(g, '#3b3350', 63, 47, 1, 9); }
  else if (key === 'city') { sky('#1d1b3a', '#4b3a6e'); for (let i = 0; i < 9; i++) { const bh = 18 + (hash(i, 1) * 30) | 0, bx = i * 9; R(g, '#2b2845', bx, 60 - bh, 8, bh); for (let wy = 60 - bh + 3; wy < 58; wy += 4) for (let wx = bx + 1; wx < bx + 7; wx += 3) if (hash(wx, wy) > 0.45) R(g, '#ffd27a', wx, wy, 1, 2); } disc(g, '#fff7d6', 64, 10, 4); }
  else if (key === 'class') { R(g, '#efe3c4', 0, 0, 80, 60); R(g, '#2f5d46', 14, 6, 52, 22); R(g, '#8a5c36', 12, 4, 56, 2); R(g, '#8a5c36', 12, 28, 56, 2); for (let i = 0; i < 4; i++) R(g, '#e6f2ea', 18, 10 + i * 4, 18 + (i * 7) % 20, 1); R(g, '#e6f2ea', 44, 12, 14, 8); for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) { const x = 8 + i * 13 + row * 4, y = 40 + row * 10; disc(g, ['#2b2233', '#5c3a20', '#3b3350'][(i + row) % 3], x, y, 4); R(g, ['#3d5a80', '#c8553d', '#6a994e', '#e0a32e'][(i + row) % 4], x - 5, y + 3, 10, 8); } }
  else if (key === 'stage') { R(g, '#14121f', 0, 0, 80, 60); for (const [x, c] of [[16, 'rgba(255,210,122,.35)'], [40, 'rgba(198,191,255,.35)'], [64, 'rgba(255,143,177,.35)']]) for (let y = 0; y < 36; y++) R(g, c, x - y / 3, y, (y / 3) * 2 + 2, 1); R(g, '#7b5ea7', 6, 6, 68, 6); R(g, '#ffd27a', 8, 8, 64, 2); R(g, '#3b2d4a', 0, 36, 80, 6); for (let i = 0; i < 5; i++) person(18 + i * 11, 26, ['#ffd27a', '#ff8fb1', '#7ee8ff', '#5ee0a0', '#c6bfff'][i]); for (let i = 0; i < 12; i++) disc(g, '#05040a', 3 + i * 7, 56, 4); }
  else if (key === 'group') { sky('#bfe6ff', '#e9f7ff'); R(g, '#6dbb5a', 0, 40, 80, 20); R(g, '#d8cfbc', 8, 14, 64, 26); R(g, '#b6a98f', 8, 14, 64, 3); for (let i = 0; i < 8; i++) R(g, '#9fd3f0', 12 + i * 8, 20, 5, 6); for (let i = 0; i < 9; i++) person(8 + i * 8, 40 + (i % 2) * 3, ['#3d5a80', '#c8553d', '#6a994e', '#e0a32e', '#7b5ea7'][i % 5]); }
  else if (key === 'love') { sky('#ffd6e2', '#ffeef3'); R(g, '#f6b8c9', 0, 44, 80, 16); person(33, 30, '#3d5a80'); person(46, 31, '#f08fa8', '#5c3a20'); R(g, '#f2c9a0', 36, 34, 8, 2); g.save(); g.scale(2, 2); heartPx(g, '#ff5d8a', 16, 4); g.restore(); for (let i = 0; i < 10; i++) heartPx(g, 'rgba(255,255,255,.5)', (hash(i, 3) * 74) | 0, (hash(i, 4) * 40) | 0); }
  else { sky('#cfe8ff', '#ffffff'); R(g, '#6dbb5a', 0, 42, 80, 18); R(g, '#e6ddca', 20, 16, 40, 26); R(g, '#c8553d', 18, 12, 44, 5); for (let i = 0; i < 4; i++) R(g, '#9fd3f0', 24 + i * 9, 22, 5, 7); disc(g, '#3d8c43', 10, 36, 8); disc(g, '#3d8c43', 70, 36, 8); }
  artCache[key] = c; return c;
}
const thumbCache = {};
function srcUrl(src) { if (!src) return ''; if (!src.startsWith('sample:')) return src; if (!thumbCache[src]) thumbCache[src] = genArt(src.slice(7)).toDataURL(); return thumbCache[src]; }
const imgCache = {};
function getImg(src) {
  if (!src) return null;
  if (src.startsWith('sample:')) return genArt(src.slice(7));
  let im = imgCache[src];
  if (!im) { im = new Image(); im.onload = () => { im._ok = true; }; im.src = src; imgCache[src] = im; }
  return im._ok ? im : null;
}

/* =====================================================================
   THÀNH TÍCH (biểu tượng pixel)
   ===================================================================== */
const KINDS = { cup: ['Cúp', '🏆'], medal: ['Huy chương', '🥇'], plaque: ['Kỷ niệm chương', '🎖️'], star: ['Danh hiệu', '⭐'], cert: ['Giấy khen / Chứng nhận', '📜'], book: ['Bài báo / Công bố', '📘'] };
function drawAward(g, kind, cx, by) {
  const GD = '#ffd27a', GS = '#e0a830';
  if (kind === 'cup') { R(g, '#7a5a24', cx - 3, by - 2, 6, 2); R(g, GS, cx - 1, by - 4, 2, 2); R(g, GD, cx - 4, by - 9, 8, 5); R(g, GS, cx + 2, by - 9, 2, 5); R(g, GD, cx - 5, by - 8, 1, 3); R(g, GD, cx + 4, by - 8, 1, 3); R(g, '#fff3c4', cx - 3, by - 8, 1, 3); }
  else if (kind === 'medal') { R(g, '#d9534f', cx - 3, by - 10, 2, 5); R(g, '#3d5a80', cx + 1, by - 10, 2, 5); disc(g, GS, cx, by - 3, 3); disc(g, GD, cx - 0.5, by - 3.5, 2); }
  else if (kind === 'plaque') { R(g, '#5c3a20', cx - 4, by - 10, 8, 10); R(g, '#3d2614', cx + 3, by - 10, 1, 10); R(g, GD, cx - 3, by - 8, 6, 4); R(g, '#e9d3a8', cx - 3, by - 3, 6, 1); }
  else if (kind === 'star') { R(g, '#7a5a24', cx - 3, by - 2, 6, 2); for (const [x, y, w] of [[0, 9, 1], [-1, 8, 3], [-4, 7, 9], [-3, 6, 7], [-2, 5, 5], [-3, 4, 2], [2, 4, 2]]) R(g, GD, cx + x, by - 2 - y + 5 - 1, w, 1); R(g, GS, cx - 1, by - 5, 3, 1); }
  else if (kind === 'cert') { R(g, '#fbf6ea', cx - 4, by - 7, 8, 6); R(g, '#d8cfbd', cx - 4, by - 2, 8, 1); R(g, '#c8553d', cx - 1, by - 8, 2, 8); disc(g, GD, cx, by - 4, 1.6); }
  else if (kind === 'book') { R(g, '#3d5a80', cx - 3, by - 10, 7, 10); R(g, '#2a3f5c', cx - 3, by - 10, 1, 10); R(g, GD, cx - 1, by - 8, 4, 1); R(g, '#e8dcc0', cx - 1, by - 6, 4, 1); }
}

/* =====================================================================
   NỘI THẤT — mỗi món: kích thước (ô), cách vẽ, có chứa ảnh/thành tích không
   rot: vẽ nhìn thẳng từ trên xuống rồi xoay 4 hướng · top: phần nhô lên trên ô
   ===================================================================== */
function sofaDraw(n) {
  return (g, it, c, w) => {
    R(g, SH, 1, 14, w - 2, 2); R(g, shade(c, -0.32), 1, 1, w - 2, 14); R(g, shade(c, -0.12), 1, 1, w - 2, 5); R(g, shade(c, 0.18), 1, 1, w - 2, 1);
    R(g, shade(c, -0.04), 1, 5, 3, 10); R(g, shade(c, -0.04), w - 4, 5, 3, 10); R(g, shade(c, 0.12), 1, 5, 3, 1); R(g, shade(c, 0.12), w - 4, 5, 3, 1);
    const sw = (w - 8) / n;
    for (let i = 0; i < n; i++) { const x = 4 + Math.round(i * sw), ww = Math.round(sw) - 1; R(g, c, x, 6, ww, 8); R(g, shade(c, 0.25), x, 6, ww, 1); R(g, shade(c, -0.05), x + 1, 2, ww - 2, 3); }
  };
}
function cabinet(g, top) { R(g, SH, 1, top + 13, 30, 3); R(g, WD.d, 1, 1, 30, top + 13); R(g, WD.a, 0, 0, 32, 3); R(g, WD.l, 0, 0, 32, 1); R(g, WD.k, 1, top + 10, 30, 3); }
const TYPES = {
  chair: { cat: 'chair', name: 'Ghế gỗ', w: 1, h: 1, rot: 1, sit: 1, pal: 'c', color: 0,
    draw(g, it, c) { R(g, SH, 3, 14, 11, 2); R(g, WD.d, 3, 3, 10, 11); R(g, WD.a, 3, 3, 10, 10); R(g, c, 4, 6, 8, 6); R(g, shade(c, 0.28), 4, 6, 8, 1); R(g, shade(c, -0.2), 4, 11, 8, 1); R(g, WD.k, 3, 1, 10, 4); R(g, WD.l, 3, 1, 10, 1); } },
  armchair: { cat: 'chair', name: 'Ghế bành', w: 1, h: 1, rot: 1, sit: 1, pal: 'c', color: 3, draw: sofaDraw(1) },
  sofa2: { cat: 'chair', name: 'Sofa 2 chỗ', w: 2, h: 1, rot: 1, sit: 1, pal: 'c', color: 1, draw: sofaDraw(2) },
  sofa3: { cat: 'chair', name: 'Sofa 3 chỗ', w: 3, h: 1, rot: 1, sit: 1, pal: 'c', color: 2, draw: sofaDraw(3) },
  stool: { cat: 'chair', name: 'Ghế đẩu', w: 1, h: 1, top: 2, sit: 1, pal: 'c', color: 0,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 5, 1.6); R(g, WD.k, 5, t + 6, 2, 8); R(g, WD.k, 9, t + 6, 2, 8); ell(g, shade(c, -0.28), 8, t + 5, 6, 4); ell(g, c, 8, t + 4, 6, 3.5); R(g, shade(c, 0.3), 5, t + 2, 3, 1); } },
  office: { cat: 'chair', name: 'Ghế xoay', w: 1, h: 1, rot: 1, sit: 1, pal: 'c', color: 6,
    draw(g, it, c) { R(g, SH, 2, 14, 12, 2); R(g, '#22212b', 3, 12, 10, 1); R(g, '#22212b', 3, 13, 1, 2); R(g, '#22212b', 12, 13, 1, 2); R(g, '#22212b', 7, 13, 2, 2); R(g, shade(c, -0.35), 3, 5, 10, 8); R(g, c, 4, 6, 8, 6); R(g, shade(c, 0.22), 4, 6, 8, 1); R(g, '#2b2a35', 3, 1, 10, 4); R(g, '#4a4856', 4, 2, 8, 1); R(g, '#2b2a35', 2, 6, 1, 5); R(g, '#2b2a35', 13, 6, 1, 5); } },
  beanbag: { cat: 'chair', name: 'Ghế lười', w: 1, h: 1, top: 2, sit: 1, pal: 'c', color: 4,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 7, 1.8); ell(g, shade(c, -0.28), 8, t + 8, 7.5, 6); ell(g, c, 8, t + 7, 7, 5.5); ell(g, shade(c, -0.12), 9, t + 8, 3, 2); R(g, shade(c, 0.32), 4, t + 3, 3, 1); } },
  bench_out: { cat: 'chair', name: 'Ghế băng ngoài sân', w: 2, h: 1, top: 8, sit: 1, sitDir: 0,
    draw(g, it, c, w, h, t) { R(g, SH, 2, t + 13, 28, 3); R(g, '#3b3350', 4, t + 7, 2, 7); R(g, '#3b3350', 26, t + 7, 2, 7); for (let i = 0; i < 3; i++) { R(g, WD.a, 2, t - 6 + i * 3, 28, 2); R(g, WD.l, 2, t - 6 + i * 3, 28, 1); } R(g, '#3b3350', 4, t - 6, 2, 9); R(g, '#3b3350', 26, t - 6, 2, 9); for (let i = 0; i < 3; i++) { R(g, WD.a, 2, t + 3 + i * 2, 28, 2); R(g, WD.d, 2, t + 4 + i * 2, 28, 1); } } },

  coffee: { cat: 'table', name: 'Bàn trà', w: 2, h: 1, top: 4,
    draw(g, it, c, w, h, t) { R(g, SH, 2, t + 13, 28, 2); R(g, WD.k, 3, t + 8, 2, 6); R(g, WD.k, 27, t + 8, 2, 6); R(g, WD.d, 2, t + 5, 28, 4); R(g, WD.a, 2, t - 3, 28, 9); R(g, WD.l, 2, t - 3, 28, 1); R(g, '#f1ece2', 7, t - 2, 4, 4); R(g, '#c8553d', 7, t - 1, 4, 1); R(g, '#3d5a80', 17, t - 1, 9, 5); R(g, '#e8dcc0', 17, t + 3, 9, 1); R(g, '#e0a32e', 18, t - 2, 7, 4); } },
  dining: { cat: 'table', name: 'Bàn ăn 6 người', w: 3, h: 2, top: 4, pal: 'c', color: 0,
    draw(g, it, c, w, h, t) { R(g, SH, 2, t + 29, 44, 2); R(g, WD.k, 3, t + 23, 3, 7); R(g, WD.k, 42, t + 23, 3, 7); R(g, WD.d, 2, t + 20, 44, 4); R(g, WD.a, 2, t - 3, 44, 24); R(g, WD.l, 2, t - 3, 44, 1); R(g, c, 18, t - 3, 12, 27); R(g, shade(c, 0.25), 18, t - 3, 12, 1);
      for (const [x, y] of [[9, t + 3], [9, t + 14], [39, t + 3], [39, t + 14]]) { ell(g, '#d8d3c8', x, y + 1, 4, 3); ell(g, '#ffffff', x, y, 4, 3); ell(g, '#e6e1d6', x, y, 2, 1.5); }
      R(g, '#7ee8ff', 23, t + 4, 2, 5); R(g, '#f08fa8', 22, t + 2, 4, 2); } },
  desk: { cat: 'table', name: 'Bàn làm việc', w: 2, h: 1, top: 10,
    draw(g, it, c, w, h, t) { R(g, SH, 1, t + 14, 30, 2); R(g, WD.d, 2, t + 4, 3, 11); R(g, WD.a, 1, t + 3, 30, 8); R(g, WD.d, 19, t + 4, 10, 6); R(g, WD.l, 23, t + 6, 2, 1); R(g, '#c9a06e', 1, t - 5, 30, 9); R(g, '#e0bf8f', 1, t - 5, 30, 1);
      R(g, '#c4c7cf', 5, t - 3, 13, 4); R(g, '#2b2a35', 6, t - 11, 11, 8); R(g, '#5aaee3', 7, t - 10, 9, 6); R(g, '#9fd8ff', 8, t - 9, 3, 1); R(g, '#3b3350', 25, t - 9, 1, 6); R(g, '#ffd27a', 23, t - 11, 5, 3); R(g, '#f1ece2', 20, t - 3, 3, 3); } },
  round: { cat: 'table', name: 'Bàn tròn nhỏ', w: 1, h: 1, top: 8,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 13, 5, 1.6); R(g, WD.k, 7, t + 3, 2, 10); R(g, WD.k, 4, t + 12, 8, 1); ell(g, WD.d, 8, t + 3, 7, 3.5); ell(g, WD.a, 8, t + 2, 7, 3); R(g, '#7ee8ff', 7, t - 4, 2, 5); R(g, '#f08fa8', 6, t - 7, 4, 3); R(g, '#6a994e', 5, t - 4, 1, 2); } },
  nightstand: { cat: 'table', name: 'Tủ đầu giường', w: 1, h: 1, top: 9,
    draw(g, it, c, w, h, t) { R(g, SH, 2, t + 13, 12, 2); R(g, WD.a, 2, t - 3, 12, 16); R(g, WD.l, 2, t - 4, 12, 3); R(g, WD.d, 3, t + 3, 10, 1); R(g, WD.d, 3, t + 8, 10, 1); R(g, '#ffd27a', 7, t + 5, 2, 1); R(g, '#ffd27a', 7, t + 10, 2, 1); R(g, '#3b3350', 7, t - 7, 2, 4); R(g, '#f6e3b0', 5, t - 9, 6, 3); } },
  counter: { cat: 'table', name: 'Bếp & bồn rửa', w: 3, h: 1, top: 8,
    draw(g, it, c, w, h, t) { R(g, SH, 0, t + 14, 48, 2); R(g, '#f1ece2', 0, t + 2, 48, 12); for (const x of [0, 16, 32]) { R(g, '#d8d1c3', x, t + 2, 1, 12); R(g, '#9a948a', x + 12, t + 6, 1, 3); } R(g, '#d9d6cf', 0, t - 7, 48, 10); R(g, '#efede8', 0, t - 7, 48, 1);
      R(g, '#9aa3ad', 5, t - 5, 12, 6); R(g, '#c4cbd3', 6, t - 4, 10, 4); R(g, '#8f969c', 10, t - 8, 2, 3); R(g, '#2b2a33', 28, t - 6, 15, 8); disc(g, '#555360', 32, t - 2, 2.5); disc(g, '#555360', 39, t - 2, 2.5); R(g, '#c8553d', 36, t - 7, 6, 4); } },

  trophy: { cat: 'shelf', name: 'Tủ cúp kính', w: 2, h: 1, top: 22, holds: { k: 'award', max: 3 },
    draw(g, it, c, w, h, t) { cabinet(g, t); R(g, '#2e2a3a', 3, 3, 26, 21); R(g, 'rgba(160,210,240,.16)', 3, 3, 26, 21); R(g, WD.l, 3, 12, 26, 2); R(g, WD.l, 3, 22, 26, 2); R(g, WD.a, 3, 25, 26, 8); R(g, WD.d, 16, 25, 1, 8); R(g, '#ffd27a', 13, 28, 1, 2); R(g, '#ffd27a', 19, 28, 1, 2);
      const sl = [[16, 12], [9, 22], [23, 22]]; (it.c || []).slice(0, 3).forEach((a, i) => drawAward(g, a.kind, sl[i][0], sl[i][1]));
      R(g, 'rgba(255,255,255,.22)', 5, 4, 1, 7); R(g, 'rgba(255,255,255,.22)', 6, 4, 1, 3); } },
  pedestal: { cat: 'shelf', name: 'Bục trưng bày', w: 1, h: 1, top: 14, holds: { k: 'award', max: 1 },
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 6, 1.6); R(g, '#d6cdb9', 2, t + 10, 12, 4); R(g, '#efe9dc', 4, 9, 8, t + 1); R(g, '#d6cdb9', 10, 9, 2, t + 1); R(g, '#ffffff', 5, 9, 1, t + 1); R(g, '#f7f2e8', 2, 6, 12, 3); R(g, '#d6cdb9', 2, 8, 12, 1);
      const a = (it.c || [])[0]; if (a) drawAward(g, a.kind, 8, 6); else R(g, 'rgba(0,0,0,.12)', 5, 5, 6, 1); } },
  wallshelf: { cat: 'shelf', name: 'Kệ treo tường', w: 2, h: 1, wall: 1, holds: { k: 'award', max: 2 },
    draw(g, it) { R(g, 'rgba(0,0,0,.12)', 3, 13, 26, 2); R(g, WD.a, 2, 11, 28, 2); R(g, WD.l, 2, 11, 28, 1); R(g, WD.k, 2, 13, 28, 1); R(g, WD.k, 5, 14, 2, 2); R(g, WD.k, 25, 14, 2, 2); const sl = [10, 22]; (it.c || []).slice(0, 2).forEach((a, i) => drawAward(g, a.kind, sl[i], 11)); } },
  bookshelf: { cat: 'shelf', name: 'Kệ sách', w: 2, h: 1, top: 22,
    draw(g, it, c, w, h, t) { cabinet(g, t); R(g, '#3a2a1e', 3, 3, 26, 30); for (const sy of [12, 23]) R(g, WD.l, 3, sy, 26, 2);
      const cols = ['#c8553d', '#3d5a80', '#6a994e', '#e0a32e', '#7b5ea7', '#e8dcc0', '#f08fa8'];
      [[3, 12], [14, 23], [25, 33]].forEach(([y0, y1], r) => { let x = 3; let k = 0; while (x < 28) { const bw = 2 + ((hash(x, r, it.x) * 2) | 0), bh = 6 + ((hash(r, x, 3) * 3) | 0); if (x + bw > 29) break; R(g, cols[(hash(x, r, 7) * 7) | 0], x, y1 - bh, bw, bh); R(g, 'rgba(255,255,255,.25)', x, y1 - bh + 1, bw, 1); x += bw + (hash(k++, r) < 0.15 ? 2 : 0); } }); } },

  frame_s: { cat: 'photo', name: 'Khung ảnh nhỏ', w: 1, h: 1, wall: 1, pal: 'f', color: 0, holds: { k: 'photo', max: 1 }, photo: [[3, 2, 10, 10]],
    draw(g, it, c) { R(g, 'rgba(0,0,0,.16)', 3, 13, 12, 1); R(g, c, 2, 1, 12, 12); R(g, shade(c, -0.3), 2, 12, 12, 1); R(g, shade(c, 0.3), 2, 1, 12, 1); R(g, '#d8d3c8', 3, 2, 10, 10); R(g, '#b9b3a5', 4, 8, 3, 3); R(g, '#a39d8f', 6, 6, 4, 5); disc(g, '#fff', 10, 4.5, 1.2); } },
  frame_l: { cat: 'photo', name: 'Khung ảnh lớn', w: 2, h: 1, wall: 1, pal: 'f', color: 2, holds: { k: 'photo', max: 1 }, photo: [[4, 3, 24, 9]],
    draw(g, it, c) { R(g, 'rgba(0,0,0,.16)', 3, 14, 28, 1); R(g, c, 2, 1, 28, 13); R(g, shade(c, -0.3), 2, 13, 28, 1); R(g, shade(c, 0.3), 2, 1, 28, 1); R(g, '#f1ece2', 3, 2, 26, 11); R(g, '#d8d3c8', 4, 3, 24, 9); R(g, '#a39d8f', 10, 7, 8, 5); R(g, '#b9b3a5', 16, 9, 8, 3); disc(g, '#fff', 23, 5.5, 1.5); } },
  photowall: { cat: 'photo', name: 'Dây ảnh polaroid', w: 3, h: 1, wall: 1, holds: { k: 'photo', max: 3 }, photo: [[5, 4, 10, 8], [19, 5, 10, 8], [33, 4, 10, 8]],
    draw(g) { for (let x = 1; x < 47; x++) { const y = 2 + Math.round(Math.sin((x / 46) * Math.PI) * 1.5); R(g, '#8a7a66', x, y, 1, 1); if (x % 5 === 0) R(g, ['#ffd27a', '#ff8fb1', '#7ee8ff', '#5ee0a0'][(x / 5) % 4], x, y + 1, 1, 1); }
      for (const [x, y] of [[4, 3], [18, 4], [32, 3]]) { R(g, 'rgba(0,0,0,.15)', x + 1, y + 1, 12, 12); R(g, '#fbf8f1', x, y, 12, 12); R(g, '#d8d3c8', x + 1, y + 1, 10, 8); R(g, '#c99a3a', x + 5, y - 1, 2, 2); } } },
  easel: { cat: 'photo', name: 'Giá vẽ đứng', w: 1, h: 1, top: 14, holds: { k: 'photo', max: 1 }, photo: [[3, 2, 10, 10]],
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 6, 1.5); R(g, WD.k, 7, 4, 2, t + 9); R(g, WD.d, 3, 12, 2, t + 2); R(g, WD.d, 11, 12, 2, t + 2); R(g, WD.d, 2, t + 12, 2, 2); R(g, WD.d, 12, t + 12, 2, 2); R(g, '#fbf6ea', 2, 1, 12, 12); R(g, '#d8cfbd', 2, 12, 12, 1); R(g, '#d8d3c8', 3, 2, 10, 10); R(g, WD.a, 1, 13, 14, 2); R(g, WD.l, 1, 13, 14, 1); } },
  cert: { cat: 'photo', name: 'Bằng khen treo tường', w: 1, h: 1, wall: 1, holds: { k: 'award', max: 1 }, photo: [[4, 2, 8, 10]],
    draw(g, it) { R(g, 'rgba(0,0,0,.16)', 4, 14, 10, 1); R(g, WD.k, 3, 1, 10, 13); R(g, '#fbf6ea', 4, 2, 8, 11); R(g, '#c99a3a', 4, 2, 8, 1); R(g, '#c8553d', 6, 4, 4, 1); for (let i = 0; i < 3; i++) R(g, '#c9c1ae', 5, 6 + i * 2, 6, 1); disc(g, '#e0a830', 9, 11, 1.8); } },
  album: { cat: 'photo', name: 'Bàn album ảnh', w: 1, h: 1, top: 8, holds: { k: 'photo', max: 30 },
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 13, 6, 1.6); R(g, WD.k, 7, t + 3, 2, 10); R(g, WD.k, 4, t + 12, 8, 1); R(g, WD.d, 1, t - 2, 14, 6); R(g, WD.a, 1, t - 3, 14, 5); R(g, WD.l, 1, t - 3, 14, 1); R(g, '#8a2f3a', 2, t - 7, 12, 6); R(g, '#fbf8f1', 3, t - 7, 5, 5); R(g, '#fbf8f1', 8, t - 7, 5, 5); R(g, '#7ee8ff', 4, t - 6, 3, 2); R(g, '#f08fa8', 9, t - 6, 3, 2); R(g, '#c9c1ae', 4, t - 3, 3, 1); R(g, '#c9c1ae', 9, t - 3, 3, 1); } },

  plant: { cat: 'decor', name: 'Chậu cây', w: 1, h: 1, top: 10,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 5, 1.5); R(g, '#c8693d', 5, t + 6, 6, 8); R(g, '#a5532c', 9, t + 6, 2, 8); R(g, '#e08a5a', 4, t + 5, 8, 2); for (const [x, y, r] of [[8, t - 2, 4], [5, t + 1, 3.5], [11, t + 1, 3.5], [8, t + 3, 3]]) disc(g, '#3d8c43', x, y, r); disc(g, '#66b85c', 7, t - 3, 2); disc(g, '#66b85c', 4, t, 1.5); R(g, '#2f7536', 10, t + 2, 2, 2); } },
  monstera: { cat: 'decor', name: 'Cây trầu bà lớn', w: 1, h: 1, top: 18, padX: 3,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 6, 1.6); R(g, '#ece5d6', 4, t + 5, 8, 9); R(g, '#d6cdb9', 10, t + 5, 2, 9); R(g, '#f7f2e8', 3, t + 4, 10, 2); R(g, '#3a6b33', 7, t - 6, 2, 11);
      for (const [x, y, rx, ry] of [[3, t - 4, 5, 4], [13, t - 6, 5, 4], [8, t - 12, 5, 4.5], [2, t + 1, 4, 3], [14, t, 4, 3]]) { ell(g, '#2f7536', x, y, rx, ry); ell(g, '#3d8c43', x - 0.5, y - 0.5, rx - 1, ry - 1); R(g, '#255f2c', x - 1, y, 3, 1); } R(g, '#66b85c', 7, t - 14, 2, 1); } },
  lamp: { cat: 'decor', name: 'Đèn cây', w: 1, h: 1, top: 20, pal: 'c', color: 3, glow: [8, 6],
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 4, 1.3); R(g, '#3b3350', 5, t + 11, 6, 2); R(g, '#3b3350', 7, 7, 2, t + 5); for (let y = 0; y < 8; y++) R(g, y < 1 ? shade(c, -0.3) : c, 6 - y / 2, y, 4 + y, 1); R(g, shade(c, 0.35), 3, 7, 10, 1); R(g, '#fff3c4', 6, 8, 4, 1); } },
  rug: { cat: 'decor', name: 'Thảm chữ nhật', w: 3, h: 2, rug: 1, pal: 'c', color: 0,
    draw(g, it, c) { R(g, shade(c, -0.28), 1, 2, 46, 28); R(g, c, 3, 4, 42, 24); R(g, shade(c, 0.3), 5, 6, 38, 1); R(g, shade(c, 0.3), 5, 25, 38, 1); for (let i = 0; i < 9; i++) { R(g, shade(c, -0.15), 24 - i * 2, 16 - i, i * 4, 1); R(g, shade(c, -0.15), 24 - i * 2, 16 + i, i * 4, 1); } for (let y = 3; y < 30; y += 2) { R(g, '#f1ece2', 0, y, 1, 1); R(g, '#f1ece2', 47, y, 1, 1); } } },
  rugr: { cat: 'decor', name: 'Thảm tròn', w: 2, h: 2, rug: 1, pal: 'c', color: 5,
    draw(g, it, c) { ell(g, shade(c, -0.25), 16, 16, 15, 14); ell(g, c, 16, 16, 13, 12); ell(g, shade(c, 0.22), 16, 16, 9, 8); ell(g, c, 16, 16, 6, 5.5); ell(g, shade(c, 0.35), 16, 16, 2.5, 2); } },
  tv: { cat: 'decor', name: 'Tivi treo tường', w: 2, h: 1, wall: 1,
    draw(g) { R(g, 'rgba(0,0,0,.18)', 3, 14, 28, 1); R(g, '#1d1c24', 1, 1, 30, 13); R(g, '#2c4a7a', 2, 2, 28, 11); R(g, '#3d6aa8', 2, 2, 28, 5); R(g, 'rgba(255,255,255,.18)', 4, 3, 8, 1); R(g, 'rgba(255,255,255,.1)', 4, 4, 5, 1); R(g, '#5ee0a0', 28, 12, 1, 1); } },
  clock: { cat: 'decor', name: 'Đồng hồ', w: 1, h: 1, wall: 1,
    draw(g) { disc(g, 'rgba(0,0,0,.15)', 8.5, 7.5, 6); disc(g, '#3b3350', 8, 7, 6); disc(g, '#fbf8f1', 8, 7, 5); R(g, '#3b3350', 7.5, 3, 1, 4); R(g, '#c8553d', 8, 7, 3, 1); R(g, '#3b3350', 7, 6, 2, 2); } },
  window: { cat: 'decor', name: 'Cửa sổ rèm', w: 2, h: 1, wall: 1, pal: 'c', color: 7,
    draw(g, it, c) { R(g, '#f1ece2', 3, 1, 26, 13); R(g, '#9fd3f0', 5, 3, 10, 9); R(g, '#9fd3f0', 17, 3, 10, 9); R(g, '#d6efff', 5, 3, 10, 3); R(g, '#d6efff', 17, 3, 10, 3); ell(g, '#fff', 9, 6, 3, 1.2); R(g, '#d9d1c2', 3, 12, 26, 2); R(g, WD.k, 0, 0, 32, 1); R(g, c, 0, 1, 4, 14); R(g, c, 28, 1, 4, 14); R(g, shade(c, -0.2), 2, 1, 1, 14); R(g, shade(c, -0.2), 29, 1, 1, 14); } },
  bed: { cat: 'decor', name: 'Giường đôi', w: 2, h: 3, rot: 1, pal: 'c', color: 5,
    draw(g, it, c) { R(g, SH, 1, 46, 30, 2); R(g, WD.d, 0, 0, 32, 47); R(g, WD.k, 0, 0, 32, 6); R(g, WD.a, 1, 1, 30, 4); R(g, WD.l, 1, 1, 30, 1); R(g, '#f7f3ea', 2, 6, 28, 39); for (const x of [4, 17]) { R(g, '#ffffff', x, 8, 11, 7); R(g, '#e6e1d6', x, 14, 11, 1); } R(g, c, 2, 19, 28, 26); R(g, shade(c, 0.3), 2, 19, 28, 3); for (let y = 25; y < 44; y += 5) for (let x = 5; x < 29; x += 6) R(g, shade(c, -0.14), x + (y % 2), y, 2, 2); } },
  piano: { cat: 'decor', name: 'Đàn piano', w: 2, h: 1, top: 12,
    draw(g, it, c, w, h, t) { R(g, SH, 1, t + 14, 30, 2); R(g, '#1d1c24', 1, 0, 30, t + 14); R(g, '#45434f', 1, 0, 30, 1); R(g, '#fbf6ea', 11, 2, 10, 7); R(g, '#c9c1ae', 12, 4, 8, 1); R(g, '#c9c1ae', 12, 6, 8, 1); R(g, '#2b2a33', 0, t - 2, 32, 5); R(g, '#f7f3ea', 1, t - 1, 30, 3); for (let x = 2; x < 30; x += 3) if (x % 7 !== 3) R(g, '#1d1c24', x, t - 1, 1, 2); R(g, '#ffd27a', 14, t + 11, 1, 1); R(g, '#ffd27a', 17, t + 11, 1, 1); } },
  aquarium: { cat: 'decor', name: 'Bể cá', w: 2, h: 1, top: 12, glow: [16, 6, '#7ee8ff'],
    draw(g, it, c, w, h, t) { R(g, SH, 1, t + 14, 30, 2); R(g, WD.d, 1, t + 3, 30, 11); R(g, WD.k, 16, t + 4, 1, 9); R(g, '#ffd27a', 13, t + 8, 1, 2); R(g, '#ffd27a', 19, t + 8, 1, 2); R(g, '#2b2a33', 1, 0, 30, t + 3); R(g, '#1d5f8a', 2, 1, 28, t + 1); R(g, '#2f86c7', 2, 4, 28, t - 3); R(g, '#e8d29a', 2, t - 1, 28, 2); for (const x of [5, 9, 24]) R(g, '#5aa84b', x, t - 6, 1, 6); R(g, '#f0a040', 12, 6, 4, 2); R(g, '#f0a040', 16, 6, 1, 1); R(g, '#ff8fb1', 20, 9, 3, 2); R(g, '#bfe6f7', 7, 3, 1, 1); R(g, '#bfe6f7', 8, 1, 1, 1); } },
  catbed: { cat: 'decor', name: 'Ổ mèo (có mèo)', w: 1, h: 1, top: 2, pal: 'c', color: 6,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 7, 1.6); ell(g, shade(c, -0.25), 8, t + 9, 7.5, 5.5); ell(g, c, 8, t + 8, 7, 5); ell(g, shade(c, 0.25), 8, t + 8, 5, 3.3); ell(g, '#f0a040', 7, t + 7, 4, 2.6); disc(g, '#f0a040', 11, t + 6, 2.4); R(g, '#f0a040', 10, t + 3, 1, 1); R(g, '#f0a040', 12, t + 3, 1, 1); R(g, '#c87a28', 5, t + 6, 1, 2); R(g, '#c87a28', 7, t + 6, 1, 2); R(g, '#241a26', 11, t + 6, 1, 1); } },
  fridge: { cat: 'decor', name: 'Tủ lạnh', w: 1, h: 1, top: 18,
    draw(g, it, c, w, h, t) { R(g, SH, 1, t + 14, 14, 2); R(g, '#e8ecef', 1, 0, 14, t + 14); R(g, '#c9cfd4', 12, 0, 3, t + 14); R(g, '#ffffff', 1, 0, 14, 1); R(g, '#b4bcc2', 1, 11, 14, 1); R(g, '#8f969c', 11, 4, 1, 5); R(g, '#8f969c', 11, 15, 1, 8); R(g, '#c8553d', 3, 3, 2, 2); R(g, '#ffd27a', 6, 5, 2, 2); R(g, '#7ee8ff', 4, 15, 3, 2); } },

  tree: { cat: 'yard', name: 'Cây xanh', w: 1, h: 1, top: 18, padX: 4, yard: 1,
    draw(g, it, c, w, h, t) { ell(g, 'rgba(30,70,30,.3)', 8, t + 14, 8, 2); R(g, '#7b4a2a', 6, t + 3, 4, 11); R(g, '#5a3420', 9, t + 3, 1, 11); disc(g, '#255f2c', 8, t - 5, 10); disc(g, '#3d8c43', 7.5, t - 6, 9); disc(g, '#66b85c', 4, t - 10, 3.5); disc(g, '#2f7536', 12, t - 1, 4); R(g, '#8fd27c', 3, t - 12, 2, 1); } },
  flowers: { cat: 'yard', name: 'Luống hoa', w: 1, h: 1, top: 4, yard: 1,
    draw(g, it, c, w, h, t) { R(g, WD.d, 1, t + 6, 14, 9); R(g, WD.a, 1, t + 6, 14, 2); R(g, '#5c3a20', 2, t + 8, 12, 2); const cols = ['#ffffff', '#ffd34d', '#ff9fc0', '#c6bfff', '#ff8a80']; for (let i = 0; i < 5; i++) { const x = 3 + i * 2.5, y = t + 1 + (i % 2) * 3; R(g, '#3d8c43', x + 1, y + 2, 1, 5); const cc = cols[(i + it.x) % 5]; R(g, cc, x, y, 3, 1); R(g, cc, x + 1, y - 1, 1, 3); R(g, '#f6a623', x + 1, y, 1, 1); } } },
  lantern: { cat: 'yard', name: 'Đèn đá', w: 1, h: 1, top: 16, glow: [8, 9], yard: 1,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 5, 1.5); R(g, '#b6a98f', 4, t + 11, 8, 3); R(g, '#cfc6b4', 6, t + 2, 4, 9); R(g, '#cfc6b4', 3, 5, 10, 8); R(g, '#ffe39a', 5, 7, 6, 4); R(g, '#9a8f79', 1, 2, 14, 3); R(g, '#b6a98f', 3, 1, 10, 1); R(g, '#9a8f79', 7, 0, 2, 1); } },
  mailbox: { cat: 'yard', name: 'Hộp thư', w: 1, h: 1, top: 10, pal: 'c', color: 0, yard: 1,
    draw(g, it, c, w, h, t) { ell(g, SH, 8, t + 14, 4, 1.3); R(g, WD.d, 7, t + 1, 2, 13); R(g, c, 3, 2, 10, 8); R(g, shade(c, 0.25), 3, 2, 10, 1); R(g, shade(c, -0.3), 3, 9, 10, 1); R(g, '#241a26', 4, 5, 3, 1); R(g, '#ffd27a', 12, 0, 1, 5); R(g, '#ffd27a', 12, 0, 3, 2); } },
  sign: { cat: 'yard', name: 'Biển tên nhà', w: 1, h: 1, top: 10, yard: 1,
    draw(g, it, c, w, h, t) { R(g, '#6b4a2a', 3, t + 2, 2, 12); R(g, '#6b4a2a', 11, t + 2, 2, 12); R(g, '#8a5c36', 0, 0, 16, 11); R(g, '#e9d3a8', 1, 1, 14, 9); R(g, '#7a5a3a', 3, 3, 10, 1); R(g, '#9a8a70', 3, 6, 8, 1); heartPx(g, '#ff8fb1', 9, 4); } },
};
const CATS = [['chair', 'Ghế'], ['table', 'Bàn'], ['shelf', 'Kệ & Tủ'], ['photo', 'Ảnh & Khung'], ['decor', 'Trang trí'], ['yard', 'Sân vườn'], ['room', 'Sàn & Tường']];
const FLOORS = { wood: 'Gỗ ấm', oak: 'Gỗ sồi sáng', darkwood: 'Gỗ óc chó', tile: 'Gạch men', marble: 'Đá hoa', lilac: 'Thảm tím', pink: 'Thảm hồng', tatami: 'Chiếu tatami', concrete: 'Xi măng' };
const WALLS = ['#f1e6d6', '#efe3c4', '#e3ecf3', '#e6efe9', '#ecdcf2', '#f6d3dd', '#d9e4d0', '#f5f1ea', '#e8c9a8', '#c9d6e8', '#4a4560', '#2f3b38'];


function drawFloor(g, f, px, py, x, y) {
  if (f === 'wood' || f === 'oak' || f === 'darkwood') {
    const [a, b, c] = f === 'wood' ? ['#b5845a', '#9a6b44', '#c49468'] : f === 'oak' ? ['#d9b48a', '#c49a6c', '#e7c79f'] : ['#7a5236', '#64422a', '#8a6142'];
    R(g, a, px, py, T, T); for (let j = 0; j < T; j += 4) { R(g, b, px, py + j + 3, T, 1); R(g, c, px, py + j, T, 1); R(g, b, px + Math.floor(hash(x, y, j) * 14), py + j, 1, 3); }
  } else if (f === 'tile') { const a = (x + y) % 2 === 0; R(g, a ? '#f3f1ec' : '#d7dfe3', px, py, T, T); R(g, '#c4cbd0', px, py, T, 1); R(g, '#c4cbd0', px, py, 1, T); R(g, 'rgba(255,255,255,.5)', px + 2, py + 2, 3, 1); }
  else if (f === 'marble') { const a = (x + y) % 2 === 0; R(g, a ? '#ece5d6' : '#ddd3c0', px, py, T, T); R(g, '#cbbfa8', px, py, T, 1); R(g, '#cbbfa8', px, py, 1, T); if (hash(x, y, 5) < 0.5) { const vx = Math.floor(hash(x, y, 6) * 10); R(g, '#cdc2ad', px + vx + 2, py + 4, 1, 3); R(g, '#cdc2ad', px + vx + 3, py + 7, 1, 3); } R(g, 'rgba(255,255,255,.35)', px + 2, py + 2, 3, 1); }
  else if (f === 'lilac') { R(g, '#c9b8e6', px, py, T, T); for (let j = 2; j < T; j += 5) for (let i = 2; i < T; i += 5) R(g, '#bba8dc', px + i + (j % 2), py + j, 2, 1); }
  else if (f === 'pink') { R(g, '#f4c3cf', px, py, T, T); R(g, '#efb4c3', px, py + 15, T, 1); if (hash(x, y, 11) < 0.3) heartPx(g, '#eb9fb4', px + 3 + Math.floor(hash(x, y, 12) * 6), py + 3 + Math.floor(hash(x, y, 13) * 6)); }
  else if (f === 'tatami') { R(g, '#d6cc8f', px, py, T, T); const v = (Math.floor(x / 2) + Math.floor(y / 1)) % 2; for (let i = 0; i < T; i += 2) v ? R(g, '#c7bd7e', px + i, py, 1, T) : R(g, '#c7bd7e', px, py + i, T, 1); R(g, '#5e6b3a', px, py, T, 1); }
  else { R(g, '#bdb9b2', px, py, T, T); if (hash(x, y, 2) < 0.4) R(g, '#aeaaa2', px + Math.floor(hash(x, y, 3) * 13), py + Math.floor(hash(x, y, 4) * 13), 3, 2); R(g, '#c9c5be', px, py, T, 1); }
}
function drawGrass(g, px, py, x, y) { R(g, '#6dbb5a', px, py, T, T); for (let i = 0; i < 4; i++) { const hx = Math.floor(hash(x, y, i) * 15), hy = Math.floor(hash(x, y, i + 9) * 15); R(g, '#5aa84b', px + hx, py + hy, 2, 1); R(g, '#5aa84b', px + hx, py + hy - 1, 1, 1); } R(g, '#86cf6e', px + Math.floor(hash(x, y, 21) * 14), py + Math.floor(hash(x, y, 22) * 14), 1, 1); }
function drawStone(g, px, py) { R(g, '#d6cbb5', px, py, T, T); R(g, '#b6a98f', px, py, T, 1); R(g, '#b6a98f', px, py + 8, T, 1); R(g, '#b6a98f', px, py, 1, 8); R(g, '#b6a98f', px + 8, py + 8, 1, 8); R(g, '#e6ddca', px + 1, py + 1, 7, 1); R(g, '#e6ddca', px + 9, py + 1, 7, 1); R(g, '#e6ddca', px, py + 9, 8, 1); R(g, '#e6ddca', px + 9, py + 9, 7, 1); }
function drawWater(g, px, py, x, y) { R(g, '#3f95d1', px, py, T, T); R(g, '#3786c0', px, py + 10, T, 6); if (hash(x, y, 81) < 0.3) R(g, '#5aaee3', px + Math.floor(hash(x, y, 82) * 10), py + 4 + Math.floor(hash(x, y, 83) * 8), 4, 1); if (y === 28 && base[27][x] !== PLANK) { R(g, '#bfe6f7', px, py, T, 2); R(g, '#7cc4ea', px, py + 2, T, 1); } }
function drawPlank(g, px, py, x, y) { drawWater(g, px, py, x, y); R(g, '#a8774a', px + (x === 19 ? 2 : 0), py, T - 2, T); for (let j = 0; j < T; j += 4) { R(g, '#8a5c36', px + (x === 19 ? 2 : 0), py + j + 3, T - 2, 1); R(g, '#bf8f5e', px + (x === 19 ? 2 : 0), py + j, T - 2, 1); } R(g, '#5c3a20', x === 19 ? px + 1 : px + 14, py, 2, T); }
function drawHedge(g, px, py, x, y) { drawGrass(g, px, py, x, y); R(g, '#2f7536', px, py + 1, T, 14); R(g, '#3d8c43', px + 1, py + 1, T - 2, 10); for (let i = 0; i < 3; i++) disc(g, '#4fa04f', px + 3 + i * 5, py + 4 + (i % 2) * 3, 2); R(g, 'rgba(0,0,0,.18)', px, py + 14, T, 2); }
function drawFence(g, px, py, x, y) { drawGrass(g, px, py, x, y); R(g, 'rgba(0,0,0,.15)', px, py + 13, T, 2); R(g, '#f1ece2', px, py + 5, T, 2); R(g, '#f1ece2', px, py + 10, T, 2); for (const i of [2, 10]) { R(g, '#ffffff', px + i, py + 1, 4, 13); R(g, '#d8d1c3', px + i + 3, py + 2, 1, 12); R(g, '#ffffff', px + i + 1, py, 2, 1); } }
function drawCap(g, px, py, x, y) {
  R(g, '#2a2638', px, py, T, T);
  const fl = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && base[yy][xx] !== WALL && !(yy > 20);
  if (fl(x - 1, y)) R(g, '#4a4360', px, py, 2, T); if (fl(x + 1, y)) R(g, '#4a4360', px + 14, py, 2, T); if (fl(x, y - 1)) R(g, '#4a4360', px, py, T, 2);
  if (hash(x, y, 2) < 0.2) R(g, '#332e45', px + 4, py + 6, 6, 1);
}
function drawRoof(g) {
  const x0 = T, x1 = 39 * T, y0 = 0, y1 = 20 * T;
  for (let y = y0; y < y1; y += 4) { const k = (y / 4) % 2; R(g, y < 160 ? '#b5523b' : '#a54a35', x0, y, x1 - x0, 4); for (let x = x0 + (k ? 6 : 0); x < x1; x += 12) R(g, y < 160 ? '#8f3e2d' : '#863a2a', x, y, 1, 4); R(g, 'rgba(255,255,255,.08)', x0, y, x1 - x0, 1); }
  R(g, '#7a3324', x0, 156, x1 - x0, 6); R(g, '#d06a4f', x0, 156, x1 - x0, 1);
  R(g, '#6b5a50', 30 * T, 2 * T, 2 * T, 3 * T); R(g, '#857266', 30 * T, 2 * T, 2 * T, 3); R(g, '#3b3350', 30 * T + 2, 2 * T - 2, 2 * T - 4, 3);
  R(g, 'rgba(0,0,0,.25)', x0, y1 - 3, x1 - x0, 3);
}

const pcache = new Map();
function personSprite(dir, step, shirt, hair, sitting) {
  const key = [dir, step, shirt, hair, sitting].join('|'); let c = pcache.get(key); if (c) return c;
  c = mk(18, 22); const g = c.getContext('2d'); g.translate(1, 1);
  const pants = '#3b3a48', skin = '#f2c9a0';
  if (!sitting) { R(g, pants, 5, 15 - (step === 1 ? 1 : 0), 2, 4); R(g, pants, 9, 15 - (step === 2 ? 1 : 0), 2, 4); R(g, '#241a26', 5, 18 - (step === 1 ? 1 : 0), 2, 1); R(g, '#241a26', 9, 18 - (step === 2 ? 1 : 0), 2, 1); }
  else if (dir !== 2) { R(g, pants, 5, 15, 2, 2); R(g, pants, 9, 15, 2, 2); }
  R(g, shirt, 4, 10, 8, 6); R(g, shade(shirt, -0.3), 4, 15, 8, 1); R(g, shade(shirt, -0.15), 3, 10, 1, 5); R(g, shade(shirt, -0.15), 12, 10, 1, 5); R(g, skin, 3, 15, 1, 1); R(g, skin, 12, 15, 1, 1);
  R(g, skin, 4, 3, 8, 7);
  if (dir === 2) { R(g, hair, 4, 2, 8, 7); R(g, hair, 3, 3, 1, 6); R(g, hair, 12, 3, 1, 6); }
  else {
    R(g, hair, 4, 2, 8, 2); R(g, hair, 3, 3, 1, 4); R(g, hair, 12, 3, 1, 4);
    if (dir === 0) { R(g, hair, 4, 4, 8, 1); R(g, '#241a26', 6, 6, 1, 2); R(g, '#241a26', 9, 6, 1, 2); R(g, '#f0a0a0', 5, 8, 1, 1); R(g, '#f0a0a0', 10, 8, 1, 1); }
    else if (dir === 1) { R(g, hair, 6, 4, 7, 2); R(g, hair, 10, 6, 3, 3); R(g, '#241a26', 5, 6, 1, 2); }
    else { R(g, hair, 3, 4, 7, 2); R(g, hair, 3, 6, 3, 3); R(g, '#241a26', 10, 6, 1, 2); }
  }
  outline(c); pcache.set(key, c); return c;
}
const DV = [[0, 1], [-1, 0], [0, -1], [1, 0]];


/* =====================================================================
   NHÀ MẪU — dùng khi chưa lưu bố cục nào lên Supabase
   ===================================================================== */
export function defaultLayout() {
  let n = 0;
  const it = (type, x, y, dir = 0, color, c) => ({ id: 'i' + (++n), type, x, y, dir, color: color ?? (TYPES[type].color || 0), c: c || [] });
  const ph = (art, title) => ({ k: 'photo', img: 'sample:' + art, title, date: 'Ảnh mẫu', note: 'Ảnh minh hoạ — chủ nhà sẽ sớm thay bằng ảnh thật.' });
  const aw = (kind, title) => ({ k: 'award', kind, title, date: '', org: '', note: 'Thành tích mẫu — chủ nhà sẽ sớm cập nhật.' });
  const items = [
    it('tv', 22, 10), it('clock', 24, 10), it('bookshelf', 14, 11), it('frame_l', 16, 10, 0, 2, [ph('group', 'Ảnh mẫu — cả lớp')]), it('plant', 18, 11), it('plant', 25, 11),
    it('rugr', 22, 14, 0, 1), it('coffee', 22, 14), it('sofa2', 22, 16, 2, 1), it('armchair', 24, 14, 1, 3), it('lamp', 21, 16), it('piano', 14, 17), it('stool', 14, 18, 0, 0), it('catbed', 17, 19),
    it('trophy', 2, 11, 0, 0, [aw('cup', 'Cúp (mẫu)'), aw('medal', 'Huy chương (mẫu)'), aw('plaque', 'Kỷ niệm chương (mẫu)')]), it('cert', 4, 10, 0, 0, [aw('cert', 'Giấy khen (mẫu)')]), it('cert', 5, 10),
    it('wallshelf', 8, 10, 0, 0, [aw('star', 'Danh hiệu (mẫu)'), aw('book', 'Bài báo khoa học (mẫu)')]), it('trophy', 11, 11),
    it('pedestal', 4, 14, 0, 0, [aw('cup', 'Cột mốc lớn nhất (mẫu)')]), it('pedestal', 9, 14), it('pedestal', 4, 17), it('pedestal', 9, 17),
    it('rug', 6, 15, 0, 0), it('sofa2', 6, 18, 2, 4), it('plant', 2, 19), it('plant', 12, 19),
    it('frame_l', 27, 10, 0, 0, [ph('sunset', 'Ảnh mẫu — hoàng hôn')]), it('frame_s', 29, 10, 0, 1, [ph('sea', 'Ảnh mẫu — biển')]), it('frame_s', 30, 10, 0, 1, [ph('city', 'Ảnh mẫu — phố đêm')]),
    it('frame_l', 33, 10, 0, 0, [ph('stage', 'Ảnh mẫu — chương trình cùng sinh viên')]), it('photowall', 35, 10, 0, 0, [ph('class', 'Ảnh mẫu — lớp học'), ph('campus', 'Ảnh mẫu — trường'), ph('group', 'Ảnh mẫu — ngoại khoá')]),
    it('easel', 29, 14, 0, 0, [ph('class', 'Ảnh mẫu — buổi học cuối')]), it('easel', 34, 14), it('easel', 29, 17), it('easel', 34, 17),
    it('album', 37, 15), it('sofa2', 31, 17, 2, 6), it('plant', 27, 19), it('plant', 37, 19),
    it('window', 15, 1, 0, 7), it('clock', 18, 1), it('counter', 22, 2), it('fridge', 25, 2), it('dining', 15, 4, 0, 0),
    it('chair', 15, 3, 0, 1), it('chair', 17, 3, 0, 1), it('chair', 15, 6, 2, 1), it('chair', 17, 6, 2, 1), it('plant', 14, 8),
    it('bed', 3, 2, 0, 5), it('nightstand', 2, 2), it('nightstand', 5, 2), it('frame_l', 8, 1, 0, 3), it('photowall', 10, 1),
    it('rugr', 8, 4, 0, 5), it('beanbag', 10, 6, 0, 4), it('catbed', 11, 3, 0, 5), it('plant', 12, 2),
    it('desk', 29, 2), it('office', 29, 3, 2, 6), it('window', 31, 1, 0, 1), it('bookshelf', 33, 2), it('bookshelf', 35, 2), it('cert', 37, 1), it('monstera', 27, 2), it('armchair', 35, 6, 1, 2), it('plant', 37, 8),
    it('tree', 2, 22), it('tree', 5, 25), it('tree', 10, 22), it('tree', 30, 21), it('tree', 36, 26), it('flowers', 16, 21), it('flowers', 17, 21), it('flowers', 22, 21), it('flowers', 23, 21),
    it('bench_out', 8, 24), it('lantern', 18, 26), it('lantern', 21, 26), it('mailbox', 22, 26), it('sign', 16, 26),
  ];
  return { v: 1, seq: n + 1, houseName: 'Nhà của Thịnh', rooms: JSON.parse(JSON.stringify(DEFAULT_ROOMS)), items };
}
function normLayout(L) {
  if (!L || typeof L !== 'object' || !Array.isArray(L.items)) return null;
  const rooms = JSON.parse(JSON.stringify(DEFAULT_ROOMS));
  for (const id of ROOM_IDS) if (L.rooms && L.rooms[id]) Object.assign(rooms[id], L.rooms[id]);
  const items = L.items.filter((i) => i && TYPES[i.type] && Number.isInteger(i.x) && Number.isInteger(i.y)).map((i) => ({ ...i, dir: (i.dir | 0) % 4, color: i.color | 0, c: Array.isArray(i.c) ? i.c : [] }));
  return { v: 1, seq: Math.max(L.seq | 0, items.length + 1), houseName: String(L.houseName || 'Nhà của Thịnh').slice(0, 40), rooms, items };
}

/* =====================================================================
   10 EM VỊT
   ===================================================================== */
export const DUCKS = [
  { id: 'plain', name: 'Vịt Trắng' }, { id: 'nonla', name: 'Vịt Nón Lá' }, { id: 'grad', name: 'Vịt Tốt Nghiệp' },
  { id: 'rain', name: 'Vịt Áo Mưa' }, { id: 'chef', name: 'Vịt Đầu Bếp' }, { id: 'santa', name: 'Vịt Noel' },
  { id: 'cool', name: 'Vịt Kính Râm' }, { id: 'cam', name: 'Vịt Nhiếp Ảnh' }, { id: 'cape', name: 'Vịt Siêu Nhân' },
  { id: 'crown', name: 'Vịt Hoàng Gia' },
];
function makeDuck(cos, frame = 0) {
  const c = mk(16, 18), g = c.getContext('2d'), Y = 2 + (frame ? 1 : 0), r = (col, x, y, w, h) => R(g, col, x, y + Y, w, h);
  const body = cos === 'rain' ? '#ffd23a' : '#ffffff', sh = cos === 'rain' ? '#e0a91c' : '#dcdde6';
  r('#f08a1c', 5, 13, 2, 2); r('#f08a1c', 9, 13, 2, 2); r('#f08a1c', 4, 15 - (frame ? 1 : 0), 3, 1); r('#f08a1c', 9, 15 - (frame ? 1 : 0), 3, 1);
  if (cos === 'cape') { r('#e23b3b', 2, 6, 12, 8); r('#b52a2a', 2, 12, 12, 2); }
  ell(g, body, 8, 10 + Y, 5.5, 4); r(sh, 4, 12, 8, 1); r(sh, 3, 9, 2, 3);
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
  if (cos === 'cape') r('#ffd27a', 7, 9, 2, 2);
  if (cos === 'crown') { r('#f2c14e', 4, -1, 8, 2); r('#f2c14e', 4, -3, 1, 2); r('#f2c14e', 7, -3, 2, 2); r('#f2c14e', 11, -3, 1, 2); r('#e23b6a', 7, -1, 2, 1); }
  return outline(c);
}
const duckCache = {};
const duckSprite = (id, f) => { const k = id + f; if (!duckCache[k]) duckCache[k] = makeDuck(id, f); return duckCache[k]; };
const vnDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const hashStr = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* =====================================================================
   GIAO DIỆN
   ===================================================================== */
const MARKUP = `
<div class="hm-hud">
  <button type="button" class="hm-chip" data-id="duck" title="Tìm 10 em vịt — bấm để xem">🦆 <b data-id="duckN">0</b>/10</button>
  <span class="hm-chip" data-id="online" title="Đang ở đây">👥 <b data-id="onN">1</b></span>
  <span class="hm-chip" data-id="door"></span>
  <span class="hm-sp"></span>
  <div class="hm-modes" data-id="modes" hidden>
    <button class="hm-mbtn on" data-mode="walk">🚶 Đi dạo</button>
    <button class="hm-mbtn" data-mode="deco">🛋️ Trang trí</button>
    <button class="hm-mbtn" data-mode="access">🔑 Ai được vào nhà <span class="hm-badge" data-id="kbadge" hidden>0</span></button>
  </div>
</div>
<div class="hm-layout">
  <div class="hm-stage" data-id="stage">
    <canvas data-id="cv" tabindex="0"></canvas>
    <div class="hm-hint" data-id="hint"></div>
    <div class="hm-toast" data-id="toast"></div>
    <div class="hm-blocked" data-id="blocked"></div>
    <div class="hm-saving" data-id="saving" hidden>Đang lưu…</div>
  </div>
  <aside class="hm-side" data-id="side"></aside>
</div>
<div class="hm-modal" data-id="modal"><div class="hm-mp" data-id="mp"></div></div>`;

/* =====================================================================
   mountHome(root, opts) -> cleanup()  (cleanup.refresh() để tải lại khi đăng nhập/đăng xuất)
   opts: isAdmin(), load(), saveLayout(full, pub), upload(file)->{url,path}, removeFiles(paths),
         admin:{ load(), setMode(m), addGuest(name), removeGuest(id), answerKnock(k, ok), cleanupMuseum() },
         knock(), setCode(code), loadDucks(), saveDucks(state), me(), online(handlers), onExit('city'|'temple'), from
   ===================================================================== */
export function mountHome(root, opts = {}) {
  root.innerHTML = MARKUP;
  const $ = (s) => root.querySelector(`[data-id="${s}"]`);
  const offs = []; const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  let dead = false;
  const isAdmin = () => !!(opts.isAdmin && opts.isAdmin());

  /* ---------- trạng thái ---------- */
  let S = defaultLayout();
  const ME = { owner: false, allowed: false, mode: 'invited', guest: null, knock: null, member: false, codeBad: false, loaded: false, offline: false };
  const ACC = { mode: 'invited', guests: [], knocks: [], loaded: false };
  const canHouse = () => ME.owner || ME.allowed;
  const canRoom = (id) => !id || id === 'yard' || canHouse();
  const roomName = (id) => (id === 'yard' ? 'Sân trước' : (S.rooms[id]?.name || id));

  /* ---------- nội thất ---------- */
  const D = (it) => TYPES[it.type];
  const fp = (it, dir = it.dir) => { const d = D(it); return d.rot && (dir & 1) ? [d.h, d.w] : [d.w, d.h]; };
  const itemRoom = (it) => (D(it).wall ? roomAt[it.y + 1]?.[it.x] : roomAt[it.y]?.[it.x]);
  let occ = [], wocc = [], rocc = [];
  function rebuildOcc() {
    occ = Array.from({ length: H }, () => Array(W).fill(null)); wocc = Array.from({ length: H }, () => Array(W).fill(null)); rocc = Array.from({ length: H }, () => Array(W).fill(null));
    for (const it of S.items) {
      const d = D(it), [fw, fh] = fp(it), grid = d.wall ? wocc : d.rug ? rocc : occ;
      for (let y = it.y; y < it.y + fh; y++) for (let x = it.x; x < it.x + fw; x++) if (grid[y] && x >= 0 && x < W) grid[y][x] = it;
    }
  }
  function canPlace(type, x, y, dir, ignoreId) {
    const d = TYPES[type]; const [fw, fh] = d.rot && (dir & 1) ? [d.h, d.w] : [d.w, d.h];
    let room = null;
    for (let yy = y; yy < y + fh; yy++) for (let xx = x; xx < x + fw; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return { ok: false, why: 'Ra ngoài bản đồ' };
      let r;
      if (d.wall) {
        if (!isFace(xx, yy) || (xx === DOORBELL[0] && yy === DOORBELL[1])) return { ok: false, why: 'Đồ treo tường phải đặt lên mặt tường' };
        if (wocc[yy][xx] && wocc[yy][xx].id !== ignoreId) return { ok: false, why: 'Chỗ này đã treo đồ khác' };
        r = roomAt[yy + 1][xx];
      } else {
        const b = base[yy][xx];
        if (b === DOOR) return { ok: false, why: 'Không được chắn cửa ra vào' };
        if (!walkBase(b)) return { ok: false, why: 'Chỉ đặt được trên sàn' };
        const grid = d.rug ? rocc : occ;
        if (grid[yy][xx] && grid[yy][xx].id !== ignoreId) return { ok: false, why: 'Chỗ này đã có đồ' };
        if (!d.rug && P.x === xx && P.y === yy && !P.sit) return { ok: false, why: 'Bạn đang đứng ở đó' };
        r = roomAt[yy][xx];
      }
      if (room === null) room = r; else if (room !== r) return { ok: false, why: 'Món đồ không được nằm vắt qua hai phòng' };
    }
    if (d.yard && room !== 'yard') return { ok: false, why: 'Đồ này chỉ đặt ngoài sân' };
    return { ok: true, room };
  }
  function rotC(c, k) {
    if (!k) return c;
    const o = k & 1 ? mk(c.height, c.width) : mk(c.width, c.height), g = o.getContext('2d');
    if (k === 1) { g.translate(c.height, 0); g.rotate(Math.PI / 2); } else if (k === 2) { g.translate(c.width, c.height); g.rotate(Math.PI); } else { g.translate(0, c.width); g.rotate(-Math.PI / 2); }
    g.drawImage(c, 0, 0); return o;
  }
  const colOf = (it) => { const d = D(it); const pal = d.pal === 'f' ? FRAMEC : COLORS; return pal[(it.color || 0) % pal.length][1]; };
  const spr = new Map();
  function sprite(it, dir = it.dir) {
    const d = D(it), c = colOf(it);
    const sig = d.holds && d.holds.k === 'award' ? (it.c || []).map((a) => a.kind).join(',') : '';
    const key = `${it.type}|${dir | 0}|${it.color | 0}|${sig}|${it.type === 'bookshelf' || it.type === 'flowers' ? it.x : ''}`;
    let s = spr.get(key); if (s) return s;
    if (d.rot) { const can = mk(d.w * T, d.h * T); d.draw(can.getContext('2d'), it, c, d.w * T, d.h * T, 0); s = rotC(can, dir | 0); }
    else { const pad = d.padX || 0, top = d.top || 0, can = mk(d.w * T + pad * 2, d.h * T + top), g = can.getContext('2d'); g.translate(pad, 0); d.draw(g, it, c, d.w * T, d.h * T, top); s = can; }
    spr.set(key, s); return s;
  }
  function bounds(it, x = it.x, y = it.y, dir = it.dir) { const d = D(it); const [fw, fh] = fp(it, dir); const top = d.rot ? 0 : (d.top || 0), pad = d.rot ? 0 : (d.padX || 0); return { x: x * T - pad, y: y * T - top, w: fw * T + pad * 2, h: fh * T + top, pad, top }; }

  /* ---------- ảnh ---------- */
  const thumbCache = {};
  const srcUrl = (src) => { if (!src) return ''; if (!src.startsWith('sample:')) return src; if (!thumbCache[src]) thumbCache[src] = genArt(src.slice(7)).toDataURL(); return thumbCache[src]; };
  const imgCache = {};
  function getImg(src) {
    if (!src) return null;
    if (src.startsWith('sample:')) return genArt(src.slice(7));
    let im = imgCache[src];
    if (!im) { im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { im._ok = true; }; im.src = src; imgCache[src] = im; }
    return im._ok ? im : null;
  }

  /* ---------- nền ---------- */
  const floorCv = mk(NW, NH);
  let dirtyFloor = true;
  function drawFace(g, px, py, x, y) {
    const rm = roomAt[y + 1][x];
    if (rm === 'yard') {
      R(g, '#d7a77c', px, py, T, T); for (let j = 0; j < T; j += 4) { R(g, '#b9855c', px, py + j + 3, T, 1); R(g, '#b9855c', px + ((j / 4) % 2 ? 4 : 12), py + j, 1, 3); }
      R(g, '#8a6a52', px, py, T, 2); R(g, '#9a8f79', px, py + 13, T, 3); R(g, '#b6a98f', px, py + 13, T, 1); return;
    }
    const c1 = S.rooms[rm]?.wall || '#efe3c4', c2 = shade(c1, c1 < '#7' ? 0.12 : -0.07);
    R(g, c1, px, py, T, T); for (let j = 1; j < T; j += 4) R(g, c2, px + ((x + j) % 3) * 5, py + j, 1, 1);
    R(g, '#3b3350', px, py, T, 2); R(g, shade(c1, -0.12), px, py + 2, T, 1);
    R(g, '#a07a58', px, py + 11, T, 1); R(g, '#7a5a44', px, py + 12, T, 3); R(g, '#4a3528', px, py + 15, T, 1);
    if (base[y][x - 1] !== WALL || !isFace(x - 1, y)) R(g, 'rgba(0,0,0,.15)', px, py, 1, T);
    if (base[y][x + 1] !== WALL || !isFace(x + 1, y)) R(g, 'rgba(0,0,0,.15)', px + 15, py, 1, T);
  }
  function drawClosedDoor(g, px, py, x) {
    const col = '#8a5c36';
    R(g, col, px, py, T, T); R(g, shade(col, -0.25), px, py, T, 1);
    if (x === 19) { R(g, '#3b3350', px, py, 2, T); R(g, '#ffd27a', px + 13, py + 8, 2, 2); } else { R(g, shade(col, -0.35), px, py, 1, T); R(g, '#3b3350', px + 14, py, 2, T); R(g, '#ffd27a', px + 1, py + 8, 2, 2); }
    for (let j = 3; j < T; j += 4) R(g, shade(col, -0.12), px + 2, py + j, 12, 1);
  }
  function buildFloor() {
    const g = floorCv.getContext('2d'); g.clearRect(0, 0, NW, NH);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x * T, py = y * T, b = base[y][x];
      if (b === GR) drawGrass(g, px, py, x, y); else if (b === PATH) drawStone(g, px, py); else if (b === WATER) drawWater(g, px, py, x, y);
      else if (b === PLANK) drawPlank(g, px, py, x, y); else if (b === HEDGE) drawHedge(g, px, py, x, y); else if (b === FENCE) drawFence(g, px, py, x, y);
      else if (b === FLOOR) drawFloor(g, S.rooms[roomAt[y][x]].floor, px, py, x, y);
      else if (b === DOOR) {
        const d = doorAt[y][x];
        if (d.front && !canHouse()) drawClosedDoor(g, px, py, x);
        else { drawFloor(g, S.rooms[d.room].floor, px, py, x, y); if (d.front) { R(g, '#9e2f2a', px, py + 4, T, 10); R(g, '#b8433a', px, py + 6, T, 1); } else R(g, 'rgba(0,0,0,.12)', px, py, T, T); }
      } else if (isFace(x, y)) drawFace(g, px, py, x, y); else drawCap(g, px, py, x, y);
    }
    const [bx, by] = DOORBELL; R(g, '#5b4a6e', bx * T + 4, by * T + 4, 8, 7); R(g, '#ffd27a', bx * T + 6, by * T + 6, 4, 3); R(g, '#3b3350', bx * T + 7, by * T + 9, 2, 1);
    dirtyFloor = false;
  }

  /* ---------- nhân vật ---------- */
  const P = { x: 19, y: 26, fx: 19, fy: 26, t: 1, dir: 2, sit: null, path: [], anim: 0, pending: null };
  if (opts.from === 'temple') { P.x = P.fx = 38; P.y = P.fy = 23; P.dir = 1; }
  const remotes = new Map();
  let myLook = { shirt: '#3d5a80', hair: '#241a26' }, myName = 'Bạn';
  function refreshMe() { const m = (opts.me && opts.me()) || {}; myName = m.name || 'Bạn'; if (m.look) myLook = { shirt: m.look.shirt || '#8b7cf6', hair: m.look.hair || '#241a26' }; }
  refreshMe();

  /* ---------- canvas ---------- */
  const cv = $('cv'), ctx = cv.getContext('2d');
  const nat = mk(NW, NH), nx = nat.getContext('2d');
  let SC = 1, OX = 0, OY = 0, DPR = 1;
  function resize() {
    const r = cv.getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(r.width * DPR)); cv.height = Math.max(1, Math.round(r.height * DPR));
    SC = Math.min(cv.width / NW, cv.height / NH); OX = (cv.width - NW * SC) / 2; OY = (cv.height - NH * SC) / 2;
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; if (ro) ro.observe(cv); resize();
  const UI = { mode: 'walk', cat: 'chair', place: null, sel: null, drag: null, hover: null, mouse: null, decoRoom: 'living', tip: null, modalOpen: false, confirmDel: null };
  const keys = {};

  /* ---------- lưu bố cục (admin) ---------- */
  let saveT = null;
  function publicLayout() { return { v: 1, houseName: S.houseName, rooms: S.rooms, items: S.items.filter((it) => itemRoom(it) === 'yard'), seq: 0 }; }
  function save() {
    if (!ME.owner || !opts.saveLayout) return;
    $('saving').hidden = false; clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try { await opts.saveLayout(JSON.parse(JSON.stringify(S)), publicLayout()); if (room) room.send('layout'); $('saving').hidden = true; }
      catch (e) { $('saving').hidden = true; toast('⚠️ Chưa lưu được: ' + (e.message || e)); }
    }, 900);
  }
  function filesOf(list) { return (list || []).map((c) => c && c.path).filter(Boolean); }
  function dropFiles(paths) { if (paths.length && opts.removeFiles) opts.removeFiles(paths).catch(() => {}); }

  /* ---------- vịt ---------- */
  let DS = { duckDay: '', ducks: [], duckEver: {}, ts: 0 };
  try { const s = JSON.parse(localStorage.getItem('kw_home_ducks') || 'null'); if (s && typeof s === 'object') DS = { ...DS, ...s }; } catch (e) { /* ignore */ }
  function rollDay() { const d = vnDay(); if (DS.duckDay !== d) { DS.duckDay = d; DS.ducks = []; } }
  rollDay();
  function saveDucks() { DS.ts = Date.now(); try { localStorage.setItem('kw_home_ducks', JSON.stringify(DS)); } catch (e) { /* ignore */ } if (opts.saveDucks) opts.saveDucks(DS); }
  if (opts.loadDucks) Promise.resolve(opts.loadDucks()).then((r) => { if (dead || !r || typeof r !== 'object') return; if ((+r.ts || 0) > DS.ts && Array.isArray(r.ducks)) { DS = { duckDay: r.duckDay || '', ducks: r.ducks.filter((x) => typeof x === 'string'), duckEver: r.duckEver || {}, ts: +r.ts }; rollDay(); placeDucks(); hud(); } }).catch(() => {});
  let ducks = [];
  function placeDucks() {
    rollDay();
    const rnd = seeded(hashStr('home-ducks' + DS.duckDay));
    const order = [...DUCKS].sort(() => rnd() - 0.5);
    const areas = ['yard', 'yard', 'yard', ...ROOM_IDS, ROOM_IDS[Math.floor(rnd() * ROOM_IDS.length)]];
    const used = [];
    ducks = order.map((d, i) => {
      const area = areas[i]; const spots = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (roomAt[y][x] !== area || !walkBase(base[y][x]) || occ[y][x] || (area === 'yard' && base[y][x] === PATH)) continue;
        if (used.some(([a, b]) => Math.abs(a - x) + Math.abs(b - y) < 4)) continue;
        spots.push([x, y]);
      }
      if (!spots.length) return null;
      const [x, y] = spots[Math.floor(rnd() * spots.length)]; used.push([x, y]);
      return { ...d, x, y, ph: rnd() * 6, found: DS.ducks.includes(d.id) };
    }).filter(Boolean);
  }
  function catchDuck(d) {
    if (d.found) return;
    d.found = true; if (!DS.ducks.includes(d.id)) DS.ducks.push(d.id); DS.duckEver[d.id] = 1; saveDucks(); hud(); quack();
    if (DS.ducks.length >= DUCKS.length) { toast('🦆🦆🦆 Bạn đã tìm đủ 10 em vịt hôm nay! Ngày mai vịt trốn chỗ mới nhé.'); chime(); }
    else toast(`🦆 Tìm thấy ${d.name}! (${DS.ducks.length}/10)`);
  }
  const duckAt = (x, y) => ducks.find((d) => !d.found && d.x === x && d.y === y && canRoom(roomAt[y][x]));

  /* ---------- âm thanh nhỏ ---------- */
  let AC = null;
  function tone(f, dur, type = 'sine', vol = 0.12, when = 0) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur + 0.02); } catch (e) { /* ignore */ } }
  const quack = () => { tone(520, 0.07, 'sawtooth', 0.06); tone(380, 0.1, 'sawtooth', 0.05, 0.07); };
  const chime = () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'sine', 0.12, i * 0.11));

  /* ---------- di chuyển ---------- */
  function update(dt) {
    if (P.t < 1) { P.t = Math.min(1, P.t + dt * 7); P.anim += dt; if (P.t >= 1) arrived(); }
    if (P.t >= 1 && !UI.modalOpen) {
      if (P.path.length) { const [x, y] = P.path.shift(); const dx = x - P.x, dy = y - P.y; const dir = DV.findIndex(([a, b]) => a === dx && b === dy); if (dir < 0 || !tryStep(dir, true)) P.path = []; }
      else { const k = heldDir(); if (k >= 0) tryStep(k); }
    }
    for (const r of remotes.values()) if (r.t < 1) { r.t = Math.min(1, r.t + dt * 7); r.anim = (r.anim || 0) + dt; }
  }
  function heldDir() { if (keys.ArrowDown || keys.s) return 0; if (keys.ArrowLeft || keys.a) return 1; if (keys.ArrowUp || keys.w) return 2; if (keys.ArrowRight || keys.d) return 3; return -1; }
  function arrived() {
    const d = duckAt(P.x, P.y); if (d) catchDuck(d);
    if (!P.path.length && P.pending) { const f = P.pending; P.pending = null; f(); }
    renderWhere();
  }
  function passable(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    if (solidBase(base[y][x]) || occ[y][x]) return false;
    return canRoom(roomAt[y][x]);
  }
  function tryStep(dir, fromPath) {
    P.dir = dir; const [dx, dy] = DV[dir]; const tx = P.x + dx, ty = P.y + dy;
    if (ty >= H && (tx === 19 || tx === 20)) { exitTo('city'); return false; }
    if (tx >= W && (ty === 23 || ty === 24)) { exitTo('temple'); return false; }
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
    const b = base[ty][tx];
    if (tx === DOORBELL[0] && ty === DOORBELL[1] && dir === 2 && !fromPath) { ringBell(); return false; }
    if (b === WALL && isFace(tx, ty) && dir === 2) { const w = wocc[ty][tx]; if (w && !fromPath) { interact(w); return false; } }
    if (solidBase(b)) return false;
    const o = occ[ty][tx];
    if (o) { if (D(o).sit && !fromPath) sitOn(o, tx, ty); else if (!fromPath) interact(o); return false; }
    if (!canRoom(roomAt[ty][tx])) { blocked(); return false; }
    P.sit = null; P.fx = P.x; P.fy = P.y; P.x = tx; P.y = ty; P.t = 0; hideBlocked();
    if (room) room.send('mv', { x: tx, y: ty, dir, sit: 0 });
    return true;
  }
  function sitOn(it, x, y) {
    const d = D(it); P.path = []; P.sit = it.id; P.fx = P.x; P.fy = P.y; P.x = x; P.y = y; P.t = 0;
    P.dir = d.rot ? it.dir % 4 : (d.sitDir ?? 0);
    if (room) room.send('mv', { x, y, dir: P.dir, sit: 1 });
    toast(`🪑 Bạn ngồi xuống ${d.name.toLowerCase()} — bấm phím di chuyển để đứng dậy`);
  }
  function exitTo(where) { if (opts.onExit) opts.onExit(where); else toast(where === 'city' ? 'Về Main City' : 'Sang Temple Isle'); }
  function bfs(tx, ty, allowLast) {
    const prev = new Map(), k = (x, y) => y * W + x, q = [[P.x, P.y]]; prev.set(k(P.x, P.y), null);
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) { const path = []; let c = k(x, y); while (c !== k(P.x, P.y)) { path.unshift([c % W, Math.floor(c / W)]); c = prev.get(c); } return path; }
      for (const [dx, dy] of DV) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H || prev.has(k(a, b))) continue; const last = allowLast && a === tx && b === ty; if (!last && !passable(a, b)) continue; prev.set(k(a, b), k(x, y)); q.push([a, b]); }
    }
    return null;
  }
  function walkTo(tx, ty, then, allowLast) {
    if (P.x === tx && P.y === ty) { if (then) then(); return true; }
    const p = bfs(tx, ty, allowLast); if (!p) return false;
    if (allowLast) { p.pop(); P.path = p; P.pending = () => { const dx = tx - P.x, dy = ty - P.y; const dir = DV.findIndex(([a, b]) => a === dx && b === dy); if (dir >= 0) { P.dir = dir; if (then) then(); } }; if (!p.length) { const f = P.pending; P.pending = null; f(); } }
    else { P.path = p; P.pending = then || null; }
    return true;
  }

  /* ---------- vẽ ---------- */
  const visibleItem = (it) => canRoom(itemRoom(it));
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function render(time) {
    if (dirtyFloor) buildFloor();
    const roof = !canHouse();
    nx.clearRect(0, 0, NW, NH); nx.drawImage(floorCv, 0, 0);
    const drag = UI.drag, pos = (it) => (drag && drag.id === it.id ? drag : it);
    const vis = S.items.filter(visibleItem);
    for (const it of vis) if (D(it).wall) { const p = pos(it), b = bounds(it, p.x, p.y); nx.drawImage(sprite(it), b.x, b.y); }
    for (const it of vis) if (D(it).rug) { const p = pos(it), b = bounds(it, p.x, p.y); nx.drawImage(sprite(it), b.x, b.y); }
    const list = vis.filter((it) => !D(it).wall && !D(it).rug).map((it) => { const p = pos(it), [, fh] = fp(it); return { z: (p.y + fh) * T, it, p }; });
    const ppx = (P.fx + (P.x - P.fx) * P.t) * T, ppy = (P.fy + (P.y - P.fy) * P.t) * T;
    const showP = canRoom(roomAt[P.y][P.x]);
    if (showP) list.push({ z: ppy + T + (P.sit ? 0.5 : 0.1), me: true });
    const rlist = [];
    for (const r of remotes.values()) { if (r.x == null || !canRoom(roomAt[r.y]?.[r.x])) continue; const rx = ((r.fx ?? r.x) + (r.x - (r.fx ?? r.x)) * r.t) * T, ry = ((r.fy ?? r.y) + (r.y - (r.fy ?? r.y)) * r.t) * T; rlist.push({ r, rx, ry }); list.push({ z: ry + T + (r.sit ? 0.5 : 0.05), rem: { r, rx, ry } }); }
    for (const d of ducks) if (!d.found && canRoom(roomAt[d.y][d.x])) list.push({ z: d.y * T + T - 0.2, duck: d });
    list.sort((a, b) => a.z - b.z);
    const drawPerson = (x, y, dir, moving, anim, look, sit) => {
      const step = moving ? (Math.floor(anim * 8) % 2) + 1 : 0, s = personSprite(dir, step, look.shirt, look.hair, !!sit);
      if (!sit) { nx.fillStyle = 'rgba(20,14,24,.25)'; nx.beginPath(); nx.ellipse(x + 8, y + 15, 5, 2, 0, 0, 7); nx.fill(); }
      nx.drawImage(s, Math.round(x) - 1, Math.round(y) - 5 - (sit ? 4 : 0));
    };
    for (const e of list) {
      if (e.me) drawPerson(ppx, ppy, P.dir, P.t < 1, P.anim, myLook, P.sit);
      else if (e.rem) { const { r, rx, ry } = e.rem; drawPerson(rx, ry, r.dir | 0, r.t < 1, r.anim || 0, { shirt: r.look?.shirt || '#ffffff', hair: r.look?.hair || '#6b4024' }, r.sit); }
      else if (e.duck) { const d = e.duck, bob = Math.sin(time / 333 + d.ph) > 0.6 ? 1 : 0; nx.fillStyle = 'rgba(0,0,0,.2)'; nx.beginPath(); nx.ellipse(d.x * T + 8, d.y * T + 15, 4, 1.6, 0, 0, 7); nx.fill(); nx.drawImage(duckSprite(d.id, bob), d.x * T, d.y * T - 2); }
      else { const b = bounds(e.it, e.p.x, e.p.y); nx.drawImage(sprite(e.it), b.x, b.y); }
    }
    let ghost = null;
    if (UI.mode === 'deco' && UI.place && UI.hover) {
      const d = TYPES[UI.place.type]; const [fw, fh] = d.rot && (UI.place.dir & 1) ? [d.h, d.w] : [d.w, d.h];
      const gx = UI.hover.x - Math.floor((fw - 1) / 2), gy = UI.hover.y - Math.floor((fh - 1) / 2);
      const fake = { type: UI.place.type, dir: UI.place.dir, color: UI.place.color, c: [], x: gx, y: gy };
      const r = canPlace(fake.type, gx, gy, fake.dir); const b = bounds(fake);
      nx.globalAlpha = 0.72; nx.drawImage(sprite(fake), b.x, b.y); nx.globalAlpha = 1;
      ghost = { x: gx, y: gy, fw, fh, ok: r.ok, why: r.why };
    }
    if (roof) drawRoof(nx);

    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0c14'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(nat, OX, OY, NW * SC, NH * SC);
    const S2 = (n) => n * SC;
    for (const it of vis) {
      const d = D(it); if (!d.photo || !(it.c || []).length) continue;
      const p = pos(it), b = bounds(it, p.x, p.y);
      d.photo.forEach((rc, i) => {
        const c = it.c[i]; if (!c || !c.img) return; const im = getImg(c.img); if (!im) return;
        const x = OX + S2(b.x + b.pad + rc[0]), y = OY + S2(b.y + rc[1]), w = S2(rc[2]), h = S2(rc[3]);
        const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih) return;
        const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
        ctx.imageSmoothingEnabled = !c.img.startsWith('sample:'); ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
      });
    }
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    for (const it of vis) { const d = D(it); if (!d.glow) continue; const p = pos(it), b = bounds(it, p.x, p.y); const gx = OX + S2(b.x + b.pad + d.glow[0]), gy = OY + S2(b.y + d.glow[1]); const r = S2(26); const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, r); gr.addColorStop(0, d.glow[2] ? 'rgba(126,232,255,.22)' : 'rgba(255,214,140,.30)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(gx - r, gy - r, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over';
    const fs = Math.max(11, S2(9));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pill = (text, cx, cy, bg, fg, size = fs) => { ctx.font = `${size}px VT323, monospace`; const w = ctx.measureText(text).width + size * 0.9; ctx.fillStyle = bg; rr(cx - w / 2, cy - size * 0.62, w, size * 1.24, size * 0.35); ctx.fill(); ctx.fillStyle = fg; ctx.fillText(text, cx, cy + 1); };
    if (!roof) for (const r of RDEF) pill(roomName(r.id), OX + S2(((r.x0 + r.x1 + 1) / 2) * T), OY + S2((r.y0 - 2) * T + 8), 'rgba(19,18,27,.78)', '#ffe7b0');
    if (roof) {
      const cx = OX + S2(20 * T), cy = OY + S2(9 * T);
      pill('🏠 ' + S.houseName, cx, cy - fs * 1.4, 'rgba(19,18,27,.85)', '#ffe7b0', fs * 1.5);
      pill('🔒 ' + doorText() + ' · bấm chuông để gõ cửa', cx, cy + fs * 0.6, 'rgba(80,30,50,.92)', '#ffc3d4', fs);
    }
    pill('↓ Cầu về Main City', OX + S2(20 * T), OY + S2(29 * T + 8), 'rgba(19,18,27,.7)', '#e6e0f0', fs * 0.9);
    pill('Temple Isle →', OX + S2(39.9 * T) - S2(34), OY + S2(22.1 * T) + fs * 0.6, 'rgba(19,18,27,.7)', '#e6e0f0', fs * 0.9);
    for (const { r, rx, ry } of rlist) pill((r.badge ? r.badge + ' · ' : '') + (r.name || 'Khách'), OX + S2(rx + 8), OY + S2(ry - 9 - (r.sit ? 4 : 0)), 'rgba(19,18,27,.8)', '#fff', fs * 0.8);
    if (showP) pill(ME.owner ? 'Thịnh · chủ nhà' : myName, OX + S2(ppx + 8), OY + S2(ppy - 9 - (P.sit ? 4 : 0)), ME.owner ? 'rgba(255,210,122,.92)' : 'rgba(126,232,255,.9)', '#1b1408', fs * 0.85);
    if (UI.mode === 'deco') {
      const sel = S.items.find((i) => i.id === UI.sel);
      if (sel) { const p = pos(sel), b = bounds(sel, p.x, p.y); ctx.setLineDash([S2(2), S2(2)]); ctx.lineWidth = Math.max(2, S2(1)); ctx.strokeStyle = drag && !drag.ok ? '#ff8a80' : '#ffd27a'; ctx.strokeRect(OX + S2(b.x) - 2, OY + S2(b.y) - 2, S2(b.w) + 4, S2(b.h) + 4); ctx.setLineDash([]); }
      if (ghost) { ctx.fillStyle = ghost.ok ? 'rgba(94,224,160,.28)' : 'rgba(255,100,100,.32)'; ctx.fillRect(OX + S2(ghost.x * T), OY + S2(ghost.y * T), S2(ghost.fw * T), S2(ghost.fh * T)); ctx.strokeStyle = ghost.ok ? '#5ee0a0' : '#ff8a80'; ctx.lineWidth = 2; ctx.strokeRect(OX + S2(ghost.x * T), OY + S2(ghost.y * T), S2(ghost.fw * T), S2(ghost.fh * T)); if (!ghost.ok && ghost.why) pill(ghost.why, OX + S2((ghost.x + ghost.fw / 2) * T), OY + S2(ghost.y * T) - fs, 'rgba(80,20,20,.92)', '#ffd0cc', fs * 0.9); }
      else if (UI.hover && !drag) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(OX + S2(UI.hover.x * T), OY + S2(UI.hover.y * T), S2(T), S2(T)); }
    }
    if (UI.mode === 'walk' && UI.tip && UI.mouse) pill(UI.tip, UI.mouse.x, UI.mouse.y - fs * 1.4, 'rgba(19,18,27,.92)', '#fff', fs * 0.95);
  }
  let raf = 0, last = performance.now();
  function loop(t) { if (dead) return; const dt = Math.min(0.05, (t - last) / 1000); last = t; update(dt); render(t); raf = requestAnimationFrame(loop); }

  /* ---------- chuột / chạm ---------- */
  function toNative(e) { const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * DPR, y = (e.clientY - r.top) * DPR; return { sx: x, sy: y, x: (x - OX) / SC, y: (y - OY) / SC }; }
  function hitItem(px, py) {
    const vis = S.items.filter(visibleItem);
    const order = [...vis.filter((i) => !D(i).wall && !D(i).rug).sort((a, b) => (b.y + fp(b)[1]) - (a.y + fp(a)[1])), ...vis.filter((i) => D(i).wall), ...vis.filter((i) => D(i).rug)];
    for (const it of order) { const b = bounds(it); if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) { if (!D(it).rug && !D(it).wall) { const tx = Math.floor(px / T); const [fw] = fp(it); if (tx < it.x || tx >= it.x + fw) continue; } return it; } }
    return null;
  }
  on(cv, 'pointermove', (e) => {
    const p = toNative(e); UI.mouse = { x: p.sx, y: p.sy };
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    UI.hover = tx >= 0 && ty >= 0 && tx < W && ty < H ? { x: tx, y: ty } : null;
    if (UI.mode === 'walk') {
      const dk = UI.hover && duckAt(tx, ty);
      const it = !dk && UI.hover && hitItem(p.x, p.y);
      const bell = UI.hover && tx === DOORBELL[0] && ty === DOORBELL[1];
      UI.tip = dk ? '🦆 Bắt vịt!' : it ? (it.c && it.c.length ? `${D(it).name}: ${it.c[0].title || ''}${it.c.length > 1 ? ` (+${it.c.length - 1})` : ''}` : D(it).sit ? `${D(it).name} — bấm để ngồi` : D(it).name) : bell ? '🔔 Chuông cửa' : null;
      cv.style.cursor = dk || it || bell ? 'pointer' : 'default';
    } else if (UI.mode === 'deco') {
      if (UI.drag && UI.hover) { const d = UI.drag; const nxp = UI.hover.x - d.ox, nyp = UI.hover.y - d.oy; if (nxp !== d.x || nyp !== d.y) { d.x = nxp; d.y = nyp; const it = S.items.find((i) => i.id === d.id); d.ok = canPlace(it.type, d.x, d.y, it.dir, it.id).ok; d.moved = true; } }
      cv.style.cursor = UI.place ? 'copy' : (UI.hover && hitItem(p.x, p.y)) ? 'grab' : 'default';
    }
  });
  on(cv, 'pointerleave', () => { UI.hover = null; UI.tip = null; });
  on(cv, 'contextmenu', (e) => { if (UI.mode === 'deco') { e.preventDefault(); cancelPlace(); } });
  on(cv, 'pointerdown', (e) => {
    cv.focus(); const p = toNative(e); const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
    UI.hover = { x: tx, y: ty };
    if (UI.mode === 'deco') {
      if (e.button === 2) return;
      if (UI.place) {
        const d = TYPES[UI.place.type]; const [fw, fh] = d.rot && (UI.place.dir & 1) ? [d.h, d.w] : [d.w, d.h];
        const gx = tx - Math.floor((fw - 1) / 2), gy = ty - Math.floor((fh - 1) / 2);
        const r = canPlace(UI.place.type, gx, gy, UI.place.dir);
        if (!r.ok) { toast('⛔ ' + r.why); return; }
        const it = { id: 'i' + (S.seq++) + Math.random().toString(36).slice(2, 5), type: UI.place.type, x: gx, y: gy, dir: UI.place.dir, color: UI.place.color, c: [] };
        S.items.push(it); rebuildOcc(); save();
        if (!e.shiftKey) { UI.place = null; UI.sel = it.id; }
        renderSide();
        if (d.holds && !e.shiftKey) toast(`✅ Đã đặt ${d.name.toLowerCase()} — bấm "${d.holds.k === 'photo' ? '+ Gắn ảnh' : '+ Gắn thành tích'}" bên phải để thêm nội dung`);
        return;
      }
      const it = hitItem(p.x, p.y);
      if (it) { UI.sel = it.id; UI.confirmDel = null; UI.drag = { id: it.id, ox: tx - it.x, oy: ty - it.y, x: it.x, y: it.y, ok: true, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
      else UI.sel = null;
      renderSide(); return;
    }
    if (UI.mode !== 'walk') return;
    if (tx === DOORBELL[0] && ty === DOORBELL[1]) { ringBell(); return; }
    const dk = duckAt(tx, ty);
    if (dk) { if (Math.abs(dk.x - P.x) + Math.abs(dk.y - P.y) <= 1) catchDuck(dk); else if (!walkTo(dk.x, dk.y)) toast('Không tới chỗ vịt được'); return; }
    const it = hitItem(p.x, p.y);
    if (it) {
      const d = D(it);
      if (d.sit) { const [fw, fh] = fp(it); let best = null, bd = 1e9; for (let y = it.y; y < it.y + fh; y++) for (let x = it.x; x < it.x + fw; x++) { const dd = Math.abs(x - P.x) + Math.abs(y - P.y); if (dd < bd) { bd = dd; best = [x, y]; } } if (!walkTo(best[0], best[1], () => sitOn(it, best[0], best[1]), true)) toast('Không tìm được đường tới chỗ ngồi'); return; }
      interact(it); return;
    }
    if (!canRoom(roomAt[ty][tx])) { blocked(); return; }
    if (!walkTo(tx, ty)) toast('Không đi tới chỗ đó được');
  });
  on(cv, 'pointerup', () => {
    if (UI.mode === 'deco' && UI.drag) {
      const d = UI.drag, it = S.items.find((i) => i.id === d.id);
      if (d.moved && it) { if (d.ok) { it.x = d.x; it.y = d.y; rebuildOcc(); save(); } else toast('⛔ Không đặt được ở đó — đồ quay về chỗ cũ'); }
      UI.drag = null; renderSide();
    }
  });
  on(window, 'keydown', (e) => {
    if (UI.modalOpen) { if (e.key === 'Escape') closeModal(); else if (e.key === 'ArrowRight') $('mp').querySelector('[data-nav="1"]')?.click(); else if (e.key === 'ArrowLeft') $('mp').querySelector('[data-nav="-1"]')?.click(); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (UI.mode === 'walk') {
      if (['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = true; P.path = []; P.pending = null; e.preventDefault(); }
      if (k === 'e' || k === ' ' || k === 'Enter') { e.preventDefault(); interactFront(); }
    } else if (UI.mode === 'deco') {
      if (k === 'r') rotateCur(); else if (k === 'Escape') cancelPlace(); else if ((k === 'Delete' || k === 'Backspace') && UI.sel) { e.preventDefault(); delSel(); } else if (k === 'c') cycleColor();
    }
  });
  on(window, 'keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
  on(window, 'blur', () => { for (const k in keys) keys[k] = false; });

  function interactFront() {
    const [dx, dy] = DV[P.dir], x = P.x + dx, y = P.y + dy;
    if (x === DOORBELL[0] && y === DOORBELL[1]) return ringBell();
    if (y < 0 || x < 0 || x >= W || y >= H) return;
    const dk = duckAt(x, y); if (dk) return catchDuck(dk);
    const it = occ[y][x] || (isFace(x, y) && wocc[y][x]) || rocc[P.y][P.x];
    if (it) { if (D(it).sit && occ[y][x] === it) sitOn(it, x, y); else interact(it); }
  }
  function interact(it) {
    if (!visibleItem(it)) return;
    const d = D(it);
    if (d.holds) {
      if ((it.c || []).length) return openViewer(it, 0);
      return toast(ME.owner ? `${d.name} đang trống — vào 🛋️ Trang trí để gắn ${d.holds.k === 'photo' ? 'ảnh' : 'thành tích'}` : `${d.name} (đang trống)`);
    }
    toast(d.name);
  }

  /* ---------- cửa nhà ---------- */
  function doorText() {
    if (ME.mode === 'private') return 'Chủ nhà đang đóng cửa';
    if (ME.mode === 'members') return 'Chỉ thành viên Knoworld được vào';
    if (ME.mode === 'setup') return 'Nhà đang được dọn dẹp';
    return 'Chỉ khách được mời mới vào được';
  }
  let blockedTimer = null;
  function blocked() {
    const el = $('blocked');
    let extra = '';
    if (ME.mode === 'members') extra = '<div class="hm-small">Bạn cần đăng ký tên trên Knoworld (trang chủ) để được tính là thành viên.</div>';
    const pending = ME.knock === 'pending';
    const canKnock = ME.mode !== 'private' && ME.mode !== 'setup';
    el.innerHTML = `<div>🔒 <b>${esc(doorText())}.</b></div>${extra}
      <div class="hm-row">${pending ? '<span class="hm-small">🔔 Bạn đã gõ cửa — đang chờ chủ nhà trả lời</span>' : canKnock ? '<button class="hm-btn gold" data-knock="1">🔔 Gõ cửa xin vào</button>' : ''}<button class="hm-btn" data-x="1">Đóng</button></div>
      ${ME.mode === 'invited' || ME.mode === 'members' ? `<div class="hm-code"><input type="text" data-code maxlength="12" placeholder="Có mã mời? Nhập ở đây"><button class="hm-btn" data-codego="1">Vào nhà</button></div>` : ''}`;
    el.classList.add('on'); clearTimeout(blockedTimer); blockedTimer = setTimeout(hideBlocked, 15000);
  }
  function hideBlocked() { $('blocked').classList.remove('on'); }
  on($('blocked'), 'click', (e) => {
    if (e.target.closest('[data-knock]')) knock();
    if (e.target.closest('[data-x]')) hideBlocked();
    if (e.target.closest('[data-codego]')) useCode($('blocked').querySelector('[data-code]').value);
  });
  on($('blocked'), 'keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-code]')) useCode(e.target.value); e.stopPropagation(); });
  async function knock() {
    if (!opts.knock) return;
    const r = await opts.knock();
    hideBlocked();
    if (r === 'ok' || r === 'dup') { ME.knock = 'pending'; toast('🔔 Cốc cốc! Đã gõ cửa — khi chủ nhà đồng ý, bạn quay lại là vào được'); }
    else if (r === 'wait') toast('Bạn vừa gõ cửa rồi, đợi chút nhé');
    else if (r === 'noname') toast('Đăng ký tên trên Knoworld trước để chủ nhà biết bạn là ai nhé');
    else toast('Chưa gõ cửa được, thử lại sau');
    renderSide();
  }
  async function useCode(code) {
    code = String(code || '').trim().toUpperCase(); if (!code) return;
    if (opts.setCode) opts.setCode(code);
    await reload();
    if (ME.allowed) { hideBlocked(); toast(`🎉 Chào ${ME.guest || 'bạn'}! Cửa đã mở`); }
    else if (ME.codeBad) toast('Mã mời không đúng');
    else toast('Mã đúng nhưng chủ nhà đang đóng cửa');
  }
  function ringBell() {
    if (ME.owner) return toast('🔔 Ding dong! Khách bị khoá cửa bấm chuông này để gõ cửa.');
    if (canHouse()) return toast('🔔 Ding dong! Cửa đang mở cho bạn, cứ vào nhà nhé.');
    blocked();
  }

  /* ---------- xem ảnh / thành tích ---------- */
  function openModal(html) { $('mp').innerHTML = html; $('modal').classList.add('on'); UI.modalOpen = true; }
  function closeModal() { $('modal').classList.remove('on'); UI.modalOpen = false; cv.focus(); }
  on($('modal'), 'click', (e) => { if (e.target === $('modal') || e.target.closest('.hm-x')) closeModal(); });
  function openViewer(it, i) {
    const list = it.c || []; const c = list[i]; if (!c) return; const d = D(it);
    const nav = list.length > 1 ? `<div class="hm-nav"><button class="hm-btn" data-nav="-1">← Trước</button><span class="hm-muted">${i + 1} / ${list.length}</span><button class="hm-btn" data-nav="1">Sau →</button></div>` : '';
    let body;
    if (c.k === 'award') {
      const [kn, ic] = KINDS[c.kind] || KINDS.cup;
      body = `<div class="hm-award"><div class="ic">${ic}</div><div><div class="hm-muted" style="font-size:12px">${esc(kn)}</div><h3>${esc(c.title || 'Thành tích')}</h3><div class="hm-muted">${esc([c.org, c.date].filter(Boolean).join(' · '))}</div></div></div>${c.img ? `<img class="hm-photo ${c.img.startsWith('sample:') ? 'px' : ''}" style="margin-top:10px" src="${esc(srcUrl(c.img))}" alt="">` : ''}${c.note ? `<p class="hm-note">${esc(c.note)}</p>` : ''}`;
    } else body = `<img class="hm-photo ${c.img && c.img.startsWith('sample:') ? 'px' : ''}" src="${esc(srcUrl(c.img))}" alt=""><h2 style="margin-top:12px">${esc(c.title || 'Ảnh')}</h2><div class="hm-meta">${esc([c.date, c.place].filter(Boolean).join(' · '))}</div>${c.note ? `<p class="hm-note">${esc(c.note)}</p>` : ''}`;
    openModal(`<button class="hm-x">✕</button><div class="hm-muted" style="font-size:12px;margin-bottom:6px">${esc(d.name)} · ${esc(roomName(itemRoom(it)))}</div>${body}${nav}`);
    $('mp').querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => openViewer(it, (i + +b.dataset.nav + list.length) % list.length)));
  }
  function openDucks() {
    const cells = DUCKS.map((dd) => { const f = DS.ducks.includes(dd.id); return `<div class="hm-duck ${f ? 'on' : ''}"><img src="${duckSprite(dd.id, 0).toDataURL()}" alt=""><span>${f ? esc(dd.name) : '???'}</span></div>`; }).join('');
    const inside = ducks.filter((d) => !d.found && roomAt[d.y][d.x] !== 'yard').length;
    openModal(`<button class="hm-x">✕</button><h2>Tìm 10 em vịt 🦆</h2><p class="hm-muted">Mỗi ngày (giờ VN) 10 em vịt trốn ở chỗ mới: 3 em ngoài sân, 7 em trong các phòng. Đi tới chỗ vịt hoặc bấm vào vịt khi đứng sát bên để bắt.</p><div class="hm-ducks">${cells}</div>${!canHouse() && inside ? `<p class="hm-note">Còn ${inside} em đang trốn trong nhà — cần được vào nhà mới tìm được.</p>` : ''}`);
  }
  on($('duck'), 'click', openDucks);

  /* ---------- sửa nội dung (admin) ---------- */
  function openEditor(it, idx) {
    const d = D(it), kind = d.holds.k, cur = idx >= 0 ? it.c[idx] : { k: kind, kind: 'cup', title: '', date: '', org: '', note: '', img: '' };
    let img = cur.img || '', path = cur.path || '', file = null;
    const sampleNote = (s) => /^(Ảnh minh hoạ|Thành tích mẫu)/.test(s || '');
    const kinds = Object.entries(KINDS).map(([k, [n, ic]]) => `<option value="${k}" ${cur.kind === k ? 'selected' : ''}>${ic} ${n}</option>`).join('');
    openModal(`<button class="hm-x">✕</button><h2>${idx >= 0 ? 'Sửa' : 'Thêm'} ${kind === 'photo' ? 'ảnh' : 'thành tích'}</h2><div class="hm-muted" style="font-size:12.5px">${esc(d.name)} · ${esc(roomName(itemRoom(it)))}</div>
      <div class="hm-form">
        ${kind === 'award' ? `<label>Loại<select data-f="kind">${kinds}</select></label>` : ''}
        <div class="hm-pick" data-f="pick">${img ? `<img src="${esc(srcUrl(img))}" alt="">Bấm để đổi ảnh` : kind === 'photo' ? '📷 Bấm để chọn ảnh từ máy' : '📷 Ảnh giấy khen / khoảnh khắc nhận giải (không bắt buộc)'}</div>
        <input type="file" accept="image/*" data-f="file" hidden>
        <label>${kind === 'photo' ? 'Tiêu đề ảnh' : 'Tên thành tích'}<input type="text" data-f="title" maxlength="120" value="${esc(/\(mẫu\)|^Ảnh mẫu/.test(cur.title || '') ? '' : cur.title)}"></label>
        <div class="hm-two"><label>${kind === 'photo' ? 'Thời gian' : 'Năm'}<input type="text" data-f="date" maxlength="40" value="${esc(cur.date === 'Ảnh mẫu' ? '' : cur.date)}"></label>
        <label>${kind === 'photo' ? 'Địa điểm' : 'Đơn vị trao'}<input type="text" data-f="${kind === 'photo' ? 'place' : 'org'}" maxlength="120" value="${esc(kind === 'photo' ? cur.place : cur.org)}"></label></div>
        <label>Ghi chú / câu chuyện<textarea data-f="note" rows="3" maxlength="1000">${esc(sampleNote(cur.note) ? '' : cur.note)}</textarea></label>
      </div>
      <div class="hm-foot">${idx >= 0 ? '<button class="hm-btn red" data-act="del">Gỡ khỏi món đồ</button>' : ''}<span class="hm-sp"></span><button class="hm-btn" data-act="cancel">Huỷ</button><button class="hm-btn gold" data-act="ok">Lưu</button></div>`);
    const mp = $('mp'), f = (n) => mp.querySelector(`[data-f="${n}"]`);
    f('pick').addEventListener('click', () => f('file').click());
    f('file').addEventListener('change', () => { file = f('file').files[0]; if (!file) return; const u = URL.createObjectURL(file); f('pick').innerHTML = `<img src="${u}" alt="">Bấm để đổi ảnh`; if (!f('title').value) f('title').value = file.name.replace(/\.\w+$/, '').slice(0, 120); });
    mp.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    mp.querySelector('[data-act="del"]')?.addEventListener('click', () => { dropFiles(filesOf([it.c[idx]])); it.c.splice(idx, 1); spr.clear(); save(); closeModal(); renderSide(); });
    const okBtn = mp.querySelector('[data-act="ok"]');
    okBtn.addEventListener('click', async () => {
      if (kind === 'photo' && !img && !file) { toast('Chọn một tấm ảnh trước đã'); return; }
      okBtn.disabled = true; okBtn.textContent = file ? 'Đang tải ảnh…' : 'Đang lưu…';
      try {
        if (file) { const up = await opts.upload(file); if (path && path !== up.path) dropFiles([path]); img = up.url; path = up.path; }
      } catch (e) { okBtn.disabled = false; okBtn.textContent = 'Lưu'; toast('⚠️ Tải ảnh thất bại: ' + (e.message || e)); return; }
      const c = { k: kind, img, path, title: f('title').value.trim(), date: f('date').value.trim(), note: f('note').value.trim() };
      if (kind === 'photo') c.place = f('place').value.trim(); else { c.kind = f('kind').value; c.org = f('org').value.trim(); if (!c.title) c.title = KINDS[c.kind][0]; }
      if (idx >= 0) it.c[idx] = c; else it.c.push(c);
      spr.clear(); save(); closeModal(); renderSide(); toast('✅ Đã lưu');
    });
  }

  /* ---------- thao tác trang trí ---------- */
  function cancelPlace() { if (UI.place) { UI.place = null; renderSide(); } else if (UI.sel) { UI.sel = null; renderSide(); } }
  function rotateCur() {
    if (UI.place) { if (TYPES[UI.place.type].rot) UI.place.dir = (UI.place.dir + 1) % 4; return; }
    const it = S.items.find((i) => i.id === UI.sel); if (!it || !D(it).rot) return;
    const nd = (it.dir + 1) % 4; const r = canPlace(it.type, it.x, it.y, nd, it.id);
    if (!r.ok) { toast('⛔ Không đủ chỗ để xoay: ' + r.why); return; }
    it.dir = nd; rebuildOcc(); save(); renderSide();
  }
  function cycleColor() { const it = S.items.find((i) => i.id === UI.sel); if (!it || !D(it).pal) return; const n = D(it).pal === 'f' ? FRAMEC.length : COLORS.length; it.color = ((it.color || 0) + 1) % n; save(); renderSide(); }
  function delSel() {
    const it = S.items.find((i) => i.id === UI.sel); if (!it) return;
    if ((it.c || []).length && UI.confirmDel !== it.id) { UI.confirmDel = it.id; renderSide(); return; }
    dropFiles(filesOf(it.c));
    S.items = S.items.filter((i) => i !== it); UI.sel = null; UI.confirmDel = null; if (P.sit === it.id) P.sit = null; rebuildOcc(); save(); renderSide(); toast('🗑 Đã cất món đồ');
  }

  /* ---------- bảng bên phải ---------- */
  const side = $('side');
  function preview(type) {
    const d = TYPES[type], it = { type, color: d.color || 0, dir: 0, c: [], x: 3 };
    const s = sprite(it); const c = mk(64, 48), g = c.getContext('2d');
    if (d.wall) { R(g, '#e9dfc9', 0, 6, 64, 32); R(g, '#3b3350', 0, 6, 64, 3); R(g, '#7a5a44', 0, 34, 64, 4); }
    const k = Math.min(2, 60 / s.width, 44 / s.height); g.imageSmoothingEnabled = false; g.drawImage(s, (64 - s.width * k) / 2, (48 - s.height * k) / 2, s.width * k, s.height * k);
    return c;
  }
  function floorPreview(f) { const c = mk(32, 32), g = c.getContext('2d'); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) drawFloor(g, f, x * T, y * T, x + 3, y + 5); return c; }
  function hud() {
    $('duckN').textContent = DS.ducks.length;
    $('onN').textContent = remotes.size + 1;
    const dm = { public: '🌐 Nhà mở cửa', members: '🎓 Thành viên Knoworld', invited: '✉️ Chỉ khách mời', private: '🔒 Đang đóng cửa', setup: '🔒 Đang dọn nhà' };
    $('door').textContent = (dm[ME.mode] || '') + (ME.owner ? '' : canHouse() ? ' · bạn được vào' : '');
    $('modes').hidden = !ME.owner;
    const n = ACC.knocks.filter((k) => k.status === 'pending').length; const b = $('kbadge'); b.hidden = !n; b.textContent = n;
    root.querySelectorAll('.hm-mbtn').forEach((x) => x.classList.toggle('on', x.dataset.mode === UI.mode));
    $('hint').textContent = UI.mode === 'walk' ? 'Bấm sàn để đi · bấm đồ để xem/ngồi · WASD' : UI.mode === 'deco' ? (UI.place ? `Đang đặt: ${TYPES[UI.place.type].name} — bấm để đặt · R xoay · Esc huỷ` : 'Chọn đồ bên phải · bấm đồ trong nhà để sửa · kéo để dời') : 'Đổi quyền bên phải';
  }
  root.querySelectorAll('.hm-mbtn').forEach((b) => on(b, 'click', () => { if (!ME.owner) return; UI.mode = b.dataset.mode; UI.place = null; UI.drag = null; if (UI.mode !== 'deco') UI.sel = null; P.path = []; hideBlocked(); if (UI.mode === 'access') loadAccess(); renderSide(); cv.focus(); }));
  function renderWhere() { const el = side.querySelector('[data-where]'); if (el) el.innerHTML = `Bạn đang ở: <b>${esc(roomName(roomAt[P.y][P.x]))}</b>${P.sit ? ' (đang ngồi)' : ''}`; }
  function renderSide() {
    hud();
    if (UI.mode === 'deco' && ME.owner) return renderDeco();
    if (UI.mode === 'access' && ME.owner) return renderAccess();
    const tourItems = S.items.filter((it) => D(it).holds && (it.c || []).length && visibleItem(it));
    const status = ME.owner ? '' : canHouse()
      ? `<div class="hm-card">✅ Bạn được vào nhà${ME.guest ? ` với tư cách khách mời <b>${esc(ME.guest)}</b>` : ''}.</div>`
      : `<div class="hm-card">🔒 <b>${esc(doorText())}.</b><br>${ME.knock === 'pending' ? '🔔 Bạn đã gõ cửa — đang chờ chủ nhà.' : ME.knock === 'no' ? 'Chủ nhà chưa đồng ý lần trước. Bạn có thể gõ cửa lại.' : 'Đi tới cửa hoặc bấm chuông để gõ cửa.'}
         <div class="hm-row" style="justify-content:flex-start">${ME.knock !== 'pending' && ME.mode !== 'private' && ME.mode !== 'setup' ? '<button class="hm-btn gold" data-sknock="1">🔔 Gõ cửa</button>' : ''}</div>
         ${ME.mode === 'invited' || ME.mode === 'members' ? '<div class="hm-code"><input type="text" data-scode maxlength="12" placeholder="Nhập mã mời"><button class="hm-btn" data-scodego="1">Vào nhà</button></div>' : ''}</div>`;
    side.innerHTML = `<h2>${ME.owner ? '👋 Chào chủ nhà!' : `👋 Xin chào, ${esc(myName)}`}</h2>
      <p class="hm-sub" data-where>Bạn đang ở: <b>${esc(roomName(roomAt[P.y][P.x]))}</b></p>
      ${status}
      <h3>Cách chơi</h3>
      <ul class="hm-help">
        <li>Bấm vào sàn để đi tới, hoặc dùng <span class="hm-kbd">W A S D</span> / phím mũi tên</li>
        <li>Bấm vào khung ảnh, tủ cúp, bục… để xem ảnh & thành tích</li>
        <li>Bấm vào ghế, sofa để ngồi · <span class="hm-kbd">E</span> tương tác với đồ trước mặt</li>
        <li>Mỗi ngày có 10 em vịt trốn quanh nhà — bấm 🦆 để xem đã tìm được bao nhiêu</li>
        ${ME.owner ? '<li>Bấm <b>🛋️ Trang trí</b> để chọn bàn ghế, khung ảnh, kệ cúp… và kéo thả</li><li>Bấm <b>🔑 Ai được vào nhà</b> để chọn ai vào được nhà</li>' : ''}
      </ul>
      <h3>Tham quan nhanh (${tourItems.length})</h3>
      ${tourItems.length ? tourItems.map((it) => { const c = it.c[0]; const th = c.img ? `style="background-image:url('${esc(srcUrl(c.img))}')"` : ''; return `<div class="hm-tour" data-tour="${esc(it.id)}"><div class="th" ${th}>${c.k === 'award' && !c.img ? (KINDS[c.kind] || KINDS.cup)[1] : ''}</div><div class="t">${esc(c.title || D(it).name)}<small>${esc(D(it).name)} · ${esc(roomName(itemRoom(it)))}${it.c.length > 1 ? ` · ${it.c.length} mục` : ''}</small></div></div>`; }).join('') : `<div class="hm-empty">${canHouse() ? 'Chưa có gì được trưng bày.' : 'Ảnh và thành tích ở trong nhà.'}</div>`}`;
    side.querySelectorAll('[data-tour]').forEach((el) => el.addEventListener('click', () => { const it = S.items.find((i) => i.id === el.dataset.tour); if (it) openViewer(it, 0); }));
    side.querySelector('[data-sknock]')?.addEventListener('click', knock);
    side.querySelector('[data-scodego]')?.addEventListener('click', () => useCode(side.querySelector('[data-scode]').value));
    side.querySelector('[data-scode]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') useCode(e.target.value); e.stopPropagation(); });
  }
  function renderDeco() {
    const sel = S.items.find((i) => i.id === UI.sel);
    let html = `<h2>🛋️ Trang trí nhà</h2><p class="hm-sub">Chọn món đồ rồi bấm vào nhà để đặt. Kéo đồ để dời chỗ. <span class="hm-kbd">R</span> xoay · <span class="hm-kbd">C</span> đổi màu · <span class="hm-kbd">Del</span> cất · <span class="hm-kbd">Esc</span> huỷ · giữ <span class="hm-kbd">Shift</span> để đặt liên tục. Mọi thay đổi tự lưu.</p>`;
    if (sel) {
      const d = D(sel), pal = d.pal === 'f' ? FRAMEC : d.pal ? COLORS : null;
      html += `<div class="hm-card" style="border-color:rgba(255,210,122,.5)"><div class="hm-row2" style="justify-content:space-between"><b>${esc(d.name)}</b><span class="hm-muted" style="font-size:12px">${esc(roomName(itemRoom(sel)))}</span></div>
        <div class="hm-row2" style="margin-top:8px">${d.rot ? '<button class="hm-btn sm" data-a="rot">↻ Xoay</button>' : ''}<button class="hm-btn sm red" data-a="del">${UI.confirmDel === sel.id ? 'Bấm lần nữa để cất (mất nội dung)' : '🗑 Cất đồ'}</button><button class="hm-btn sm" data-a="desel">Xong</button></div>
        ${pal ? `<div style="margin-top:8px" class="hm-sw">${pal.map(([n, c], i) => `<button title="${n}" data-col="${i}" class="${(sel.color || 0) % pal.length === i ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>` : ''}
        ${d.holds ? `<div style="margin-top:10px;font-size:12.5px;font-weight:600">${d.holds.k === 'photo' ? '📷 Ảnh trong món đồ' : '🏆 Thành tích trưng bày'} <span class="hm-muted">(${(sel.c || []).length}/${d.holds.max})</span></div>
          <div class="hm-clist">${(sel.c || []).map((c, i) => `<div class="hm-crow"><div class="th" style="${c.img ? `background-image:url('${esc(srcUrl(c.img))}')` : ''}">${c.k === 'award' && !c.img ? (KINDS[c.kind] || KINDS.cup)[1] : ''}</div><div class="t">${esc(c.title || '(chưa đặt tên)')}<small>${esc([c.date, c.org || c.place].filter(Boolean).join(' · '))}</small></div><button class="hm-btn sm" data-ed="${i}">Sửa</button></div>`).join('') || '<div class="hm-empty">Đang trống.</div>'}</div>
          ${(sel.c || []).length < d.holds.max ? `<button class="hm-btn gold" style="width:100%" data-a="add">${d.holds.k === 'photo' ? '+ Gắn ảnh' : '+ Gắn thành tích'}</button>` : ''}` : ''}
      </div>`;
    }
    html += `<div class="hm-tabs">${CATS.map(([k, n]) => `<button class="hm-tab ${UI.cat === k ? 'on' : ''}" data-cat="${k}">${n}</button>`).join('')}</div>`;
    if (UI.cat === 'room') {
      const r = UI.decoRoom, rs = S.rooms[r];
      html += `<label class="hm-muted" style="font-size:12.5px">Tên nhà<input type="text" data-house value="${esc(S.houseName)}" maxlength="40" style="width:100%;margin-top:4px"></label>
        <div style="margin-top:10px"><select data-room style="width:100%">${ROOM_IDS.map((id) => `<option value="${id}" ${id === r ? 'selected' : ''}>${esc(S.rooms[id].name)}</option>`).join('')}</select></div>
        <label class="hm-muted" style="font-size:12.5px;display:block;margin-top:10px">Tên phòng<input type="text" data-rname value="${esc(rs.name)}" maxlength="30" style="width:100%;margin-top:4px"></label>
        <h3>Sàn</h3><div class="hm-fl">${Object.entries(FLOORS).map(([k, n]) => `<button data-floor="${k}" class="${rs.floor === k ? 'on' : ''}"><span data-fp="${k}"></span>${n}</button>`).join('')}</div>
        <h3>Màu tường</h3><div class="hm-sw">${WALLS.map((c) => `<button data-wall="${c}" class="${rs.wall === c ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>`;
    } else {
      const types = Object.entries(TYPES).filter(([, d]) => d.cat === UI.cat);
      html += `<div class="hm-cat">${types.map(([k, d]) => `<div class="hm-it ${UI.place?.type === k ? 'on' : ''}" data-type="${k}"><span data-pv="${k}"></span><div class="n">${esc(d.name)}</div><div class="s">${d.w}×${d.h}${d.wall ? ' · treo tường' : ''}${d.holds ? (d.holds.k === 'photo' ? ' · 📷' : ' · 🏆') : ''}${d.sit ? ' · ngồi được' : ''}</div></div>`).join('')}</div>`;
    }
    html += `<p class="hm-sub" style="margin-top:12px">Đã đặt <b>${S.items.length}</b> món đồ.</p>`;
    side.innerHTML = html;
    side.querySelectorAll('[data-pv]').forEach((el) => el.replaceWith(preview(el.dataset.pv)));
    side.querySelectorAll('[data-fp]').forEach((el) => el.replaceWith(floorPreview(el.dataset.fp)));
    side.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { UI.cat = b.dataset.cat; renderSide(); }));
    side.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.type; if (UI.place?.type === k) UI.place = null; else { UI.place = { type: k, dir: 0, color: TYPES[k].color || 0 }; UI.sel = null; toast(`Bấm vào nhà để đặt ${TYPES[k].name.toLowerCase()}${TYPES[k].wall ? ' (lên mặt tường)' : ''} · R xoay · Esc huỷ`); } renderSide(); cv.focus(); }));
    side.querySelector('[data-a="rot"]')?.addEventListener('click', rotateCur);
    side.querySelector('[data-a="del"]')?.addEventListener('click', delSel);
    side.querySelector('[data-a="desel"]')?.addEventListener('click', () => { UI.sel = null; UI.confirmDel = null; renderSide(); });
    side.querySelector('[data-a="add"]')?.addEventListener('click', () => openEditor(sel, -1));
    side.querySelectorAll('[data-ed]').forEach((b) => b.addEventListener('click', () => openEditor(sel, +b.dataset.ed)));
    side.querySelectorAll('[data-col]').forEach((b) => b.addEventListener('click', () => { sel.color = +b.dataset.col; save(); renderSide(); }));
    side.querySelector('[data-house]')?.addEventListener('input', (e) => { S.houseName = e.target.value || 'Nhà của tôi'; save(); });
    side.querySelector('[data-room]')?.addEventListener('change', (e) => { UI.decoRoom = e.target.value; renderSide(); });
    side.querySelector('[data-rname]')?.addEventListener('input', (e) => { S.rooms[UI.decoRoom].name = e.target.value || 'Phòng'; save(); const o = side.querySelector(`[data-room] option[value="${UI.decoRoom}"]`); if (o) o.textContent = S.rooms[UI.decoRoom].name; });
    side.querySelectorAll('[data-floor]').forEach((b) => b.addEventListener('click', () => { S.rooms[UI.decoRoom].floor = b.dataset.floor; dirtyFloor = true; save(); renderSide(); }));
    side.querySelectorAll('[data-wall]').forEach((b) => b.addEventListener('click', () => { S.rooms[UI.decoRoom].wall = b.dataset.wall; dirtyFloor = true; save(); renderSide(); }));
  }

  /* ---------- quyền vào nhà (admin) ---------- */
  async function loadAccess() {
    if (!opts.admin) return;
    try { const r = await opts.admin.load(); Object.assign(ACC, r, { loaded: true }); ME.mode = r.mode; } catch (e) { toast('⚠️ Chưa tải được danh sách khách: ' + (e.message || e)); }
    if (UI.mode === 'access') renderSide(); else hud();
  }
  function renderAccess() {
    const pend = ACC.knocks.filter((k) => k.status === 'pending');
    const HM = [['public', '🌐', 'Mở cửa cho mọi người', 'Ai ghé Knoworld cũng vào được'], ['members', '🎓', 'Thành viên Knoworld', 'Người đã đăng ký tên trên Knoworld, cùng khách mời'], ['invited', '✉️', 'Chỉ khách mời', 'Chỉ những người trong danh sách khách mời bên dưới'], ['private', '🔒', 'Đóng cửa', 'Chỉ mình tôi — khách chỉ thấy mái nhà và sân trước']];
    const link = (g) => `${location.origin}/home?code=${g.code}`;
    let html = `<h2>🔑 Ai được vào nhà</h2><p class="hm-sub">Khoá nằm ở cửa chính. Người chưa được vào chỉ thấy mái nhà và sân trước; ảnh và thành tích trong nhà không được gửi xuống máy họ.</p>`;
    if (!ACC.loaded) html += '<div class="hm-empty">Đang tải…</div>';
    html += `<h3>Gõ cửa ${pend.length ? `(${pend.length} đang chờ)` : ''}</h3>` + (pend.length ? pend.map((k) => `<div class="hm-knock"><div class="t">🔔 <b>${esc(k.name)}</b> xin vào nhà<small>${new Date(k.created_at).toLocaleString('vi-VN')}</small></div><button class="hm-btn sm gold" data-ok="${k.id}">Cho vào</button><button class="hm-btn sm" data-no="${k.id}">Từ chối</button></div>`).join('') : '<div class="hm-empty">Chưa có ai gõ cửa.</div>');
    html += `<h3>Cửa chính</h3>` + HM.map(([k, ic, t, s]) => `<label class="hm-opt ${ACC.mode === k ? 'on' : ''}"><input type="radio" name="hm-mode" value="${k}" ${ACC.mode === k ? 'checked' : ''}><div><b>${ic} ${t}</b><span>${s}</span></div></label>`).join('');
    html += `<h3>Khách mời (${ACC.guests.length})</h3>` + (ACC.guests.map((g, i) => `<div class="hm-guest"><div class="av" style="background:${AVC[i % AVC.length]}">${esc((String(g.name).replace(/[^\p{L}]/gu, '')[0] || '?').toUpperCase())}</div><div class="nm">${esc(g.name)}<small>Mã mời: <b>${esc(g.code)}</b>${g.anon_id ? ' · đã vào nhà' : ''}</small></div><button class="hm-btn sm" data-copy="${esc(link(g))}" title="Chép link mời">🔗</button><button class="hm-btn sm" data-gdel="${g.id}" title="Xoá khỏi danh sách">✕</button></div>`).join('') || '<div class="hm-empty">Chưa mời ai.</div>');
    html += `<div class="hm-add"><input type="text" data-nn placeholder="Tên khách (VD: Người thương ♥)" maxlength="40"><button class="hm-btn gold" data-gadd>+ Mời</button></div><p class="hm-sub" style="margin-top:6px">Mỗi khách có một mã mời riêng. Gửi link 🔗 cho họ — mở link là vào được nhà trên máy đó. Xoá khách là thu hồi quyền vào.</p>`;
    const done = ACC.knocks.filter((k) => k.status !== 'pending').slice(0, 6);
    if (done.length) html += `<h3>Đã trả lời</h3>` + done.map((k) => `<div class="hm-knock" style="opacity:.75"><div class="t">${k.status === 'ok' ? '✅' : '❌'} ${esc(k.name)}<small>${new Date(k.created_at).toLocaleString('vi-VN')}</small></div></div>`).join('');
    side.innerHTML = html;
    const busy = async (fn) => { try { await fn(); } catch (e) { toast('⚠️ ' + (e.message || e)); } await loadAccess(); };
    side.querySelectorAll('input[name="hm-mode"]').forEach((r) => r.addEventListener('change', () => busy(async () => { await opts.admin.setMode(r.value); ME.mode = r.value; toast('Đã đổi chế độ cửa chính'); })));
    side.querySelectorAll('[data-gdel]').forEach((b) => b.addEventListener('click', () => busy(() => opts.admin.removeGuest(b.dataset.gdel))));
    side.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('🔗 Đã chép link mời'); } catch (e) { prompt('Chép link mời:', b.dataset.copy); } }));
    const add = () => { const n = side.querySelector('[data-nn]').value.trim(); if (!n) { toast('Nhập tên khách trước'); return; } busy(async () => { const g = await opts.admin.addGuest(n); toast(`✉️ Đã mời ${n} — mã ${g.code}`); }); };
    side.querySelector('[data-gadd]').addEventListener('click', add);
    side.querySelector('[data-nn]').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); e.stopPropagation(); });
    side.querySelectorAll('[data-ok],[data-no]').forEach((b) => b.addEventListener('click', () => { const k = ACC.knocks.find((x) => x.id === (b.dataset.ok || b.dataset.no)); if (!k) return; busy(async () => { await opts.admin.answerKnock(k, !!b.dataset.ok); toast(b.dataset.ok ? `✅ Đã cho ${k.name} vào nhà` : 'Đã từ chối'); }); }));
  }

  /* ---------- tải dữ liệu ---------- */
  async function reload() {
    let r = null;
    try { r = opts.load ? await opts.load() : null; } catch (e) { r = null; }
    if (dead) return;
    r = r || { ok: true, owner: isAdmin(), mode: 'public', layout: null, offline: true };
    ME.owner = !!r.owner || (r.offline && isAdmin()); ME.allowed = !!r.ok; ME.mode = r.mode || 'invited'; ME.guest = r.guest || null; ME.knock = r.knock || null; ME.member = !!r.member; ME.codeBad = !!r.code_bad; ME.offline = !!r.offline;
    const L = normLayout(r.layout);
    if (L && (canHouse() || ME.owner)) S = L;
    else if (L) { const d = defaultLayout(); d.houseName = L.houseName; d.rooms = L.rooms; d.items = [...d.items.filter((it) => itemRoomOf(it) !== 'yard'), ...L.items]; S = d; }
    else S = defaultLayout();
    if (!ME.owner && UI.mode !== 'walk') UI.mode = 'walk';
    spr.clear(); rebuildOcc(); dirtyFloor = true; placeDucks();
    if (!canRoom(roomAt[P.y][P.x]) || occ[P.y][P.x]) { P.x = P.fx = 19; P.y = P.fy = 26; P.t = 1; P.sit = null; P.path = []; }
    ME.loaded = true; refreshMe(); renderSide();
    if (ME.owner) { loadAccess(); if (opts.admin && opts.admin.cleanupMuseum) opts.admin.cleanupMuseum().then((n) => { if (n > 0) toast(`🧹 Đã xoá ${n} ảnh cũ của Museum`); }).catch(() => {}); }
  }
  const itemRoomOf = (it) => (TYPES[it.type].wall ? roomAt[it.y + 1]?.[it.x] : roomAt[it.y]?.[it.x]);

  /* ---------- nhiều người ---------- */
  let room = null;
  if (opts.online) {
    room = opts.online({
      snapshot: () => ({ x: P.x, y: P.y, dir: P.dir, sit: P.sit ? 1 : 0 }),
      onPeers(list) {
        const seen = new Set();
        for (const p of list) { seen.add(p.sid); const r = remotes.get(p.sid) || { t: 1 }; Object.assign(r, { name: p.name, badge: p.badge, look: p.look }); if (r.x == null && Number.isInteger(p.x)) { r.x = r.fx = p.x; r.y = r.fy = p.y; r.dir = p.dir | 0; r.sit = p.sit; } remotes.set(p.sid, r); }
        for (const k of [...remotes.keys()]) if (!seen.has(k)) remotes.delete(k);
        hud();
      },
      onJoin() { if (room) room.retrack(); },
      onEvent(ev) {
        if (ev.type === 'layout') { if (!ME.owner) reload(); return; }
        if (ev.type === 'mv') { const r = remotes.get(ev.sid) || { t: 1 }; if (!Number.isInteger(ev.x) || !Number.isInteger(ev.y)) return; r.fx = r.x ?? ev.x; r.fy = r.y ?? ev.y; r.x = ev.x; r.y = ev.y; r.dir = ev.dir | 0; r.sit = ev.sit; r.t = 0; remotes.set(ev.sid, r); }
      },
      onStatus() { hud(); },
    });
    const keep = setInterval(() => { if (room) room.retrack(); }, 15000); offs.push(() => clearInterval(keep));
  }

  /* ---------- toast ---------- */
  let tt = null;
  function toast(m) { const el = $('toast'); el.textContent = m; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 3400); }

  rebuildOcc(); placeDucks(); renderSide(); reload();
  raf = requestAnimationFrame(loop);
  const cleanup = () => { dead = true; cancelAnimationFrame(raf); offs.forEach((f) => f()); if (ro) ro.disconnect(); if (room) { try { room.leave(); } catch (e) { /* ignore */ } } clearTimeout(saveT); root.innerHTML = ''; };
  cleanup.refresh = () => { refreshMe(); if (room) room.retrack(); reload(); };
  return cleanup;
}
