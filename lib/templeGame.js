// ---------------------------------------------------------------------------
// v36: KNOWORLD TEMPLE — game pixel đi vòng quanh chùa (kiểu RPG nhìn từ trên xuống).
// Gõ mõ tích công đức → mua đồ ở Quầy nhang → vào Chánh điện xin xăm / hỏi Thầy Phán.
// v38: chùa lớn gấp đôi — chánh điện 3 tầng mái, lầu chuông, lầu trống, bảo tháp, đèn đá;
// khách thập phương đi ra vào và lạy Phật; người chơi lạy Phật (chiếu đỏ trước Chánh điện);
// Sân luyện võ (minigame đánh quyền theo nhịp); Sân cây đa (lấy chổi quét lá).
// v39: nhiều người chơi — người dùng thật thấy nhau (tên + chấm xanh trên đầu), nói câu có sẵn, lạy cùng nhau.
//      opts.me() -> { name, badge, look }, opts.online(handlers) -> phòng (lib/templeOnline.js).
// Toàn bộ hình vẽ bằng code (canvas), không dùng ảnh. Lưu: localStorage (kw_temple)
// + Supabase site_visitors.temple qua RPC (lib/temple.js).
// mountTemple(root, { load, save, onExit }) -> cleanup()
// ---------------------------------------------------------------------------

/* =====================================================================
   NỘI DUNG — sửa thoải mái phần này (câu hỏi, lời phán, quẻ xăm, giá)
   rarity: c = thường · f = hài · l = huyền thoại
   ===================================================================== */
export const CAP_PER_DAY = 300; // v38: gõ mõ + lạy + luyện võ + quét lá dùng chung

export const ITEMS = [
  { id: 'nhang', name: 'Nhang thường', price: 10, desc: 'Thắp 1 cây để xin xăm hoặc hỏi Thầy Phán.' },
  { id: 'tram', name: 'Nhang trầm', price: 30, desc: 'Như nhang thường, nhưng dễ ra quẻ tốt và lời phán hiếm hơn.' },
  { id: 'sen', name: 'Hoa sen', price: 50, desc: 'Dâng kèm khi hỏi chuyện tình duyên.' },
  { id: 'trai', name: 'Mâm trái cây', price: 40, desc: 'Dâng kèm khi hỏi chuyện việc làm, tiền bạc.' },
];

export const QUESTIONS = [
  { id: 'qua', q: 'Con có qua môn không?', need: null, a: [
    ['c', 'Qua — nếu tối nay con mở slide ra thay vì mở TikTok.'],
    ['c', 'Thầy thấy con qua, nhưng điểm hơi… khiêm tốn.'],
    ['f', 'Qua môn thì có. Qua môn ngay lần đầu thì… để Thầy xem lại.'],
    ['f', 'Đề thi nằm trong slide tuần 7. Tuần 7 con nghỉ đúng không?'],
    ['l', 'Đại cát! Câu khó nhất trong đề chính là câu con vừa ôn tối qua.']] },
  { id: 'deadline', q: 'Deadline này con có kịp không?', need: null, a: [
    ['c', 'Kịp, nếu con bắt đầu ngay bây giờ. Không phải "lát nữa".'],
    ['c', 'Kịp sát nút. Nộp lúc 23:59, tim đập 180.'],
    ['f', 'Deadline không chạy trốn con. Con đang chạy trốn deadline.'],
    ['f', 'Thầy thấy file tên "final_final_thatsu_v7.docx". Kịp.'],
    ['l', 'Giảng viên vừa lùi hạn thêm 3 ngày. Đừng kể ai.']] },
  { id: 'nhom', q: 'Nhóm con có ai gánh không?', need: null, a: [
    ['c', 'Có. Nhìn vào gương đi con.'],
    ['c', 'Có một người gánh, ba người "đã xem".'],
    ['f', 'Nhóm 5 người: 1 làm, 1 hỏi "cần mình làm gì không", 3 người off.'],
    ['f', 'Người gánh nhóm sẽ xuất hiện… vào đêm trước hạn nộp.'],
    ['l', 'Kỳ này con gặp được đồng đội trong mơ. Giữ họ tới năm 4.']] },
  { id: 'tron', q: 'Hôm nay con có nên trốn tiết không?', need: null, a: [
    ['c', 'Không. Hôm nay có điểm danh.'],
    ['c', 'Trốn được, nhưng đề thi sẽ hỏi đúng phần hôm nay.'],
    ['f', 'Giảng viên cũng đang hỏi Thầy câu này.'],
    ['f', 'Con hỏi Thầy tức là con đã biết câu trả lời.'],
    ['l', 'Đi học đi. Hôm nay có cộng điểm phát biểu.']] },
  { id: 'diemA', q: 'Con có được điểm A không?', need: null, a: [
    ['c', 'A thì xa. B+ đang đứng đợi con gần đây.'],
    ['c', 'Được — nếu con đọc kỹ rubric trước khi làm.'],
    ['f', 'Chữ A có trong "Ăn ngủ đầy đủ". Bắt đầu từ đó.'],
    ['f', 'Điểm A nhìn thấy con… và rẽ sang đường khác.'],
    ['l', 'A. Chữ A to và rõ. Thầy thấy cả dấu cộng.']] },
  { id: 'nguoiyeu', q: 'Khi nào con có người yêu?', need: 'sen', a: [
    ['c', 'Khi con chịu bước ra khỏi phòng. Thử đi.'],
    ['c', 'Người ấy học cùng lớp, nhưng chưa từng nói chuyện với con.'],
    ['f', 'Sau buổi thuyết trình nhóm. Deadline ưu tiên trước.'],
    ['f', 'Thầy thấy người yêu… của bạn cùng phòng con.'],
    ['l', 'Kỳ sau. Một buổi workshop. Một ly trà sữa đổ. Định mệnh.']] },
  { id: 'crush', q: 'Crush có thích con không?', need: 'sen', a: [
    ['c', 'Crush biết con tồn tại. Đó là bước đầu.'],
    ['c', 'Crush đã xem story của con 3 lần. Tự suy luận đi.'],
    ['f', 'Crush thích… cái slide con làm.'],
    ['f', 'Câu này Thầy không trả lời. Thầy chỉ cười.'],
    ['l', 'Có. Và crush cũng đang đi chùa hỏi đúng câu này.']] },
  { id: 'viec', q: 'Ra trường con có việc làm không?', need: 'trai', a: [
    ['c', 'Có, nếu CV của con dài hơn 3 dòng.'],
    ['c', 'Có. Từ kỳ thực tập mà con tưởng chỉ "đi cho có".'],
    ['f', 'Có việc làm. Việc làm bài tập trước đã.'],
    ['f', 'Thầy thấy con mặc tạp dề quán cà phê… tạm thời thôi.'],
    ['l', 'Một nhà tuyển dụng sẽ nhắn con trên LinkedIn. Cập nhật profile ngay.']] },
  { id: 'tien', q: 'Tháng này con có hết tiền không?', need: 'trai', a: [
    ['c', 'Hết vào ngày 20. Như mọi tháng.'],
    ['c', 'Không hết, nếu bớt 2 ly trà sữa mỗi tuần.'],
    ['f', 'Ví của con vừa nộp đơn xin nghỉ phép.'],
    ['f', 'Mì gói cũng là một phước lành. Hãy biết ơn.'],
    ['l', 'Có người sắp trả lại tiền con cho mượn từ năm nhất.']] },
];

// rank: tt = Thượng Thượng · th = Thượng · tr = Trung · ha = Hạ
export const XAM = [
  { r: 'tt', t: 'Gió xuôi buồm thuận', p: 'Việc gì làm tuần này cũng suôn sẻ. Tranh thủ nộp bài sớm.' },
  { r: 'tt', t: 'Rồng gặp mây', p: 'Con được bầu làm nhóm trưởng — và làm tốt thật.' },
  { r: 'tt', t: 'Trăng tròn đáy hồ', p: 'Điểm giữa kỳ cao hơn con nghĩ. Đừng mở xem lúc 2 giờ sáng.' },
  { r: 'tt', t: 'Hoa nở đúng mùa', p: 'Sẽ có người khen con một câu làm con vui cả tuần.' },
  { r: 'th', t: 'Đường xa có bạn', p: 'Bạn cùng nhóm tuần này rất đáng tin. Nhớ cảm ơn họ.' },
  { r: 'th', t: 'Mưa tạnh trời quang', p: 'Chuyện đang rối sẽ gỡ được sau một cuộc nói chuyện thẳng thắn.' },
  { r: 'th', t: 'Cá chép vượt sóng', p: 'Môn khó nhất kỳ này con sẽ vượt qua. Đều đặn 30 phút mỗi ngày.' },
  { r: 'th', t: 'Đèn sáng bàn học', p: 'Thư viện là nơi phát lộc của con tuần này.' },
  { r: 'tr', t: 'Nước chảy đá mòn', p: 'Không có phép màu nhanh. Chỉ có thói quen nhỏ mỗi ngày.' },
  { r: 'tr', t: 'Mây che nửa trăng', p: 'Có thông tin con đang bỏ sót. Đọc lại email của giảng viên.' },
  { r: 'tr', t: 'Thuyền chờ gió', p: 'Chưa phải lúc. Chuẩn bị kỹ rồi hãy hành động.' },
  { r: 'tr', t: 'Cây non trước gió', p: 'Hơi mệt, nhưng con đang lớn. Ngủ đủ 7 tiếng nhé.' },
  { r: 'ha', t: 'Đường trơn sau mưa', p: 'Kiểm tra lại lịch thi — coi chừng trùng giờ.' },
  { r: 'ha', t: 'Lá rụng giữa hè', p: 'Tuần này dễ quên đồ. Sạc laptop từ tối hôm trước.' },
  { r: 'ha', t: 'Gió ngược đầu non', p: 'Đi chậm lại một chút. Hỏi người đi trước.' },
  { r: 'ha', t: 'Mây đen qua núi', p: 'Chuyện khó sẽ qua nhanh nếu con không né nó.' },
];
const RANK_NAME = { tt: 'THƯỢNG THƯỢNG', th: 'THƯỢNG', tr: 'TRUNG', ha: 'HẠ' };

const NPC_LINES = {
  monk: [
    'A Di Đà Phật. Gõ mõ đều tay thì công đức mới vào. Gõ dồn dập là tâm không tịnh đó.',
    'Nhang trầm đắt hơn, nhưng Thầy Phán hay phán câu hiếm lắm.',
    'Muốn hỏi chuyện tình duyên thì phải dâng hoa sen. Thầy Phán khó tính vụ này.',
    'Mỗi ngày chỉ tích được 300 công đức thôi. Thời gian còn lại… để đi học.',
    'Đứng lên chiếu đỏ trước Chánh điện rồi bấm Space là lạy được. Ba lạy, mỗi lạy +2 công đức.',
    'Lá đa rụng hoài à. Ai rảnh lấy chổi ở góc sân quét giùm, có công đức đó.',
  ],
  student: [
    'Tui gõ mõ 200 cái rồi mới nhớ ra mai thi… thôi xin quẻ luôn.',
    'Nghe nói ai được lời phán Huyền Thoại là qua môn. Nghe nói thôi nha.',
    'Quầy nhang bên phải đó. Bà Tư bán bằng công đức, không lấy tiền.',
    'Chùa mới mở rộng, có sân luyện võ luôn. Tui tập được 3 bài là xỉu.',
  ],
  visitor: [
    'Nam mô A Di Đà Phật. Chùa mở rộng rồi, đi một vòng mỏi chân luôn.',
    'Cô lên chùa lạy Phật cầu cho thằng út qua môn Kinh tế vĩ mô.',
    'Lạy ba lạy rồi hẵng xin xăm nghe con, cho nó thành tâm.',
    'Sân luyện võ bên trái đó, mấy chú tiểu đánh quyền đẹp lắm.',
    'Ai quét lá đa ngoài sân là có công đức đó. Tui quét hồi sáng rồi.',
    'Lần đầu thấy chùa có cả bảo tháp với lầu chuông luôn.',
    'Nhang trầm thơm ghê, mà hơi đắt công đức.',
    'Tui đi chùa cầu bình an. Với cầu thầy chấm thi dễ.',
  ],
  trainee: [
    'Hây! Hà! … Xin lỗi, đang tập.',
    'Sư phụ nói luyện võ là luyện tâm. Còn em luyện… cho khỏi buồn ngủ.',
    'Đánh đủ bài là lên cấp đó. Thử hỏi Võ sư đi!',
    'Tảo cước là mũi tên xuống. Đừng nhầm, té là đau lắm.',
  ],
};
// v39: câu nói nhanh giữa người chơi (chỉ gửi số thứ tự, không cho gõ chữ tự do)
export const PHRASES = ['A Di Đà Phật 🙏', 'Chào cả nhà! 👋', 'Chào bạn! 👋', 'Lạy cùng nha! 🙏', 'Ra sân võ đấu không? 🥋', 'Đi quét lá đa nè 🍂', 'Xin xăm chưa?', 'Haha 😄', 'Hẹn gặp lại!'];
const DOING = { mo: 'gõ mõ', vo: 'luyện võ', shop: 'mua nhang', xam: 'xin xăm', ask: 'hỏi Thầy Phán' };
const VISITOR_WHO = ['Khách thập phương', 'Cô Ba', 'Bác Sáu', 'Chị Mai', 'Anh Tuấn', 'Bà Năm'];

/* ===================================================================== */
const T = 16, W = 46, H = 40;
const WL = 3, WR = 42, WT = 2, WB = 30; // tường bao
const KEY = 'kw_temple';
const vnNow = () => new Date(Date.now() + 7 * 3600e3);
const vnDay = () => vnNow().toISOString().slice(0, 10);
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

// Cấp võ: [số bài đã luyện, tên cấp]
const VO_RANKS = [[0, 'Nhập môn'], [5, 'Sơ cấp'], [15, 'Trung cấp'], [30, 'Cao cấp'], [60, 'Cao thủ'], [100, 'Võ lâm cao thủ']];
const voRank = (xp) => { let i = 0; VO_RANKS.forEach(([n], j) => { if (xp >= n) i = j; }); return i; };

function normalizeState(s) {
  const base = { cd: 0, inv: { nhang: 0, tram: 0, sen: 0, trai: 0 }, day: '', today: 0, cat: '', seen: false, seen38: false, last: {}, sound: true, ts: 0, vo: 0, swept: 0, bows: 0, bell: '' };
  if (!s || typeof s !== 'object') return base;
  const n = (v) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : 0);
  const out = { ...base, ...s };
  out.cd = n(s.cd); out.today = Math.min(CAP_PER_DAY, n(s.today)); out.ts = n(s.ts);
  out.vo = n(s.vo); out.swept = n(s.swept); out.bows = n(s.bows);
  out.inv = { nhang: n(s.inv?.nhang), tram: n(s.inv?.tram), sen: n(s.inv?.sen), trai: n(s.inv?.trai) };
  out.last = s.last && typeof s.last === 'object' ? s.last : {};
  out.sound = s.sound !== false; out.seen = !!s.seen; out.seen38 = !!s.seen38;
  out.day = typeof s.day === 'string' ? s.day : ''; out.cat = typeof s.cat === 'string' ? s.cat : '';
  out.bell = typeof s.bell === 'string' ? s.bell : '';
  return out;
}

/* ---------- map (cố định) ----------
   Trong tường: Chánh điện (giữa, trên) · Lầu chuông (trái) · Lầu trống (phải) · Bảo tháp + Hồ sen (phải)
   Cây bồ đề + Nhà mõ (trái) · Sân luyện võ (góc trái dưới) · Sân cây đa (góc phải dưới) · Cổng tam quan
   Ngoài cổng: Quầy nhang, biển chỉ dẫn, đường xuống bến phà. */
const G = 0, FL = 1, TR = 2, DIRT = 3, STONE = 4, WALL = 5, WATER = 6, LOTUS = 7, SOLID = 8, SAND = 9, MAT = 10;
const MATS = [20, 21, 22, 23, 24, 25].map((x) => ({ x, y: 9 }));
const EXITS = [[22, H - 1], [23, H - 1]];
const LEAF_ZONE = { x0: 29, x1: 41, y0: 22, y1: 28 };
function buildMap() {
  const tile = Array.from({ length: H }, () => Array(W).fill(G));
  const obj = Array.from({ length: H }, () => Array(W).fill(null));
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tile[y][x] = c; };
  const place = (id, x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { tile[y][x] = SOLID; obj[y][x] = id; } };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (x < 2 || x >= W - 2 || y < 2) tile[y][x] = TR;
    if (y > WB && (x < 12 || x > 33)) tile[y][x] = TR;
    if (y > WB + 1 && (x < 15 || x > 30) && hash(x, y, 8) < 0.7) tile[y][x] = TR;
    if (y === H - 1 && (x < 22 || x > 23)) tile[y][x] = TR;
  }
  for (let y = WT + 1; y < WB; y++) for (let x = WL + 1; x < WR; x++) if (hash(x, y, 3) < 0.1) tile[y][x] = FL;
  for (let y = WB + 1; y < H - 1; y++) for (let x = 12; x <= 33; x++) if (tile[y][x] === G && hash(x, y, 5) < 0.14) tile[y][x] = FL;
  fill(WL, WT, WR, WT, WALL); fill(WL, WB, WR, WB, WALL); fill(WL, WT, WL, WB, WALL); fill(WR, WT, WR, WB, WALL);
  // sân đá
  fill(14, 9, 31, 12, STONE); fill(20, 13, 25, 28, STONE);
  fill(6, 15, 19, 16, STONE); fill(26, 15, 30, 16, STONE); fill(7, 14, 8, 14, STONE);
  // sân luyện võ (cát) + sân cây đa (đất nện)
  fill(5, 19, 16, 28, SAND); fill(29, 18, 41, 28, DIRT);
  // hồ sen
  fill(33, 9, 39, 13, WATER);
  [[34, 10], [36, 11], [38, 12], [35, 12], [38, 10]].forEach(([x, y]) => { tile[y][x] = LOTUS; });
  // ngoài cổng
  fill(22, WB + 1, 23, H - 1, DIRT); fill(17, 32, 28, 36, DIRT);
  // cây trong sân
  [[4, 3], [9, 3], [14, 3], [31, 3], [41, 3], [41, 7], [4, 9], [4, 14], [41, 15], [17, 27], [28, 27], [18, 21], [27, 21], [4, 29], [41, 29]].forEach(([x, y]) => { tile[y][x] = TR; });
  MATS.forEach((m) => { tile[m.y][m.x] = MAT; });
  place('hall', 16, 3, 14, 6);
  place('bell', 11, 5, 3, 3);
  place('drum', 32, 5, 3, 3);
  place('thap', 37, 3, 3, 4);
  place('bodhi', 5, 4, 3, 3);
  place('mo', 6, 10, 4, 4);
  place('burner', 22, 13, 2, 1);
  [[19, 18], [26, 18], [19, 24], [26, 24]].forEach(([x, y]) => place('lamp', x, y, 1, 1));
  [[6, 20], [10, 20], [14, 20]].forEach(([x, y]) => place('dummy', x, y, 1, 1));
  place('rack', 15, 27, 2, 1);
  place('banyan', 33, 20, 4, 3);
  place('broom', 40, 27, 1, 1);
  place('gate', 20, WB - 1, 6, 2);
  for (const [x, y] of [[22, WB - 1], [23, WB - 1], [22, WB], [23, WB]]) { tile[y][x] = DIRT; obj[y][x] = null; }
  place('stall', 25, 33, 3, 2);
  place('sign', 19, 33, 1, 1);
  return { tile, obj };
}
const isSolid = (c) => c === TR || c === WALL || c === WATER || c === LOTUS || c === SOLID;

/* ---------- pixel helpers ---------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function disc(g, c, cx, cy, r) { g.fillStyle = c; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g.fillRect(x, y, 1, 1); }
function outline(c, col = '#241a26') {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height), a = d.data, w = c.width, h = c.height, m = [];
  const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3]) continue;
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) m.push([x, y]);
  }
  g.fillStyle = col; m.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  return c;
}
/* ---------- tiles ---------- */
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
function drawDirt(g, px, py, x, y) {
  R(g, '#dcc28a', px, py, T, T);
  for (let i = 0; i < 4; i++) R(g, i % 2 ? '#c9ab70' : '#e9d6a6', px + Math.floor(hash(x, y, 60 + i) * 15), py + Math.floor(hash(x, y, 70 + i) * 15), 2, 1);
}
function drawStone(g, px, py) {
  R(g, '#d6cbb5', px, py, T, T);
  R(g, '#b6a98f', px, py, T, 1); R(g, '#b6a98f', px, py + 8, T, 1);
  R(g, '#b6a98f', px, py, 1, 8); R(g, '#b6a98f', px + 8, py + 8, 1, 8);
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
function drawWall(g, px, py, x, y) {
  if ((x === WL || x === WR) && y > WT && y < WB) {
    drawGrass(g, px, py, x, y);
    R(g, '#e3ac52', px + 2, py, 12, T); R(g, '#b98535', px + 2, py, 1, T); R(g, '#b98535', px + 13, py, 1, T);
    R(g, '#8e3a22', px + 4, py, 8, T);
    for (let j = 0; j < T; j += 4) { R(g, '#b0502f', px + 5, py + j, 2, 2); R(g, '#b0502f', px + 9, py + j + 2, 2, 2); }
    return;
  }
  R(g, '#e3ac52', px, py + 6, T, 10); R(g, '#c48f3c', px, py + 13, T, 3); R(g, '#f2c97a', px, py + 6, T, 1);
  R(g, '#8e3a22', px, py, T, 6); R(g, '#5e2414', px, py + 5, T, 1);
  for (let i = 0; i < T; i += 4) R(g, '#b0502f', px + i + 1, py + 1, 2, 2);
  R(g, '#b98535', px + 6, py + 9, 4, 3); R(g, '#7a4a20', px + 7, py + 10, 2, 1);
}
function drawWater(g, tile, px, py, x, y) {
  R(g, '#4aa3dc', px, py, T, T);
  R(g, '#3d8fc8', px, py + 11, T, 5);
  const wet = (xx, yy) => yy >= 0 && yy < H && xx >= 0 && xx < W && (tile[yy][xx] === WATER || tile[yy][xx] === LOTUS);
  if (!wet(x, y - 1)) { R(g, '#a9a08f', px, py, T, 3); R(g, '#cfc6b4', px, py, T, 1); R(g, '#2f78ad', px, py + 3, T, 1); }
  if (!wet(x, y + 1)) R(g, '#a9a08f', px, py + 14, T, 2);
  if (!wet(x - 1, y)) R(g, '#a9a08f', px, py, 2, T);
  if (!wet(x + 1, y)) R(g, '#a9a08f', px + 14, py, 2, T);
}
function drawLotus(g, tile, px, py, x, y) {
  drawWater(g, tile, px, py, x, y);
  disc(g, '#3f8f3e', px + 6, py + 10, 4.2); R(g, '#4aa3dc', px + 6, py + 9, 3, 1);
  disc(g, '#56a84e', px + 11.5, py + 5.5, 3); R(g, '#4aa3dc', px + 11, py + 5, 2, 1);
  R(g, '#ff9fc0', px + 4, py + 6, 5, 3); R(g, '#ff9fc0', px + 5, py + 4, 3, 2); R(g, '#ffd1e0', px + 6, py + 4, 1, 3); R(g, '#e86a98', px + 4, py + 8, 5, 1);
}

function drawSand(g, px, py, x, y) {
  R(g, '#e8d3a0', px, py, T, T);
  for (let i = 0; i < 6; i++) R(g, i % 2 ? '#d6bd84' : '#f3e3b8', px + Math.floor(hash(x, y, 80 + i) * 15), py + Math.floor(hash(x, y, 90 + i) * 15), 1, 1);
  if (hash(x, y, 99) < 0.3) R(g, '#d6bd84', px + 3 + Math.floor(hash(x, y, 98) * 8), py + 4 + Math.floor(hash(x, y, 97) * 8), 3, 1);
}
function drawMat(g, px, py) {
  drawStone(g, px, py);
  R(g, '#7a1f17', px + 2, py + 3, 12, 12); R(g, '#b3342a', px + 2, py + 3, 12, 11); R(g, '#d65a42', px + 2, py + 3, 12, 1);
  R(g, '#f2c14e', px + 3, py + 5, 10, 1); R(g, '#f2c14e', px + 3, py + 11, 10, 1); R(g, '#e3a83c', px + 7, py + 7, 2, 2);
}
function roofRows(g, ox, oy, y0, y1, xa0, xa1, xb0, xb1, base, stripe, hi) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0 - 1 || 1), x0 = Math.round(xa0 + (xb0 - xa0) * t), x1 = Math.round(xa1 + (xb1 - xa1) * t);
    R(g, y === y0 ? hi : base, ox + x0, oy + y, x1 - x0, 1);
    for (let x = x0 + 2; x < x1 - 1; x += 4) R(g, stripe, ox + x, oy + y, 1, 1);
  }
}
function curl(g, x, y, dir) {
  R(g, '#e3a83c', x, y - 2, 3, 3); R(g, '#e3a83c', x + dir * 2, y - 5, 2, 4); R(g, '#e3a83c', x + dir * 3, y - 7, 2, 3); R(g, '#ffd27a', x + dir * 3, y - 7, 1, 1);
}
function drawGateBase(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  for (const [x, w] of [[0, 28], [68, 28]]) { r('#e3ac52', x, 12, w, 20); r('#c48f3c', x, 27, w, 5); r('#f2c97a', x, 12, w, 1); }
  for (const cx of [14, 82]) { disc(g, '#f2c14e', ox + cx, oy + 20, 5); disc(g, '#7a2a1a', ox + cx, oy + 20, 3.4); r('#f2c14e', cx - 3, 19, 6, 1); }
  for (const x of [26, 64]) { r('#b3342a', x, 8, 6, 24); r('#d65a42', x, 8, 1, 24); r('#7a1f17', x + 5, 8, 1, 24); r('#f2c14e', x - 1, 28, 8, 3); }
}
function drawGateRoof(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  roofRows(g, ox, oy, 5, 12, 2, 28, 0, 30, '#8c2d1d', '#6a2014', '#b0442c'); r('#e3a83c', 0, 11, 30, 2); curl(g, ox, oy + 12, -1);
  roofRows(g, ox, oy, 5, 12, 68, 94, 66, 96, '#8c2d1d', '#6a2014', '#b0442c'); r('#e3a83c', 66, 11, 30, 2); curl(g, ox + 93, oy + 12, 1);
  roofRows(g, ox, oy, -6, 9, 30, 66, 20, 76, '#9a3322', '#742316', '#c0563a'); r('#e3a83c', 20, 8, 56, 3);
  curl(g, ox + 20, oy + 10, -1); curl(g, ox + 73, oy + 10, 1);
  r('#6e2115', 30, -8, 36, 3); r('#e3a83c', 30, -8, 36, 1); disc(g, '#e3a83c', ox + 48, oy - 9, 2.5);
  r('#e3a83c', 38, 0, 20, 8); r('#4a1a10', 40, 2, 16, 4); r('#f2c14e', 42, 3, 3, 2); r('#f2c14e', 47, 3, 3, 2); r('#f2c14e', 52, 3, 2, 2);
}
function drawPavilion(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.18)', 2, 60, 60, 3);
  r('#a99c86', 2, 48, 60, 13); r('#cfc4ae', 2, 48, 60, 2);
  r('#d7a24c', 6, 24, 52, 24); r('#b88437', 6, 24, 52, 3);
  r('#7d2a1c', 18, 30, 28, 18); r('#a53a28', 18, 30, 28, 2);
  r('#b8322a', 20, 46, 24, 4); r('#d9584a', 20, 46, 24, 1);
  disc(g, '#a8642e', ox + 32, oy + 40, 8.5); disc(g, '#c27a3c', ox + 30, oy + 37, 4.5); disc(g, '#e0a066', ox + 28, oy + 35, 1.5);
  r('#3b1d0e', 30, 43, 10, 2); r('#6b3b1a', 26, 39, 2, 2);
  r('#e8c98a', 40, 30, 10, 2); r('#c98b4e', 37, 29, 4, 4);
  for (const x of [6, 52]) { r('#b3342a', x, 24, 6, 26); r('#d65a42', x, 24, 1, 26); r('#7a1f17', x + 5, 24, 1, 26); r('#f2c14e', x - 1, 46, 8, 3); }
  roofRows(g, ox, oy, 10, 26, 8, 56, 0, 64, '#8c2d1d', '#6a2014', '#b0442c'); r('#e3a83c', 0, 25, 64, 3);
  curl(g, ox, oy + 26, -1); curl(g, ox + 61, oy + 26, 1);
  roofRows(g, ox, oy, 0, 11, 16, 48, 10, 54, '#9a3322', '#742316', '#c0563a'); r('#e3a83c', 10, 10, 44, 2);
  r('#6e2115', 18, -2, 28, 3); r('#e3a83c', 18, -2, 28, 1); disc(g, '#e3a83c', ox + 32, oy - 3, 2.5);
}
function drawBodhi(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(30,70,30,.35)', 4, 40, 40, 7);
  r('#7b4a2a', 20, 28, 8, 16); r('#5a3420', 26, 28, 2, 16); r('#7b4a2a', 16, 42, 4, 3); r('#7b4a2a', 28, 42, 5, 3);
  for (let j = 0; j < 36; j++) for (let i = 0; i < 48; i++) {
    const d = Math.hypot(i + 0.5 - 24, (j + 0.5 - 17) * 1.15); if (d > 22) continue;
    let c = '#3a8740'; if (d > 20) c = '#235a2a'; else if (hash(i, j, 99) < 0.12) c = '#2c6e33'; else if ((i - 16) ** 2 + (j - 10) ** 2 < 50) c = '#5fb156';
    r(c, i, j - 2, 1, 1);
  }
  for (let k = 0; k < 14; k++) { const x = 6 + Math.floor(hash(k, 1, 7) * 36), y = 4 + Math.floor(hash(k, 2, 7) * 24); r('#8fd27c', x, y, 2, 1); r('#8fd27c', x + 1, y + 1, 1, 1); }
  r('#ffd27a', 22, 30, 4, 1); r('#e23b2b', 22, 31, 4, 3);
}
function drawBurner(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.2)', 4, 13, 24, 3);
  r('#6e5226', 7, 10, 3, 5); r('#6e5226', 22, 10, 3, 5);
  for (let y = -2; y < 12; y++) { const w = Math.round(22 - Math.abs(y - 5) * 0.9); r(y < 2 ? '#b8924a' : '#9c7a3e', 16 - w / 2, y, w, 1); }
  r('#e0b85a', 5, -3, 22, 2); r('#7a5a2a', 6, 6, 20, 1);
  r('#9c7a3e', 2, 0, 3, 4); r('#9c7a3e', 27, 0, 3, 4);
  for (const x of [11, 14, 17, 20]) { r('#c23a2a', x, -12, 1, 10); r('#ff9a3a', x, -13, 1, 1); }
}
function drawStallBack(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.18)', 2, 30, 46, 3);
  r('#7a4a2a', 3, -6, 3, 36); r('#7a4a2a', 42, -6, 3, 36);
  r('#6b4024', 6, 2, 36, 8); for (let x = 8; x < 40; x += 4) { r('#c23a2a', x, 3, 1, 6); r('#ffcf5a', x, 3, 1, 1); }
}
function drawStallFront(g, ox, oy) {
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  for (let i = 0; i < 8; i++) r(i % 2 ? '#f4d35e' : '#d64533', i * 6, -14, 6, 9);
  for (let i = 0; i < 8; i++) disc(g, i % 2 ? '#f4d35e' : '#d64533', ox + i * 6 + 3, oy - 5, 3);
  r('#a8341f', 0, -15, 48, 2);
  r('#9a6a3a', 2, 12, 44, 20); r('#b98552', 2, 12, 44, 2); r('#7d5230', 2, 20, 44, 1); r('#7d5230', 2, 27, 44, 1);
  r('#f2c14e', 16, 22, 16, 7); r('#7d2a1c', 18, 24, 12, 3);
  for (const x of [6, 9]) { r('#c23a2a', x, 4, 2, 8); r('#ffcf5a', x, 4, 2, 1); }
  r('#e3a83c', 5, 9, 7, 2);
  r('#d9784a', 34, 8, 8, 4); disc(g, '#f08a3c', ox + 36, oy + 7, 2); disc(g, '#7cc25e', ox + 40, oy + 7, 2); disc(g, '#e6463a', ox + 38, oy + 5, 2);
  r('#ff9fc0', 22, 6, 4, 4); r('#ffd1e0', 23, 6, 1, 2); r('#3f8f3e', 23, 10, 2, 2);
}
function drawSign(g, px, py) {
  R(g, '#7b4a2a', px + 7, py + 8, 2, 8);
  R(g, '#6b4024', px + 1, py + 1, 14, 9); R(g, '#c99a5e', px + 2, py + 2, 12, 7);
  R(g, '#7d5230', px + 4, py + 4, 8, 1); R(g, '#7d5230', px + 4, py + 6, 6, 1);
}

/* ---------- v38: công trình mới ---------- */
const HALL_W = 224;
function drawHall(g, ox, oy) { // Chánh điện 14×6 ô, 3 tầng mái
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h), w = HALL_W, cx = w / 2;
  r('rgba(0,0,0,.18)', 2, 94, w - 4, 3);
  r('#a99c86', 2, 80, w - 4, 15); r('#cfc4ae', 2, 80, w - 4, 2);
  for (let i = 0; i < 3; i++) { r('#bfb39c', cx - 30 - i * 3, 84 + i * 3, 60 + i * 6, 3); r('#e2d9c6', cx - 30 - i * 3, 84 + i * 3, 60 + i * 6, 1); }
  r('#e7b45a', 8, 44, w - 16, 37); r('#c88f3c', 8, 70, w - 16, 11); r('#f2c97a', 8, 46, w - 16, 1);
  const door = (x, y, dw, dh) => {
    r('#f2c14e', x, y, dw, dh); r('#5a2716', x + 2, y + 2, dw - 4, dh - 2); r('#3a170c', x + dw / 2 - 1, y + 2, 2, dh - 2);
    for (let yy = y + 7; yy < y + dh - 2; yy += 8) for (const xx of [x + 5, x + dw / 2 - 5, x + dw / 2 + 3, x + dw - 7]) r('#e3a83c', xx, yy, 2, 2);
  };
  door(cx - 20, 48, 40, 33); door(cx - 66, 54, 28, 27); door(cx + 38, 54, 28, 27);
  for (const wx of [24, w - 24]) { disc(g, '#f2c14e', ox + wx, oy + 60, 8); disc(g, '#7a2a1a', ox + wx, oy + 60, 6); r('#f2c14e', wx - 6, 59, 12, 2); r('#f2c14e', wx - 1, 54, 2, 12); }
  for (const x of [8, 40, cx - 32, cx + 26, w - 46, w - 14]) { r('#b3342a', x, 44, 6, 37); r('#d65a42', x, 44, 1, 37); r('#7a1f17', x + 5, 44, 1, 37); r('#f2c14e', x - 1, 44, 8, 3); r('#f2c14e', x - 1, 77, 8, 3); }
  for (const x of [cx - 26, cx + 22]) { r('#5a2716', x + 1, 46, 1, 3); r('#e23b2b', x - 1, 49, 5, 7); r('#ff7a55', x, 50, 1, 5); r('#f2c14e', x - 1, 49, 5, 1); r('#f2c14e', x - 1, 55, 5, 1); r('#f2c14e', x + 1, 56, 1, 3); }
  // mái dưới
  roofRows(g, ox, oy, 28, 44, 14, w - 14, 0, w, '#8c2d1d', '#6a2014', '#b0442c');
  r('#e3a83c', 0, 43, w, 3); r('#a8701f', 0, 46, w, 1);
  curl(g, ox, oy + 43, -1); curl(g, ox + w - 3, oy + 43, 1);
  // hoành phi
  r('#e3a83c', cx - 36, 30, 72, 13); r('#4a1a10', cx - 34, 32, 68, 9);
  for (let i = 0; i < 6; i++) { const gx = cx - 30 + i * 10; r('#f2c14e', gx, 34, 6, 1); r('#f2c14e', gx + 2, 33, 2, 7); r('#f2c14e', gx, 37, 6, 1); }
  // mái giữa
  roofRows(g, ox, oy, 12, 28, 34, w - 34, 18, w - 18, '#9a3322', '#742316', '#c0563a');
  r('#e3a83c', 16, 27, w - 32, 3); curl(g, ox + 16, oy + 29, -1); curl(g, ox + w - 19, oy + 29, 1);
  // mái trên
  r('#e7b45a', 56, 2, w - 112, 10); for (let x = 62; x < w - 62; x += 10) r('#b3342a', x, 4, 4, 6);
  roofRows(g, ox, oy, -6, 4, 62, w - 62, 48, w - 48, '#9a3322', '#742316', '#c0563a');
  r('#e3a83c', 46, 3, w - 92, 3); curl(g, ox + 46, oy + 5, -1); curl(g, ox + w - 49, oy + 5, 1);
  r('#6e2115', 62, -10, w - 124, 4); r('#e3a83c', 62, -10, w - 124, 1);
  r('#e3a83c', 59, -14, 4, 6); r('#e3a83c', w - 63, -14, 4, 6);
  disc(g, '#e3a83c', ox + cx, oy - 12, 4); disc(g, '#ff7a3a', ox + cx, oy - 12, 2.5); disc(g, '#ffd27a', ox + cx - 1, oy - 13, 1);
  for (let i = 0; i < 18; i++) { r('#e3a83c', cx - 24 + i, -11 + [0, -1, -2, -1][i % 4], 1, 2); r('#e3a83c', cx + 6 + i, -11 + [-1, -2, -1, 0][i % 4], 1, 2); }
}
function drawTower(g, ox, oy, kind) { // Lầu chuông / Lầu trống 3×3 ô
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.18)', 2, 46, 44, 3);
  r('#a99c86', 2, 36, 44, 11); r('#cfc4ae', 2, 36, 44, 2);
  r('#6a2a1c', 10, 16, 28, 20); r('#4a1a10', 10, 16, 28, 2);
  if (kind === 'bell') {
    r('#5a3a10', 23, 16, 2, 3);
    for (let y = 19; y < 33; y++) { const bw = Math.round(8 + (y - 19) * 0.55 + (y > 30 ? 2 : 0)); r(y > 30 ? '#b9822a' : '#d9a43a', 24 - bw / 2, y, bw, 1); }
    r('#f2d27a', 20, 21, 1, 9); r('#b9822a', 17, 26, 14, 1); r('#7a4a20', 22, 33, 4, 2);
  } else {
    r('#6b4024', 15, 31, 2, 5); r('#6b4024', 31, 31, 2, 5);
    r('#b3342a', 13, 21, 22, 11); r('#d65a42', 13, 21, 22, 1); r('#7a1f17', 13, 30, 22, 2);
    r('#f0d9a8', 15, 20, 18, 2); r('#e3a83c', 13, 23, 22, 1); r('#e3a83c', 13, 28, 22, 1);
    r('#e8c98a', 35, 18, 2, 12); disc(g, '#c98b4e', ox + 36, oy + 17, 2);
  }
  for (const x of [5, 37]) { r('#b3342a', x, 16, 6, 22); r('#d65a42', x, 16, 1, 22); r('#7a1f17', x + 5, 16, 1, 22); r('#f2c14e', x - 1, 34, 8, 3); }
  roofRows(g, ox, oy, 5, 16, 8, 40, 0, 48, '#8c2d1d', '#6a2014', '#b0442c'); r('#e3a83c', 0, 15, 48, 2);
  curl(g, ox, oy + 16, -1); curl(g, ox + 45, oy + 16, 1);
  r('#e7b45a', 14, 0, 20, 6);
  roofRows(g, ox, oy, -9, 2, 16, 32, 8, 40, '#9a3322', '#742316', '#c0563a'); r('#e3a83c', 8, 1, 32, 2);
  curl(g, ox + 8, oy + 2, -1); curl(g, ox + 37, oy + 2, 1);
  r('#6e2115', 16, -11, 16, 3); r('#e3a83c', 16, -11, 16, 1); disc(g, '#e3a83c', ox + 24, oy - 12, 2.5);
}
function drawThap(g, ox, oy) { // Bảo tháp 5 tầng, 3×4 ô
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.18)', 0, 62, 48, 3);
  r('#a99c86', 0, 52, 48, 11); r('#cfc4ae', 0, 52, 48, 2); r('#8e826d', 0, 60, 48, 2);
  for (let i = 0; i < 5; i++) {
    const bw = 34 - i * 5, bx = 24 - bw / 2, by = 42 - i * 12;
    r('#efe2c4', bx, by, bw, 10); r('#d9c9a4', bx, by + 8, bw, 2); r('#fff5dc', bx, by, 1, 10);
    r('#7a2a1a', 22, by + 3, 4, 7); r('#f2c14e', 22, by + 3, 4, 1);
    if (bw > 22) { r('#7a2a1a', bx + 3, by + 4, 2, 4); r('#7a2a1a', bx + bw - 5, by + 4, 2, 4); }
    roofRows(g, ox, oy, by - 4, by + 1, bx + 1, bx + bw - 1, bx - 4, bx + bw + 4, '#8c2d1d', '#6a2014', '#b0442c');
    r('#e3a83c', bx - 4, by, bw + 8, 1);
    r('#e3a83c', bx - 5, by - 2, 2, 2); r('#e3a83c', bx + bw + 3, by - 2, 2, 2);
  }
  r('#e3a83c', 23, -22, 2, 14); disc(g, '#e3a83c', ox + 24, oy - 12, 3); disc(g, '#e3a83c', ox + 24, oy - 17, 2.2); disc(g, '#ffd27a', ox + 24, oy - 23, 1.6);
}
function drawLamp(g, px, py) { // đèn đá
  R(g, 'rgba(0,0,0,.2)', px + 3, py + 13, 10, 3);
  R(g, '#9c9484', px + 4, py + 11, 8, 4); R(g, '#b9b2a2', px + 6, py + 3, 4, 9);
  R(g, '#a39b8a', px + 3, py - 4, 10, 7); R(g, '#ffd27a', px + 5, py - 2, 6, 4); R(g, '#e3a83c', px + 7, py - 2, 2, 4);
  R(g, '#7f786b', px + 2, py - 7, 12, 3); R(g, '#9c9484', px + 6, py - 9, 4, 2);
}
function drawDummy(g, px, py) { // mộc nhân
  R(g, 'rgba(0,0,0,.2)', px + 3, py + 13, 10, 3);
  R(g, '#5a3420', px + 4, py + 12, 8, 3);
  R(g, '#8a5a2a', px + 6, py - 8, 4, 21); R(g, '#a8743e', px + 6, py - 8, 1, 21); R(g, '#6b4024', px + 9, py - 8, 1, 21);
  R(g, '#6b4024', px + 1, py - 4, 5, 2); R(g, '#6b4024', px + 10, py - 2, 5, 2); R(g, '#6b4024', px + 10, py + 4, 4, 2);
  R(g, '#c2412d', px + 6, py - 6, 4, 1);
}
function drawRack(g, ox, oy) { // giá binh khí 2×1
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(0,0,0,.2)', 1, 13, 30, 3);
  r('#6b4024', 2, -6, 3, 20); r('#6b4024', 27, -6, 3, 20); r('#7b4a2a', 2, -4, 28, 2); r('#7b4a2a', 2, 8, 28, 2);
  for (const [x, top, tip] of [[7, -14, 'staff'], [11, -12, 'spear'], [15, -16, 'staff'], [19, -10, 'blade'], [23, -13, 'spear']]) {
    r('#c99a5e', x, top, 1, 28 - (top + 14));
    if (tip === 'spear') { r('#c9ccd6', x - 1, top - 3, 3, 3); r('#e23b2b', x - 1, top, 3, 2); }
    if (tip === 'blade') { r('#d9dbe3', x, top - 6, 3, 7); r('#8a8f99', x + 2, top - 6, 1, 7); }
  }
}
function drawBroomRack(g, px, py) {
  R(g, 'rgba(0,0,0,.2)', px + 1, py + 13, 14, 3);
  R(g, '#6b4024', px + 1, py - 4, 2, 18); R(g, '#6b4024', px + 13, py - 4, 2, 18); R(g, '#7b4a2a', px + 1, py - 3, 14, 2);
  for (const x of [5, 9]) {
    R(g, '#c99a5e', px + x, py - 8, 1, 14);
    for (let i = 0; i < 6; i++) R(g, i % 2 ? '#c9a24a' : '#e6c36a', px + x - 2 + Math.floor(i * 0.9), py + 6, 1, 7 - (i % 3));
  }
}
function drawBanyanTrunk(g, ox, oy) { // gốc đa 4×3 ô
  const r = (c, x, y, w, h) => R(g, c, ox + x, oy + y, w, h);
  r('rgba(30,70,30,.35)', -6, 40, 76, 8);
  r('#6b4428', 6, 40, 52, 5); r('#6b4428', 12, 34, 40, 7);
  r('#6b4428', 20, 2, 24, 36); r('#87583a', 21, 2, 3, 36); r('#4f3019', 40, 2, 3, 36);
  for (let y = 6; y < 36; y += 7) r('#4f3019', 26 + (y % 3), y, 8, 1);
  for (const [x, len] of [[3, 40], [9, 34], [14, 42], [50, 38], [55, 32], [61, 41]]) {
    r('#7d5636', x, 0, 2, len); r('#5e3c22', x - 1, len - 1, 4, 2);
  }
  r('#e23b2b', 20, 22, 24, 2); r('#f2c14e', 20, 24, 24, 1); // dải vải đỏ quấn gốc
}
function drawBanyanCanopy(g, ox, oy) {
  const cx = 32, cy = -12, rx = 62, ry = 34;
  for (let j = -ry - 6; j < ry + 6; j++) for (let i = -rx - 6; i < rx + 6; i++) {
    const wob = (hash(Math.floor((i + 200) / 5), Math.floor((j + 200) / 5), 11) - 0.5) * 0.18;
    const d = Math.hypot(i / rx, j / ry) + wob; if (d > 1) continue;
    let c = '#3a8740';
    if (d > 0.92) c = '#235a2a';
    else if (hash(i + 300, j + 300, 12) < 0.1) c = '#2c6e33';
    else if (((i + 18) / rx) ** 2 + ((j + 12) / ry) ** 2 < 0.12) c = '#5fb156';
    else if (j > ry * 0.45) c = '#2f7536';
    R(g, c, ox + cx + i, oy + cy + j, 1, 1);
  }
  for (let k = 0; k < 40; k++) { const x = cx - 50 + Math.floor(hash(k, 3, 13) * 100), y = cy - 24 + Math.floor(hash(k, 4, 13) * 46); R(g, '#8fd27c', ox + x, oy + y, 2, 1); R(g, '#8fd27c', ox + x + 1, oy + y + 1, 1, 1); }
  for (let k = 0; k < 14; k++) { const x = cx - 44 + Math.floor(hash(k, 5, 13) * 88), y = cy - 18 + Math.floor(hash(k, 6, 13) * 36); R(g, '#e3b341', ox + x, oy + y, 2, 1); }
}
/* ---------- sprites ---------- */
const PAL = {
  player: { skin: '#f2c9a6', hair: '#2b2530', shirt: '#8b7cf6', shirt2: '#6f5fe0', pants: '#3b3f6b', shoe: '#4a3020', bag: '#f08a3c', bag2: '#c56a24' },
  monk: { skin: '#f0c49e', hair: '#e2b48e', shirt: '#d98f2f', shirt2: '#b8741f', pants: '#d98f2f', shoe: '#6b4024', robe: true, bald: true },
  seller: { skin: '#e8b98f', hair: '#2b2530', shirt: '#7d5fb5', shirt2: '#5f4596', pants: '#2b2530', shoe: '#4a3020', hat: true },
  student: { skin: '#f5d0b0', hair: '#6b4024', shirt: '#ffffff', shirt2: '#d6d3e0', pants: '#2f4a7a', shoe: '#2b2530', book: true },
  master: { skin: '#e8b98f', hair: '#cfc6b8', shirt: '#7d7f8c', shirt2: '#5f616d', pants: '#7d7f8c', shoe: '#3b2a1a', robe: true, bald: true },
  trainee: { skin: '#f0c49e', hair: '#e2b48e', shirt: '#d98f2f', shirt2: '#b8741f', pants: '#8e3a22', shoe: '#3b2a1a', bald: true },
};
// Khách thập phương: áo dài, áo tràng lam, ông bà cụ, nón lá…
const VISITOR_PALS = [
  { skin: '#f2c9a6', hair: '#2b2530', shirt: '#e86a98', shirt2: '#c04a78', pants: '#e86a98', shoe: '#4a3020', robe: true },
  { skin: '#f5d0b0', hair: '#2b2530', shirt: '#4a7ad9', shirt2: '#3a5fb0', pants: '#4a7ad9', shoe: '#4a3020', robe: true },
  { skin: '#e8b98f', hair: '#d8d4cc', shirt: '#8a9fb5', shirt2: '#6f839a', pants: '#8a9fb5', shoe: '#3b2a1a', robe: true },
  { skin: '#e8b98f', hair: '#bdb7ad', shirt: '#6b5a4a', shirt2: '#54463a', pants: '#3b3f6b', shoe: '#2b2530' },
  { skin: '#f2c9a6', hair: '#2b2530', shirt: '#f2f2f2', shirt2: '#cfcfd8', pants: '#2b2530', shoe: '#4a3020', hat: true },
  { skin: '#f0c49e', hair: '#3b2a20', shirt: '#7cc25e', shirt2: '#5aa04a', pants: '#3b3f6b', shoe: '#2b2530', bag: '#e23b2b', bag2: '#a8241a' },
  { skin: '#f5d0b0', hair: '#6b4024', shirt: '#f4d35e', shirt2: '#d6b23a', pants: '#2f4a7a', shoe: '#2b2530' },
  { skin: '#e8b98f', hair: '#2b2530', shirt: '#b8322a', shirt2: '#8e2a22', pants: '#2b2530', shoe: '#4a3020', hat: true },
];
function human(o, dir, f, pose) {
  if (pose === 'bow1' || pose === 'bow2') return kneel(o, pose === 'bow2');
  const c = mk(16, 20), g = c.getContext('2d'), Y = 3;
  const r = (col, x, y, w, h) => R(g, col, x, y + Y, w, h);
  const clr = (x, y, w, h) => g.clearRect(x, y + Y, w, h);
  const side = dir === 'left' || dir === 'right';
  if (o.robe) {
    r(o.shirt, 4, 8, 8, 6); r(o.shirt2, 4, 12, 8, 2); r(o.shirt2, 7, 9, 1, 4);
    if (f === 1) r(o.shoe, 5, 14, 2, 1); else if (f === 2) r(o.shoe, 9, 14, 2, 1); else { r(o.shoe, 5, 14, 2, 1); r(o.shoe, 9, 14, 2, 1); }
  } else if (!side) {
    const lA = f === 1 ? 1 : 2, lB = f === 2 ? 1 : 2;
    r(o.pants, 5, 12, 2, lA); r(o.shoe, 5, 12 + lA, 2, 1);
    r(o.pants, 9, 12, 2, lB); r(o.shoe, 9, 12 + lB, 2, 1);
  } else if (f === 0) { r(o.pants, 6, 12, 4, 2); r(o.shoe, 6, 14, 4, 1); } else { r(o.pants, 5, 12, 2, 2); r(o.shoe, 4, 14, 3, 1); r(o.pants, 9, 12, 2, 2); r(o.shoe, 9, 14, 3, 1); }
  if (!o.robe) { r(o.shirt, 4, 8, 8, 4); r(o.shirt2, 4, 11, 8, 1); }
  const sw = f === 0 ? 0 : (f === 1 ? -1 : 1);
  if (!side) {
    r(o.shirt, 3, 8, 1, 3); r(o.skin, 3, 11 + (sw < 0 ? -1 : 0), 1, 1);
    r(o.shirt, 12, 8, 1, 3); r(o.skin, 12, 11 + (sw > 0 ? -1 : 0), 1, 1);
  } else {
    const ax = dir === 'right' ? 7 : 8; r(o.shirt2, ax, 8, 1, 3); r(o.skin, ax + (f ? (f === 1 ? 1 : -1) : 0), 11, 1, 1);
  }
  if (o.bag && dir === 'up') { r(o.bag, 5, 8, 6, 4); r(o.bag2, 5, 11, 6, 1); r(o.bag2, 7, 9, 2, 1); }
  if (o.bag && dir === 'down') { r(o.bag2, 5, 8, 1, 3); r(o.bag2, 10, 8, 1, 3); }
  if (o.bag && side) { const bx = dir === 'right' ? 3 : 11; r(o.bag, bx, 8, 2, 4); r(o.bag2, bx, 11, 2, 1); }
  if (o.book && dir === 'down') { r('#e23b2b', 6, 9, 4, 3); r('#ffd27a', 6, 9, 4, 1); }
  r(o.skin, 4, 2, 8, 6);
  if (dir === 'down') {
    if (!o.bald) { r(o.hair, 4, 1, 8, 2); r(o.hair, 3, 2, 1, 4); r(o.hair, 12, 2, 1, 4); r(o.hair, 4, 3, 3, 1); r(o.hair, 9, 3, 3, 1); } else r(o.hair, 5, 1, 6, 1);
    r('#2a1f2a', 6, 5, 1, 2); r('#2a1f2a', 9, 5, 1, 2); r('#f4a08a', 5, 7, 1, 1); r('#f4a08a', 10, 7, 1, 1);
  } else if (dir === 'up') {
    if (!o.bald) { r(o.hair, 4, 1, 8, 6); r(o.hair, 3, 2, 1, 4); r(o.hair, 12, 2, 1, 4); } else { r(o.hair, 5, 1, 6, 1); r(o.hair, 4, 2, 8, 1); }
  } else {
    if (!o.bald) { r(o.hair, 4, 1, 8, 2); r(o.hair, dir === 'right' ? 4 : 9, 2, 3, 5); r(o.hair, dir === 'right' ? 3 : 12, 2, 1, 4); } else r(o.hair, 5, 1, 6, 1);
    r('#2a1f2a', dir === 'right' ? 9 : 6, 5, 1, 2); r(o.skin, dir === 'right' ? 12 : 3, 5, 1, 1);
    r('#f4a08a', dir === 'right' ? 10 : 5, 7, 1, 1);
  }
  if (o.hat) { r('#e9d39a', 7, -2, 2, 1); r('#e9d39a', 5, -1, 6, 1); r('#e9d39a', 3, 0, 10, 1); r('#e9d39a', 1, 1, 14, 1); r('#c9b06e', 1, 2, 14, 1); r('#c9b06e', 6, 0, 1, 1); }
  // v38: thế võ (nhìn từ trước) + chắp tay
  if (pose === 'pL') { clr(3, 8, 1, 4); r(o.shirt, 1, 8, 3, 2); r(o.skin, 0, 8, 1, 2); }
  if (pose === 'pR') { clr(12, 8, 1, 4); r(o.shirt, 12, 8, 3, 2); r(o.skin, 15, 8, 1, 2); }
  if (pose === 'pU') { clr(3, 8, 1, 4); clr(12, 8, 1, 4); r(o.shirt, 3, 3, 1, 6); r(o.skin, 3, 1, 1, 2); r(o.shirt, 12, 3, 1, 6); r(o.skin, 12, 1, 1, 2); }
  if (pose === 'kick') { clr(9, 12, 3, 3); r(o.pants, 11, 11, 3, 2); r(o.shoe, 14, 10, 2, 3); r(o.shirt, 12, 7, 2, 1); r(o.skin, 14, 7, 1, 1); }
  if (pose === 'join') { if (dir === 'down') { r(o.skin, 7, 9, 2, 2); } else if (dir === 'up') { r(o.skin, 3, 9, 1, 1); r(o.skin, 12, 9, 1, 1); } }
  return outline(c);
}
function kneel(o, deep) { // lạy — nhìn từ sau lưng (hướng lên Chánh điện)
  const c = mk(16, 20), g = c.getContext('2d'), Y = 3, r = (col, x, y, w, h) => R(g, col, x, y + Y, w, h);
  if (!deep) {
    r(o.shirt, 4, 10, 8, 5); r(o.shirt2, 4, 14, 8, 1); r(o.shoe, 5, 15, 2, 1); r(o.shoe, 9, 15, 2, 1);
    r(o.shirt, 3, 10, 1, 2); r(o.shirt, 12, 10, 1, 2); r(o.skin, 7, 3, 2, 2);
    r(o.skin, 4, 5, 8, 5);
    if (o.bald) { r(o.hair, 5, 5, 6, 1); r(o.hair, 4, 6, 8, 1); } else { r(o.hair, 4, 4, 8, 6); r(o.hair, 3, 5, 1, 4); r(o.hair, 12, 5, 1, 4); }
  } else {
    r(o.shirt, 3, 9, 10, 6); r(o.shirt2, 3, 13, 10, 2); r(o.shirt2, 7, 9, 2, 5);
    r(o.shoe, 5, 15, 2, 1); r(o.shoe, 9, 15, 2, 1);
    r(o.bald ? o.skin : o.hair, 5, 6, 6, 3); if (o.bald) r(o.hair, 5, 6, 6, 1);
    r(o.skin, 2, 7, 2, 1); r(o.skin, 12, 7, 2, 1);
  }
  return outline(c);
}
function makeCat(frame) {
  const c = mk(16, 20), g = c.getContext('2d'), r = (col, x, y, w, h) => R(g, col, x, y + 3, w, h);
  r('#f0a050', 3, 9, 10, 5); r('#f0a050', 2, 10, 12, 4); r('#ffffff', 4, 12, 5, 2);
  r('#f0a050', 10, 6, 5, 5); r('#f0a050', 10, 5, 1, 1); r('#f0a050', 14, 5, 1, 1); r('#ffffff', 12, 9, 2, 2);
  if (!frame) { r('#2a1f2a', 11, 8, 1, 1); r('#2a1f2a', 13, 8, 1, 1); }
  r('#c97a32', 5, 10, 1, 3); r('#c97a32', 7, 10, 1, 3); r('#f0a050', 1, 12, 2, 2); r('#c97a32', 0, 11, 2, 2);
  return outline(c);
}
function portrait() { // Thầy Phán — có thể thay bằng ảnh/avatar khác
  const c = mk(24, 24), g = c.getContext('2d'), r = (col, x, y, w, h) => R(g, col, x, y, w, h);
  r('#35343d', 0, 0, 24, 24); disc(g, '#4a3f6b', 12, 12, 11);
  r('#2b3a6b', 5, 18, 14, 6); r('#ffffff', 10, 18, 4, 3); r('#c2412d', 11, 19, 2, 5);
  r('#f2c9a6', 7, 6, 10, 11); r('#f2c9a6', 10, 16, 4, 2);
  r('#1f1a24', 6, 3, 12, 4); r('#1f1a24', 6, 6, 1, 4); r('#1f1a24', 17, 6, 1, 4); r('#1f1a24', 9, 2, 7, 1);
  r('#1f1a24', 7, 9, 4, 3); r('#1f1a24', 13, 9, 4, 3); r('#9fd0ff', 8, 10, 2, 1); r('#9fd0ff', 14, 10, 2, 1); r('#1f1a24', 11, 10, 2, 1);
  r('#b5523f', 10, 14, 4, 1); r('#f4a08a', 7, 13, 1, 1); r('#f4a08a', 16, 13, 1, 1);
  return c;
}
function icon(id) {
  const s = (b) => `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${b}</svg>`;
  if (id === 'nhang') return s('<rect x="5" y="2" width="1" height="11" fill="#e2463a"/><rect x="8" y="1" width="1" height="12" fill="#e2463a"/><rect x="11" y="3" width="1" height="10" fill="#e2463a"/><rect x="5" y="1" width="1" height="1" fill="#ffcf5a"/><rect x="8" y="0" width="1" height="1" fill="#ffcf5a"/><rect x="11" y="2" width="1" height="1" fill="#ffcf5a"/><rect x="4" y="10" width="9" height="2" fill="#f2c14e"/><rect x="4" y="13" width="9" height="2" fill="#9c7a3e"/>');
  if (id === 'tram') return s('<rect x="5" y="2" width="1" height="11" fill="#8a5a32"/><rect x="8" y="1" width="1" height="12" fill="#8a5a32"/><rect x="11" y="3" width="1" height="10" fill="#8a5a32"/><rect x="5" y="1" width="1" height="1" fill="#ff9a3a"/><rect x="8" y="0" width="1" height="1" fill="#ff9a3a"/><rect x="11" y="2" width="1" height="1" fill="#ff9a3a"/><rect x="4" y="9" width="9" height="3" fill="#ffd27a"/><rect x="6" y="10" width="5" height="1" fill="#b3342a"/><rect x="4" y="13" width="9" height="2" fill="#9c7a3e"/>');
  if (id === 'sen') return s('<rect x="7" y="2" width="2" height="9" fill="#ff9fc0"/><rect x="4" y="5" width="3" height="6" fill="#ff9fc0"/><rect x="9" y="5" width="3" height="6" fill="#ff9fc0"/><rect x="2" y="8" width="2" height="3" fill="#e86a98"/><rect x="12" y="8" width="2" height="3" fill="#e86a98"/><rect x="7" y="3" width="1" height="5" fill="#ffd1e0"/><rect x="3" y="11" width="10" height="2" fill="#3f8f3e"/><rect x="7" y="13" width="2" height="3" fill="#3f8f3e"/>');
  return s('<rect x="1" y="12" width="14" height="2" fill="#e3a83c"/><rect x="3" y="14" width="10" height="1" fill="#9c7a3e"/><rect x="2" y="8" width="4" height="4" fill="#f08a3c"/><rect x="6" y="6" width="4" height="6" fill="#e6463a"/><rect x="10" y="8" width="4" height="4" fill="#7cc25e"/><rect x="7" y="4" width="1" height="2" fill="#3f8f3e"/><rect x="3" y="9" width="1" height="1" fill="#ffd2a0"/><rect x="7" y="7" width="1" height="1" fill="#ff9a8a"/>');
}

const MARKUP = `
<div class="tp-hud">
  <span class="tp-chip tp-cd" title="Công đức">Công đức <b data-id="hCd">0</b></span>
  <span class="tp-chip tp-day" title="Công đức đã tích hôm nay (tối đa ${CAP_PER_DAY})">Hôm nay <b data-id="hDay">0</b>/${CAP_PER_DAY} <span class="tp-bar"><i data-id="hBar"></i></span></span>
  <span class="tp-chip tp-inv" data-id="hInv"></span>
  <span class="tp-chip tp-vo-chip" title="Cấp võ ở Sân luyện võ">Võ <b data-id="hVo">Nhập môn</b></span>
  <span class="tp-sp"></span>
  <button type="button" class="tp-chip tp-on" data-id="hOn" hidden title="Người chơi đang ở chùa"><i></i><b data-id="hOnN">1</b>&nbsp;người ở chùa</button>
  <button type="button" class="tp-ic" data-id="bChat" hidden title="Nói với mọi người (phím T)">💬 Nói</button>
  <button type="button" class="tp-ic" data-id="bSound">Âm: Bật</button>
  <button type="button" class="tp-ic" data-id="bHelp" aria-label="Cách chơi">?</button>
</div>
<div class="tp-stage" data-id="stage" tabindex="0" aria-label="Knoworld Temple — game">
  <canvas data-id="cv"></canvas>
  <div class="tp-hint">Đi: ← ↑ ↓ → / WASD · Shift: chạy · Space: tương tác</div>
  <div class="tp-sleep" data-id="sleep" hidden><span>Nhấp vào đây để tiếp tục chơi</span></div>
  <div class="tp-dlg" data-id="dlg"><div class="who"></div><div class="txt"></div><div class="choices"></div><div class="more">▼</div></div>
  <div class="tp-modal" data-id="modal"></div>
  <div class="tp-toast" data-id="toast"></div>
  <div class="tp-pad">
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

// v38: một lạy = 1.6 giây (đứng chắp tay → quỳ → cúi sát đất → quỳ → đứng)
const BOW = 1.6;
const bowPose = (t) => { const l = t % BOW; return l < 0.3 ? 'join' : l < 0.6 ? 'bow1' : l < 1.1 ? 'bow2' : l < 1.4 ? 'bow1' : 'join'; };
const MOVES = { ArrowLeft: ['←', 'Tả quyền', 'pL'], ArrowRight: ['→', 'Hữu quyền', 'pR'], ArrowUp: ['↑', 'Song phong', 'pU'], ArrowDown: ['↓', 'Tảo cước', 'kick'] };
const MOVE_KEY = { ArrowLeft: 'ArrowLeft', a: 'ArrowLeft', A: 'ArrowLeft', ArrowRight: 'ArrowRight', d: 'ArrowRight', D: 'ArrowRight', ArrowUp: 'ArrowUp', w: 'ArrowUp', W: 'ArrowUp', ArrowDown: 'ArrowDown', s: 'ArrowDown', S: 'ArrowDown' };
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const KATA = ['pL', 'pR', 'pU', 'kick', null, 'pR', 'pL', 'kick', null];

export function mountTemple(root, opts = {}) {
  ensureFont();
  root.innerHTML = MARKUP;
  const $ = (id) => root.querySelector(`[data-id="${id}"]`);
  const stageEl = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
  const dlg = $('dlg'), modal = $('modal');
  const offs = []; // cleanup
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); offs.push(() => el.removeEventListener(ev, fn, o)); };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  let dead = false;

  /* ---------- state ---------- */
  let st = normalizeState(null);
  try { st = normalizeState(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { /* ignore */ }
  function save(remote = true) {
    st.ts = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ }
    if (remote && opts.save) opts.save(st);
  }
  function rollDay() { const d = vnDay(); if (st.day !== d) { st.day = d; st.today = 0; save(false); } }
  rollDay();
  if (opts.load) {
    Promise.resolve(opts.load()).then((remote) => {
      if (dead || !remote) return;
      const r = normalizeState(remote);
      if (r.ts > st.ts) { st = r; rollDay(); try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* ignore */ } hud(); }
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
    mo() { tone(720, 0.09, 'triangle', 0.35); tone(380, 0.12, 'sine', 0.25); },
    blip() { tone(660, 0.06, 'square', 0.06); },
    buy() { tone(880, 0.08, 'square', 0.07); tone(1320, 0.12, 'square', 0.07, 0.08); },
    bell() { tone(523, 1.6, 'sine', 0.22); tone(1046, 1.2, 'sine', 0.08); tone(1568, 0.8, 'sine', 0.04); },
    bigBell() { tone(196, 3.2, 'sine', 0.32); tone(392, 2.4, 'sine', 0.12); tone(590, 1.6, 'sine', 0.05); tone(98, 3.5, 'sine', 0.15); },
    drum(w = 0) { tone(92, 0.45, 'sine', 0.55, w); tone(60, 0.5, 'triangle', 0.35, w); },
    bow() { tone(784, 0.7, 'sine', 0.07); tone(1175, 0.5, 'sine', 0.03); },
    punch() { tone(160, 0.06, 'square', 0.08); tone(90, 0.08, 'triangle', 0.18); },
    sweep() { tone(1800 + Math.random() * 600, 0.05, 'sawtooth', 0.025); tone(900, 0.07, 'triangle', 0.03, 0.03); },
    wrong() { tone(150, 0.18, 'square', 0.06); },
  };

  /* ---------- map + static layers ---------- */
  const { tile, obj } = buildMap();
  const stat = mk(W * T, H * T), sg = stat.getContext('2d');
  const over = mk(W * T, H * T), og = over.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x * T, py = y * T, c = tile[y][x], o = obj[y][x];
    if (c === G || c === SOLID) {
      if (o === 'burner') drawStone(sg, px, py);
      else if (o === 'gate' || o === 'stall' || o === 'sign' || o === 'banyan' || o === 'broom') drawDirt(sg, px, py, x, y);
      else if (o === 'dummy' || o === 'rack') drawSand(sg, px, py, x, y);
      else drawGrass(sg, px, py, x, y);
    } else if (c === FL) drawFlower(sg, px, py, x, y);
    else if (c === TR) drawTree(sg, px, py, x, y);
    else if (c === DIRT) drawDirt(sg, px, py, x, y);
    else if (c === STONE) drawStone(sg, px, py);
    else if (c === SAND) drawSand(sg, px, py, x, y);
    else if (c === MAT) drawMat(sg, px, py);
    else if (c === WALL) drawWall(sg, px, py, x, y);
    else if (c === WATER) drawWater(sg, tile, px, py, x, y);
    else if (c === LOTUS) drawLotus(sg, tile, px, py, x, y);
  }
  R(sg, '#b89a5e', 22 * T + 13, (H - 1) * T + 4, 6, 2); R(sg, '#b89a5e', 22 * T + 14, (H - 1) * T + 6, 4, 2); R(sg, '#b89a5e', 22 * T + 15, (H - 1) * T + 8, 2, 2);
  drawHall(sg, 16 * T, 3 * T); drawTower(sg, 11 * T, 5 * T, 'bell'); drawTower(sg, 32 * T, 5 * T, 'drum'); drawThap(sg, 37 * T, 3 * T);
  drawPavilion(sg, 6 * T, 10 * T); drawBodhi(sg, 5 * T, 4 * T); drawBurner(sg, 22 * T, 13 * T);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (obj[y][x] === 'lamp') drawLamp(sg, x * T, y * T);
    if (obj[y][x] === 'dummy') drawDummy(sg, x * T, y * T);
  }
  drawRack(sg, 15 * T, 27 * T); drawBanyanTrunk(sg, 33 * T, 20 * T); drawBroomRack(sg, 40 * T, 27 * T);
  drawGateBase(sg, 20 * T, (WB - 1) * T); drawStallBack(sg, 25 * T, 33 * T); drawSign(sg, 19 * T, 33 * T);
  drawGateRoof(og, 20 * T, (WB - 1) * T); drawStallFront(og, 25 * T, 33 * T); drawBanyanCanopy(og, 33 * T, 20 * T);

  const ME = (typeof opts.me === 'function' ? opts.me() : opts.me) || {};
  const darken = (hex, k = 0.2) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const lookPal = (l, base) => {
    const o = l && typeof l === 'object' ? l : {};
    const shirt = HEX.test(o.shirt) ? o.shirt : base.shirt;
    return { ...base, skin: HEX.test(o.skin) ? o.skin : base.skin, hair: HEX.test(o.hair) ? o.hair : base.hair, shirt, shirt2: darken(shirt) };
  };
  const myPal = ME.look ? lookPal(ME.look, PAL.player) : PAL.player;
  const sprites = {};
  const sprite = (kind, dir, f, pose, pal) => { const k = kind + dir + f + (pose || ''); if (!sprites[k]) sprites[k] = human(pal || PAL[kind], dir, f, pose); return sprites[k]; };
  const catSprite = (f) => { const k = 'cat' + f; if (!sprites[k]) sprites[k] = makeCat(f); return sprites[k]; };

  /* ---------- entities ---------- */
  const ent = (kind, tx, ty, dir = 'down') => ({ kind, tx, ty, x: tx * T, y: ty * T, dir, moving: false, prog: 0, f: 0, alt: false, nx: tx, ny: ty, dur: 0.2, timer: 1 + Math.random() * 2 });
  const player = ent('player', 22, H - 2, 'up');
  const monk = ent('monk', 18, 13, 'down');
  const cat = ent('cat', 17, 11, 'down');
  const student = ent('student', 18, 35, 'right');
  const seller = ent('seller', 26, 33, 'down');
  const master = ent('master', 10, 27, 'up');
  const trainees = [[7, 23], [10, 23], [13, 23]].map(([x, y], i) => Object.assign(ent('trainee', x, y, 'down'), { off: i * 2 }));
  const statics = [monk, cat, student, seller, master, ...trainees];
  const visitors = [];
  const remotes = new Map(); // v39: người chơi thật khác (sid -> entity)
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const opposite = (d) => ({ up: 'down', down: 'up', left: 'right', right: 'left' })[d];
  function blocker(x, y, self) {
    for (const e of [player, ...statics, ...visitors]) {
      if (e === self || e.gone) continue;
      if (self.kind === 'visitor' && e.kind === 'visitor') continue; // khách không chặn nhau
      if ((e.tx === x && e.ty === y) || (e.moving && e.nx === x && e.ny === y)) return e;
    }
    return null;
  }
  const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const walkable = (x, y, self, ghost) => inMap(x, y) && !isSolid(tile[y][x]) && (ghost || !blocker(x, y, self));
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
  // BFS tìm đường cho khách (né ô đặc + NPC đứng yên)
  function findPath(sx, sy, gx, gy, avoid) {
    if (sx === gx && sy === gy) return [];
    const block = new Set(statics.filter((e) => e !== monk).map((e) => e.ty * W + e.tx));
    if (avoid) block.add(avoid);
    const prev = new Int32Array(W * H).fill(-1), start = sy * W + sx, goal = gy * W + gx, q = [start];
    prev[start] = start;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi]; if (cur === goal) break;
      const cx = cur % W, cy = (cur - cx) / W;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = cx + dx, ny = cy + dy, k = ny * W + nx;
        if (!inMap(nx, ny) || prev[k] !== -1 || isSolid(tile[ny][nx]) || (block.has(k) && k !== goal)) continue;
        prev[k] = cur; q.push(k);
      }
    }
    if (prev[goal] === -1) return null;
    const path = []; for (let k = goal; k !== start; k = prev[k]) path.push([k % W, Math.floor(k / W)]);
    return path.reverse();
  }

  /* ---------- particles ---------- */
  const fx = []; // chữ bay lên
  const dust = [];
  function floatTxt(txt, x, y, col = '#ffd27a') { fx.push({ txt, x, y, t: 0, col }); }
  function puff(x, y, col = 'rgba(220,200,150,') { for (let i = 0; i < 6; i++) dust.push({ x: x + Math.random() * 12, y: y + 6 + Math.random() * 8, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 14, t: 0, col }); }

  /* ---------- UI: dialog + modal ---------- */
  const held = [];
  let shift = false, turnT = 0, active = true, pushT = 0, modalTick = null;
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const ui = {
    mode: null, typing: false, full: '', shown: 0, resolve: null, choices: null, sel: 0, queue: [], onModalKey: null,
    busy() { return !!this.mode; },
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
    show(text) {
      this.full = text; this.shown = 0; this.typing = true;
      dlg.querySelector('.choices').innerHTML = ''; dlg.querySelector('.more').style.display = 'none';
    },
    tick(dt) {
      if (this.mode !== 'dialog' || !this.typing) return;
      this.shown = Math.min(this.full.length, this.shown + dt * 55);
      dlg.querySelector('.txt').textContent = this.full.slice(0, Math.floor(this.shown));
      if (this.shown >= this.full.length) {
        this.typing = false;
        if (!this.queue.length && this.choices) this.paintChoices();
        else dlg.querySelector('.more').style.display = 'block';
      }
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
  function openModal(html, onKey, kind = null) {
    ui.mode = 'modal'; ui.onModalKey = onKey || null; modalTick = null; modalKind = kind;
    modal.innerHTML = `<div class="tp-panel">${html}<button type="button" class="x" aria-label="Đóng">✕</button></div>`;
    modal.style.display = 'flex'; modal.querySelector('.x').onclick = closeModal; held.length = 0;
  }
  function closeModal() { modalKind = null; ui.mode = null; ui.onModalKey = null; modalTick = null; modal.style.display = 'none'; modal.innerHTML = ''; }
  on(modal, 'pointerdown', (e) => { if (e.target === modal) closeModal(); });
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = later(() => t.classList.remove('on'), 2600); }

  /* ---------- HUD ---------- */
  function hud() {
    rollDay();
    $('hCd').textContent = st.cd; $('hDay').textContent = st.today; $('hBar').style.width = `${(st.today / CAP_PER_DAY) * 100}%`;
    $('hInv').innerHTML = ITEMS.map((it) => `<span title="${it.name}">${icon(it.id)}<b>${st.inv[it.id]}</b></span>`).join('');
    $('hVo').textContent = VO_RANKS[voRank(st.vo)][1];
    $('bSound').textContent = `Âm: ${st.sound ? 'Bật' : 'Tắt'}`;
  }
  on($('bSound'), 'click', () => { st.sound = !st.sound; save(false); hud(); });
  on($('bHelp'), 'click', () => openHelp());

  /* ---------- lá đa ---------- */
  const leaves = new Map(); // ô -> số lá (1..3)
  const falling = [];
  const leafTiles = [];
  for (let y = LEAF_ZONE.y0; y <= LEAF_ZONE.y1; y++) for (let x = LEAF_ZONE.x0; x <= LEAF_ZONE.x1; x++) if (!isSolid(tile[y][x])) leafTiles.push([x, y]);
  const addLeaf = (x, y) => { const k = y * W + x; leaves.set(k, Math.min(3, (leaves.get(k) || 0) + 1)); };
  for (let i = 0; i < 14; i++) { const [x, y] = pickOne(leafTiles); addLeaf(x, y); }
  let leafHint = false;
  function sweepAt(x, y) {
    const k = y * W + x; if (!leaves.has(k)) return false;
    leaves.delete(k); st.swept++;
    const n = gain(1); sfx.sweep(); puff(x * T, y * T, 'rgba(200,170,90,');
    floatTxt(n ? '+1' : '✓', x * T + 8, y * T);
    if (st.swept % 25 === 0) toast(`Sân sạch bong! Bạn đã quét ${st.swept} đống lá đa.`);
    return true;
  }

  /* ---------- khách thập phương ---------- */
  const POIS = [
    { x: 32, y: 11, face: 'right' }, { x: 8, y: 5, face: 'left' }, { x: 12, y: 8, face: 'up' }, { x: 33, y: 8, face: 'up' },
    { x: 38, y: 7, face: 'up' }, { x: 10, y: 17, face: 'down' }, { x: 7, y: 17, face: 'down' }, { x: 34, y: 24, face: 'up' }, { x: 30, y: 21, face: 'right' },
  ];
  let vid = 0;
  function makeVisitor(tx, ty, first) {
    const v = ent('visitor', tx, ty, 'up');
    v.id = vid++; v.pal = VISITOR_PALS[Math.floor(Math.random() * VISITOR_PALS.length)];
    v.palKey = 'v' + VISITOR_PALS.indexOf(v.pal);
    v.who = pickOne(VISITOR_WHO);
    v.goals = [first || 'mat'];
    if (Math.random() < 0.65) v.goals.push('burner');
    if (Math.random() < 0.7) v.goals.push('poi');
    if (Math.random() < 0.3) v.goals.push('poi');
    v.goals.push('exit');
    v.path = null; v.goal = null; v.wait = 0; v.blockT = 0; v.bow = null; v.mat = null;
    visitors.push(v); nextGoal(v); return v;
  }
  function nextGoal(v) {
    v.mat = null; v.arrived = false; v.incense = false;
    const g = v.goals.shift();
    if (!g) { v.gone = true; return; }
    let tgt = null;
    if (g === 'mat') {
      const free = MATS.filter((m) => !visitors.some((o) => o !== v && o.mat === m.x) && !(player.tx === m.x && player.ty === m.y));
      if (!free.length) { nextGoal(v); return; }
      const m = pickOne(free); v.mat = m.x; tgt = { x: m.x, y: m.y, face: 'up' };
    } else if (g === 'burner') tgt = { ...pickOne([{ x: 22, y: 14 }, { x: 23, y: 14 }]), face: 'up' };
    else if (g === 'poi') tgt = pickOne(POIS);
    else { const [x, y] = pickOne(EXITS); tgt = { x, y, face: 'down' }; }
    v.goal = { kind: g, ...tgt };
    v.path = findPath(v.tx, v.ty, tgt.x, tgt.y);
    if (!v.path) nextGoal(v);
  }
  function arrive(v) {
    const g = v.goal; v.arrived = true; v.dir = g.face;
    if (g.kind === 'mat') v.bow = { t: 0, n: 3 };
    else if (g.kind === 'burner') { v.wait = 2.4; v.incense = true; }
    else if (g.kind === 'poi') v.wait = 2 + Math.random() * 3;
    else v.gone = true;
  }
  function updVisitor(v, dt) {
    stepEnt(v, dt);
    if (v.moving || v.gone) return;
    if (v.talkT > 0) { v.talkT -= dt; return; }
    if (v.bow) { v.bow.t += dt; if (v.bow.t >= v.bow.n * BOW) { v.bow = null; nextGoal(v); } return; }
    if (v.wait > 0) { v.wait -= dt; if (v.wait <= 0) nextGoal(v); return; }
    if (v.arrived) { nextGoal(v); return; }
    if (!v.path) return;
    if (!v.path.length) { arrive(v); return; }
    const [nx, ny] = v.path[0], d = nx > v.tx ? 'right' : nx < v.tx ? 'left' : ny > v.ty ? 'down' : 'up';
    const b = blocker(nx, ny, v);
    if (b === player && v.path.length === 1) { v.goals.unshift(v.goal.kind === 'exit' ? 'exit' : 'poi'); if (v.goal.kind === 'mat') v.goals[0] = 'mat'; nextGoal(v); return; } // người chơi đứng đúng chỗ khách định tới
    if (startMove(v, d, 0.3, v.blockT > 3 && b !== player)) { v.path.shift(); v.blockT = 0; v.repathed = false; return; }
    v.dir = d; v.blockT += dt;
    if (v.blockT > 5) { v.blockT = 0; v.repathed = false; nextGoal(v); return; }
    if (v.blockT > 1.2 && !v.repathed) {
      v.repathed = true;
      const p = findPath(v.tx, v.ty, v.goal.x, v.goal.y, ny * W + nx);
      if (p) { v.path = p; v.blockT = 0; }
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = 20 + Math.floor(Math.random() * 6), y = 15 + Math.floor(Math.random() * 13);
    if (!isSolid(tile[y][x]) && !blocker(x, y, { kind: 'visitor' })) makeVisitor(x, y, Math.random() < 0.5 ? 'mat' : 'poi');
  }
  const isNight = () => { const h = vnNow().getUTCHours(); return h >= 18 || h < 6; };
  let spawnT = 2;
  function updVisitors(dt) {
    for (const v of visitors) updVisitor(v, dt);
    for (let i = visitors.length - 1; i >= 0; i--) if (visitors[i].gone) visitors.splice(i, 1);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = 3 + Math.random() * 5;
      const max = isNight() ? 3 : 9, [x, y] = pickOne(EXITS);
      if (visitors.length < max && !(player.tx === x && player.ty === y)) makeVisitor(x, y);
    }
  }

  /* ---------- interactions ---------- */
  const facing = () => { const [dx, dy] = DIRS[player.dir]; return [player.tx + dx, player.ty + dy]; };
  const remoteAt = (x, y) => [...remotes.values()].find((e) => e.tx === x && e.ty === y && !e.moving);
  function targetAt(x, y) {
    if (remoteAt(x, y)) return 'remote';
    const v = visitors.find((e) => e.tx === x && e.ty === y && !e.moving); if (v) return 'visitor';
    const n = statics.find((e) => e.tx === x && e.ty === y); if (n) return n.kind === 'seller' ? 'stall' : n.kind;
    if (!inMap(x, y)) return null;
    if (obj[y][x]) return obj[y][x];
    if (tile[y][x] === WATER || tile[y][x] === LOTUS) return 'pond';
    if (leaves.has(y * W + x)) return 'leaf';
    return null;
  }
  function gain(n, ignoreCap) {
    rollDay();
    if (!ignoreCap) n = Math.max(0, Math.min(n, CAP_PER_DAY - st.today));
    st.cd += n; if (!ignoreCap) st.today += n; save(); hud(); return n;
  }
  const onMat = () => tile[player.ty][player.tx] === MAT;
  function startBow() {
    if (player.bow) return;
    player.dir = 'up'; player.bow = { t: 0, n: 3, done: 0, got: 0, mates: new Set() }; held.length = 0; sfx.bow();
    net.send('bow', { tx: player.tx, ty: player.ty });
  }
  const ACT = {
    hall: () => (onMat() && player.dir === 'up' ? startBow() : openHall()),
    mo: () => openMo(), stall: () => openShop(),
    sign: () => say(['KNOWORLD TEMPLE — chùa đã mở rộng!',
      '① Chánh điện (giữa, trên cùng): đứng lên chiếu đỏ, bấm Space để lạy Phật. Hoặc thắp nhang xin xăm, hỏi Thầy Phán.',
      '② Nhà mõ (bên trái): gõ mõ tích công đức.\n③ Sân luyện võ (góc trái dưới): hỏi Võ sư để luyện quyền.',
      '④ Sân cây đa (góc phải dưới): lấy chổi ở giá chổi, quét lá đa.\n⑤ Quầy nhang (ngay đây): đổi công đức lấy nhang, hoa, trái cây.'], { who: 'Biển chỉ dẫn' }),
    burner: () => say('Lư hương nghi ngút khói. Muốn thắp nhang thì mua ở quầy ngoài cổng rồi vào Chánh điện nhé.'),
    bodhi: () => say('Bạn ngồi dưới gốc bồ đề một lúc… và chợt ngộ ra: deadline là có thật.'),
    pond: () => say('Hồ sen trong veo. Dưới đáy có vài đồng xu và một tờ đề cương ai đánh rơi.'),
    gate: () => say('Cổng tam quan. Rêu phong, cổ kính.'),
    lamp: () => say('Đèn đá. Tối đến là sáng lên, soi đường cho khách thập phương.'),
    thap: () => say('Bảo tháp năm tầng. Nghe nói ai đi vòng quanh tháp ba vòng sẽ… mỏi chân.'),
    rack: () => say('Giá binh khí: côn, thương, đao gỗ… toàn đồ tập, không có cạnh sắc.', { who: 'Sân luyện võ' }),
    dummy: () => { sfx.punch(); puff(facing()[0] * T, facing()[1] * T - 8, 'rgba(170,120,70,'); return say('Bộp! Mộc nhân gỗ lim, cứng lắm. Muốn luyện cho đúng bài thì hỏi Võ sư nhé.', { who: 'Mộc nhân' }); },
    bell: async () => {
      const c = await say('Lầu chuông. Đại hồng chung treo giữa lầu.', { who: 'Lầu chuông', choices: ['Thỉnh chuông', 'Thôi'] });
      if (c !== 0) return;
      sfx.bigBell();
      if (st.bell !== vnDay()) { st.bell = vnDay(); const n = gain(5); toast(n ? `Boong… +${n} công đức (mỗi ngày 1 lần).` : 'Boong… Hôm nay đủ công đức rồi.'); floatTxt(n ? `+${n}` : 'Boong', player.x + 8, player.y - 6); }
      else toast('Boong… Hôm nay bạn thỉnh chuông rồi, tiếng chuông vẫn hay.');
    },
    drum: async () => {
      const c = await say('Lầu trống. Trống da trâu, đánh lên vang cả đảo.', { who: 'Lầu trống', choices: ['Đánh trống', 'Thôi'] });
      if (c !== 0) return;
      sfx.drum(0); sfx.drum(0.45); sfx.drum(0.9); floatTxt('Tùng! Tùng! Tùng!', player.x + 8, player.y - 6, '#ffb38a');
    },
    banyan: () => say(player.broom ? 'Cây đa cổ thụ, rễ buông dài. Lá rụng quanh năm — đi qua đống lá là quét được.' : 'Cây đa cổ thụ, rễ buông dài. Lá rụng quanh năm, quét hoài không hết.\nGiá chổi ở góc phải sân đó.', { who: 'Cây đa' }),
    broom: async () => {
      if (!player.broom) { player.broom = true; sfx.blip(); return say('Bạn lấy một cây chổi tre.\nĐi qua đống lá đa là quét được — mỗi đống +1 công đức.', { who: 'Giá chổi' }); }
      const c = await say('Trả chổi lại giá?', { who: 'Giá chổi', choices: ['Trả chổi', 'Giữ lại'] });
      if (c === 0) { player.broom = false; toast('Đã trả chổi. Cảm ơn bạn đã quét sân!'); }
      return undefined;
    },
    leaf: () => {
      if (player.broom) { const [x, y] = facing(); sweepAt(x, y); return undefined; }
      return say('Lá đa rụng đầy sân. Lấy chổi ở giá chổi (góc phải sân) để quét nhé.');
    },
    monk: () => { monk.dir = opposite(player.dir); monk.timer = 3; return say(pickOne(NPC_LINES.monk), { who: 'Chú tiểu' }); },
    student: () => { student.dir = opposite(player.dir); return say(pickOne(NPC_LINES.student), { who: 'Sinh viên năm 2' }); },
    trainee: () => say(pickOne(NPC_LINES.trainee), { who: 'Chú tiểu tập võ' }),
    master: async () => {
      master.dir = opposite(player.dir);
      const c = await say(`Muốn luyện võ hả? Ta hô thế nào, con đánh thế đó.\nCấp của con: ${VO_RANKS[voRank(st.vo)][1]} · đã luyện ${st.vo} bài.`, { who: 'Võ sư', choices: ['Luyện võ', 'Để lúc khác'] });
      master.dir = 'up';
      if (c === 0) openVo();
    },
    visitor: () => {
      const [x, y] = facing(); const v = visitors.find((e) => e.tx === x && e.ty === y);
      if (!v) return undefined;
      if (!v.bow) { v.dir = opposite(player.dir); v.talkT = 1.5; }
      return say(v.bow ? 'Người này đang lạy Phật, đừng làm phiền nhé.' : pickOne(NPC_LINES.visitor), { who: v.bow ? '' : v.who });
    },
    remote: async () => {
      const [x, y] = facing(); const r = remoteAt(x, y); if (!r) return;
      const c = await say(`${r.name}${r.badge ? ' (Giảng viên)' : ''} — người chơi thật, cũng đang ở chùa.`, { who: r.name, choices: ['Chào bạn ấy 👋', 'Rủ lạy Phật cùng 🙏', 'Rủ ra sân võ 🥋', 'Thôi'] });
      if (c === 0) speak(2, r.sid); if (c === 1) speak(3, r.sid); if (c === 2) speak(4, r.sid);
    },
    cat: () => {
      if (st.cat !== vnDay()) { st.cat = vnDay(); gain(1, true); return say('Mèo chùa lim dim, cho bạn vuốt một cái.\n+1 công đức vì đã vuốt mèo.', { who: 'Mèo chùa' }); }
      return say('Mèo chùa đang ngủ. Đừng phá nó nữa.', { who: 'Mèo chùa' });
    },
  };
  function interact() {
    if (ui.busy() || player.moving || player.bow) return;
    const [x, y] = facing(); const t = targetAt(x, y);
    if (t && ACT[t]) { if (t !== 'leaf') sfx.blip(); ACT[t](); return; }
    if (onMat()) startBow();
  }
  async function onArrive() {
    if (player.broom) sweepAt(player.tx, player.ty);
    else if (!leafHint && leaves.has(player.ty * W + player.tx)) { leafHint = true; toast('Lá đa đầy sân! Lấy chổi ở giá chổi (góc phải) để quét, +1 công đức mỗi đống.'); }
    if (player.ty === H - 1) {
      // v40/v51: đường qua cầu sang My Home (trước là Museum)
      const c = await say('Rời chùa đi đâu đây?', { choices: ['Đi phà về Game Island', 'Qua cầu sang My Home (nhà của Thịnh)', 'Ở lại thêm chút'] });
      if (c === 0 && opts.onExit) { opts.onExit(); return; }
      if (c === 1 && opts.onMuseum) { opts.onMuseum(); return; }
      startMove(player, 'up', 0.2, true);
    }
  }

  /* --- Nhà mõ --- */
  function openMo() {
    rollDay();
    let last = 0, streak = 0;
    openModal(`
      <h2>Nhà mõ</h2>
      <p class="sub">Gõ đều tay để tích công đức. Gõ quá nhanh thì "tâm không tịnh", không được tính.</p>
      <div class="tp-mo" data-id="moHit">
        <svg viewBox="0 0 220 160">
          <ellipse cx="104" cy="140" rx="78" ry="13" fill="#8e2a22"/><ellipse cx="104" cy="135" rx="74" ry="12" fill="#c23a2a"/><ellipse cx="104" cy="132" rx="66" ry="8" fill="#d9584a"/>
          <g class="fish">
            <path d="M40 92 C40 52 78 32 108 34 C150 36 172 62 170 92 C168 118 132 128 104 127 C66 126 40 114 40 92Z" fill="#a8642e"/>
            <path d="M44 104 C60 124 140 130 166 102 C162 118 132 128 104 127 C70 126 50 118 44 104Z" fill="#7d4520"/>
            <ellipse cx="90" cy="54" rx="26" ry="9" fill="#e0a066" opacity=".35"/>
            <path d="M70 96 C96 104 132 104 162 90" stroke="#3b1d0e" stroke-width="7" fill="none" stroke-linecap="round"/>
            <circle cx="74" cy="70" r="10" stroke="#6b3b1a" stroke-width="3" fill="none"/><circle cx="74" cy="70" r="3" fill="#6b3b1a"/>
            <path d="M104 50 q9 9 0 18 M120 48 q9 9 0 18 M136 52 q9 9 0 18" stroke="#7d4520" stroke-width="3" fill="none"/>
          </g>
          <g class="dui"><rect x="118" y="14" width="74" height="8" rx="4" fill="#e8c98a"/><circle cx="118" cy="18" r="11" fill="#c98b4e"/><circle cx="115" cy="15" r="3" fill="#e0a066"/></g>
        </svg>
      </div>
      <div class="tp-mostats"><span class="tp-chip">Công đức <b data-id="mCd">${st.cd}</b></span><span class="tp-chip">Hôm nay <b data-id="mDay">${st.today}</b>/${CAP_PER_DAY}</span><span class="tp-chip">Nhịp đều <b data-id="mStreak">0</b></span></div>
      <div class="tp-momsg" data-id="moMsg">Bấm Space hoặc chạm vào mõ</div>`, (e) => { if (e.key === ' ' || e.key === 'Enter') { if (!e.repeat) hit(); return true; } return false; }, 'mo');
    const stage = $('moHit');
    const msg = (t) => { $('moMsg').textContent = t; };
    function hit() {
      ac(); sfx.mo(); stage.classList.add('hit'); later(() => stage.classList.remove('hit'), 80);
      const now = performance.now();
      if (now - last < 120) { last = now; streak = 0; $('mStreak').textContent = 0; msg('Tâm không tịnh… gõ chậm lại.'); return; }
      last = now; rollDay();
      if (st.today >= CAP_PER_DAY) { msg(`Hôm nay đủ ${CAP_PER_DAY} công đức rồi. Mai quay lại nhé.`); return; }
      streak++; let n = 1;
      if (streak % 30 === 0) { n += 5; msg('Thiện tai! 30 nhịp đều tay, thưởng +5.'); } else if (streak % 10 === 0) msg(pickOne(['Tâm an.', 'Đều tay lắm.', 'Gõ tiếp nào.']));
      n = gain(n);
      $('mCd').textContent = st.cd; $('mDay').textContent = st.today; $('mStreak').textContent = streak;
      const f = document.createElement('div'); f.className = 'tp-float'; f.textContent = `+${n} công đức`;
      f.style.left = `${40 + Math.random() * 30}%`; f.style.top = '30%'; stage.appendChild(f); later(() => f.remove(), 900);
    }
    stage.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(); });
  }

  /* --- Sân luyện võ --- */
  function openVo() {
    let seq = [], pos = 0, tLeft = 0, tMax = 1, state = 'wait', waitT = 0.9, pose = null, poseT = 0, combo = 0;
    const handle = (k) => {
      if (state !== 'go') return;
      pose = MOVES[k][2]; poseT = 0.28; paint(); sfx.punch();
      if (k === seq[pos]) {
        pos++; renderSeq();
        if (pos >= seq.length) {
          state = 'wait'; waitT = 1.1; combo++;
          const before = voRank(st.vo); st.vo++;
          const n = gain(2 + before), after = voRank(st.vo);
          if (after > before) { sfx.bell(); msg(`Thăng cấp: ${VO_RANKS[after][1]}! +${n} công đức`); toast(`Võ công tăng tiến: ${VO_RANKS[after][1]}!`); }
          else msg(n ? `${pickOne(['Đẹp!', 'Chuẩn bài!', 'Nhanh như gió!', 'Thiện tai!'])} +${n} công đức` : 'Chuẩn bài! (hôm nay đủ công đức rồi)');
          stats();
        }
      } else { sfx.wrong(); pos = 0; renderSeq(); msg('Sai thế! Đánh lại bài này từ đầu.'); }
    };
    openModal(`<h2>Sân luyện võ</h2>
      <p class="sub">Võ sư hô thế nào, đánh thế đó: bấm đúng thứ tự các mũi tên trước khi hết giờ. Lên cấp thì bài dài hơn, công đức nhiều hơn.</p>
      <div class="tp-vo">
        <canvas data-id="voCv" width="16" height="20"></canvas>
        <div class="tp-vo-r">
          <div class="seq" data-id="voSeq"></div>
          <div class="tbar"><i data-id="voT"></i></div>
          <div class="tp-momsg" data-id="voMsg">Chuẩn bị…</div>
        </div>
      </div>
      <div class="tp-vo-keys">${Object.entries(MOVES).map(([k, m]) => `<button type="button" data-k="${k}"><b>${m[0]}</b><small>${m[1]}</small></button>`).join('')}</div>
      <div class="tp-mostats"><span class="tp-chip">Cấp <b data-id="vRank"></b></span><span class="tp-chip">Đã luyện <b data-id="vXp"></b> bài</span><span class="tp-chip">Công đức <b data-id="vCd"></b></span></div>`,
    (e) => { const k = MOVE_KEY[e.key]; if (k) { if (!e.repeat) handle(k); return true; } return e.key === ' '; }, 'vo');
    const g2 = $('voCv').getContext('2d');
    const paint = () => { g2.clearRect(0, 0, 16, 20); g2.drawImage(sprite('player', 'down', 0, pose, myPal), 0, 0); };
    const msg = (t) => { const m = $('voMsg'); if (m) m.textContent = t; };
    const renderSeq = () => { $('voSeq').innerHTML = seq.map((k, i) => `<span class="${i < pos ? 'ok' : i === pos ? 'cur' : ''}">${MOVES[k][0]}</span>`).join(''); };
    const stats = () => { $('vRank').textContent = VO_RANKS[voRank(st.vo)][1]; $('vXp').textContent = st.vo; $('vCd').textContent = st.cd; };
    const newSeq = () => {
      const ri = voRank(st.vo), len = 4 + Math.min(4, ri), keys = Object.keys(MOVES);
      seq = Array.from({ length: len }, () => pickOne(keys)); pos = 0;
      tMax = 0.9 * len + 2 - ri * 0.12; tLeft = tMax; state = 'go'; renderSeq();
      msg(combo ? 'Bài tiếp theo — đánh!' : 'Đánh!');
    };
    modal.querySelectorAll('[data-k]').forEach((b) => { b.onpointerdown = (e) => { e.preventDefault(); ac(); handle(b.dataset.k); }; });
    paint(); stats();
    modalTick = (dt) => {
      if (!$('voT')) return;
      if (poseT > 0) { poseT -= dt; if (poseT <= 0) { pose = null; paint(); } }
      if (state === 'wait') { waitT -= dt; if (waitT <= 0) newSeq(); }
      else if (state === 'go') {
        tLeft -= dt; $('voT').style.width = `${Math.max(0, tLeft / tMax) * 100}%`;
        if (tLeft <= 0) { state = 'wait'; waitT = 1.1; sfx.wrong(); msg('Chậm quá! Võ sư hô bài mới nè.'); }
      }
    };
  }

  /* --- Quầy nhang --- */
  function openShop() {
    seller.dir = 'down';
    const render = () => {
      openModal(`
        <h2>Quầy nhang cổng chùa</h2>
        <p class="sub">Đổi công đức lấy đồ cúng. Bạn đang có <b class="gold">${st.cd}</b> công đức.</p>
        <div class="tp-seller"><canvas data-id="sf" width="16" height="20"></canvas><div><b>Bà Tư:</b> Nhang đây con ơi! Ở đây bán bằng công đức, không lấy tiền.</div></div>
        <div class="tp-shop">${ITEMS.map((it) => `
          <div class="item"><div class="hd"><div class="ic">${icon(it.id)}</div><div><div class="nm">${it.name}</div><div class="pr">${it.price} công đức</div></div></div>
          <p>${it.desc}</p>
          <div class="ft"><span>Đang có: <b>${st.inv[it.id]}</b></span><button type="button" class="tp-btn gold" data-buy="${it.id}" ${st.cd < it.price ? 'disabled' : ''}>Mua</button></div></div>`).join('')}
        </div>`, null, 'shop');
      $('sf').getContext('2d').drawImage(sprite('seller', 'down', 0), 0, 0);
      modal.querySelectorAll('[data-buy]').forEach((b) => {
        b.onclick = () => {
          const it = ITEMS.find((i) => i.id === b.dataset.buy); if (st.cd < it.price) return;
          st.cd -= it.price; st.inv[it.id]++; save(); hud(); sfx.buy(); toast(`Đã mua 1 ${it.name.toLowerCase()}.`); render();
        };
      });
    };
    render();
  }

  /* --- Chánh điện --- */
  async function chooseIncense() {
    const has = ['nhang', 'tram'].filter((k) => st.inv[k] > 0);
    if (!has.length) { await say('Con chưa có nhang. Ra Quầy nhang ngoài cổng chùa mua nhé (cần công đức — gõ mõ, lạy Phật, luyện võ hoặc quét lá).', { who: 'Chánh điện' }); return null; }
    if (has.length === 1) return has[0];
    const c = await say('Con thắp loại nhang nào?', { choices: [`Nhang thường (còn ${st.inv.nhang})`, `Nhang trầm (còn ${st.inv.tram})`, 'Thôi'] });
    return c === 0 ? 'nhang' : c === 1 ? 'tram' : null;
  }
  async function openHall() {
    const c = await say('Chánh điện. Khói trầm thơm, chuông gió leng keng.\nCon muốn làm gì?', { who: 'Chánh điện', choices: ['Lạy Phật (3 lạy)', 'Xin xăm', 'Hỏi Thầy Phán', 'Để lúc khác'] });
    if (c === 0) startBow();
    if (c === 1) { const k = await chooseIncense(); if (k) doXam(k); }
    if (c === 2) openAsk();
  }
  function pickRank(k) {
    const w = k === 'tram' ? { tt: 20, th: 35, tr: 35, ha: 10 } : { tt: 10, th: 30, tr: 40, ha: 20 };
    let r = Math.random() * 100; for (const key of ['tt', 'th', 'tr', 'ha']) { r -= w[key]; if (r < 0) return key; } return 'tr';
  }
  function doXam(k) {
    st.inv[k]--; save(); hud();
    openModal(`<h2>Xin xăm</h2><p class="sub">Thành tâm khấn điều con muốn hỏi… rồi lắc ống xăm.</p>
      <div class="tp-tube"><svg class="tube shake" data-id="tube" viewBox="0 0 80 130">
        <g><rect x="24" y="6" width="5" height="50" fill="#e9c98a"/><rect x="31" y="2" width="5" height="54" fill="#e9c98a"/><rect x="45" y="4" width="5" height="52" fill="#e9c98a"/><rect x="52" y="10" width="5" height="46" fill="#e9c98a"/>
        <rect x="24" y="6" width="5" height="4" fill="#c23a2a"/><rect x="31" y="2" width="5" height="4" fill="#c23a2a"/><rect x="45" y="4" width="5" height="4" fill="#c23a2a"/><rect x="52" y="10" width="5" height="4" fill="#c23a2a"/></g>
        <g data-id="out"><rect x="37" y="0" width="6" height="56" fill="#ffe2a0"/><rect x="37" y="0" width="6" height="5" fill="#e23b2b"/></g>
        <rect x="18" y="44" width="46" height="80" rx="6" fill="#b3342a"/>
        <rect x="18" y="52" width="46" height="5" fill="#f2c14e"/><rect x="18" y="108" width="46" height="5" fill="#f2c14e"/>
        <circle cx="41" cy="82" r="11" fill="#f2c14e"/><circle cx="41" cy="82" r="8" fill="#8e2a22"/><rect x="36" y="81" width="10" height="2" fill="#f2c14e"/><rect x="40" y="77" width="2" height="10" fill="#f2c14e"/>
      </svg></div><div data-id="xamOut"></div>`, null, 'xam');
    const shakeSnd = setInterval(() => tone(300 + Math.random() * 200, 0.04, 'square', 0.03), 120);
    later(() => {
      clearInterval(shakeSnd);
      const tube = $('tube'); if (!tube) return; tube.classList.remove('shake'); $('out').classList.add('stick-out');
      later(() => {
        if (!$('xamOut')) return;
        sfx.bell();
        const rank = pickRank(k), pool = XAM.map((q, i) => ({ ...q, i })).filter((q) => q.r === rank && q.i !== st.last.xam);
        const q = pickOne(pool); st.last.xam = q.i; save();
        const d = vnNow(), ds = `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
        root.querySelector('.tp-tube').style.display = 'none';
        $('xamOut').innerHTML = `<div class="tp-xam"><div class="no">QUẺ SỐ ${String(q.i + 1).padStart(2, '0')}</div><span class="rk ${rank}">${RANK_NAME[rank]}</span>
          <h3>${q.t}</h3><p>${q.p}</p><div class="ft"><span>Knoworld Temple</span><span>${ds}</span></div></div>
          ${rank === 'ha' ? '<p class="sub" style="margin:10px 0 0">Quẻ Hạ không phải xui — chỉ là lời nhắc.</p>' : ''}
          <div class="tp-row"><button type="button" class="tp-btn" data-id="xAgain">Xin quẻ khác</button><button type="button" class="tp-btn gold" data-id="xClose">Đóng</button></div>`;
        $('xClose').onclick = closeModal;
        $('xAgain').onclick = async () => { closeModal(); const k2 = await chooseIncense(); if (k2) doXam(k2); };
      }, 550);
    }, 1500);
    offs.push(() => clearInterval(shakeSnd));
  }
  function openAsk() {
    const need = (q) => (q.need ? ITEMS.find((i) => i.id === q.need) : null);
    openModal(`<h2>Hỏi Thầy Phán</h2><p class="sub">Mỗi câu hỏi tốn 1 cây nhang. Chuyện tình duyên cần dâng thêm hoa sen, chuyện việc làm và tiền bạc cần dâng mâm trái cây.</p>
      <div class="tp-qs">${QUESTIONS.map((q, i) => {
        const n = need(q), ok = !n || st.inv[n.id] > 0;
        return `<button type="button" class="q ${ok ? '' : 'locked'}" data-q="${i}">${q.q}<span class="tag">${n ? icon(n.id) + (ok ? `dâng ${n.name.toLowerCase()}` : `cần ${n.name.toLowerCase()}`) : 'chỉ cần nhang'}</span></button>`;
      }).join('')}</div>`, null, 'ask');
    modal.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => ask(QUESTIONS[+b.dataset.q]); });
  }
  async function ask(q) {
    const n = q.need ? ITEMS.find((i) => i.id === q.need) : null;
    if (n && st.inv[n.id] < 1) { toast(`Câu này cần dâng ${n.name.toLowerCase()} — mua ở Quầy nhang.`); return; }
    closeModal();
    const k = await chooseIncense(); if (!k) return;
    st.inv[k]--; if (n) st.inv[n.id]--; save(); hud();
    openModal(`<h2>Hỏi Thầy Phán</h2><p class="sub">${q.q}</p><div class="tp-think" data-id="think">Thầy Phán đang suy ngẫm</div>`, null, 'ask');
    let dots = 0; const iv = setInterval(() => { const t = $('think'); if (t) t.textContent = `Thầy Phán đang suy ngẫm${'.'.repeat(++dots % 4)}`; }, 280);
    offs.push(() => clearInterval(iv));
    later(() => {
      clearInterval(iv); if (!$('think')) return;
      const w = k === 'tram' ? { c: 45, f: 40, l: 15 } : { c: 65, f: 30, l: 5 };
      let r = Math.random() * 100, rar = 'c'; for (const key of ['c', 'f', 'l']) { r -= w[key]; if (r < 0) { rar = key; break; } }
      let pool = q.a.map((a, i) => ({ a, i })).filter((x) => x.a[0] === rar && x.i !== st.last[q.id]);
      if (!pool.length) pool = q.a.map((a, i) => ({ a, i })).filter((x) => x.i !== st.last[q.id]);
      const pick = pickOne(pool); st.last[q.id] = pick.i; save();
      const rr = pick.a[0];
      if (rr === 'l') sfx.bell(); else sfx.buy();
      $('think').outerHTML = `<div class="tp-oracle"><canvas data-id="pt" width="24" height="24"></canvas><div><div class="q2">Thầy Phán phán:</div><div class="a">${pick.a[1]}</div>
        <span class="rar ${rr}">${rr === 'l' ? '✦ Lời phán Huyền Thoại' : rr === 'f' ? 'Lời phán Hài' : 'Lời phán Thường'}</span></div></div>
        <div class="tp-row"><button type="button" class="tp-btn" data-id="aAgain">Hỏi câu khác</button><button type="button" class="tp-btn gold" data-id="aClose">Đóng</button></div>`;
      $('pt').getContext('2d').drawImage(portrait(), 0, 0);
      $('aClose').onclick = closeModal; $('aAgain').onclick = openAsk;
    }, 1300);
  }
  function openHelp() {
    openModal(`<h2>Cách chơi</h2><p class="sub">Công đức, đồ cúng và cấp võ của bạn được lưu lại cho lần sau. Mỗi ngày tích tối đa ${CAP_PER_DAY} công đức (gộp mọi cách).</p>
      <ol class="tp-help">
        <li><b>Lạy Phật</b>: đứng lên chiếu đỏ trước Chánh điện, quay mặt vào điện, bấm Space — 3 lạy, mỗi lạy +2 công đức.</li>
        <li><b>Nhà mõ</b> (bên trái): gõ mõ đều tay, mỗi nhịp +1.</li>
        <li><b>Sân luyện võ</b> (góc trái dưới): hỏi Võ sư, đánh đúng chuỗi mũi tên. Lên cấp thì bài dài hơn, thưởng nhiều hơn.</li>
        <li><b>Sân cây đa</b> (góc phải dưới): lấy chổi ở giá chổi, đi qua đống lá để quét, mỗi đống +1.</li>
        <li><b>Lầu chuông</b>: thỉnh chuông mỗi ngày 1 lần +5. Lầu trống, bảo tháp, hồ sen, cây bồ đề để ngắm.</li>
        <li><b>Quầy nhang</b> (ngoài cổng): đổi công đức lấy nhang, nhang trầm, hoa sen, trái cây → vào Chánh điện <b>xin xăm</b> hoặc <b>hỏi Thầy Phán</b>.</li>
        <li>Khách thập phương ra vào lạy Phật — bắt chuyện với họ, chú tiểu, sinh viên, mèo chùa.</li>
        <li><b>Người chơi thật</b> có <b>thẻ tên viền xanh</b> và chấm xanh trên đầu (nhãn vàng <b>GV</b> = giảng viên). Đứng cạnh và bấm Space để chào, bấm <b>💬 Nói</b> (phím T) để nói câu có sẵn. Lạy Phật cùng lúc với người khác được thưởng thêm +3.</li></ol>
      <p class="sub" style="margin:0">Máy tính: phím mũi tên / WASD để đi, Shift để chạy, Space để tương tác, Esc để đóng.<br>Điện thoại: phím ảo, nút A để tương tác, B để đóng.</p>
      <div class="tp-row"><button type="button" class="tp-btn gold" data-id="hOk">Chơi tiếp</button></div>`);
    $('hOk').onclick = closeModal;
  }

  /* ---------- input ---------- */
  function press(d) { if (!held.includes(d)) { held.push(d); if (!player.moving && player.dir !== d && !ui.busy() && !player.bow) { player.dir = d; turnT = 0.08; } } }
  function release(d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); }
  function setActive(v) { active = v; $('sleep').hidden = v; if (!v) { held.length = 0; } }
  on(window, 'keydown', (e) => {
    if (!active) return;
    const tg = e.target;
    if (tg && tg !== stageEl && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Có hộp thoại khác của web đang mở (vd. đăng ký cư dân) -> không chiếm phím.
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

  /* ---------- v39: nhiều người chơi ---------- */
  let online = false, net = { send() {}, leave() {}, sid: null }, sendT = 0, beatT = 0, lastSig = '', chatT = 0;
  const cleanName = (n) => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'Khách';
  const okTile = (x, y) => Number.isInteger(x) && Number.isInteger(y) && inMap(x, y) && !isSolid(tile[y][x]);
  const okDir = (d) => (DIRS[d] ? d : 'down');
  function remoteFor(sid, p = {}) {
    let r = remotes.get(sid);
    if (!r) {
      const [x, y] = okTile(p.tx, p.ty) ? [p.tx, p.ty] : [22, H - 3];
      r = Object.assign(ent('remote', x, y, okDir(p.dir)), { sid, q: [], name: 'Khách', badge: '', off: Math.floor(Math.random() * 4) });
      remotes.set(sid, r);
    }
    if (p.name !== undefined) r.name = cleanName(p.name);
    if (p.badge !== undefined) r.badge = p.badge === 'GV' ? 'GV' : '';
    if (p.look !== undefined || !r.pal) { const pal = lookPal(p.look, { ...PAL.student, book: false }); r.pal = pal; r.palKey = 'r' + sid + pal.shirt + pal.hair + pal.skin; }
    return r;
  }
  function onlineHud() {
    const el = $('hOn'); el.hidden = !online; $('bChat').hidden = !online;
    $('hOnN').textContent = remotes.size + 1;
    el.title = ['Bạn', ...[...remotes.values()].map((r) => r.name + (r.badge ? ' (GV)' : ''))].join(', ');
  }
  const teleport = (r, x, y, d) => { r.tx = r.nx = x; r.ty = r.ny = y; r.x = x * T; r.y = y * T; r.moving = false; r.dir = d || r.dir; };
  function updRemotes(dt) {
    for (const r of remotes.values()) {
      stepEnt(r, dt);
      if (r.bow) { r.bow.t += dt; if (r.bow.t >= r.bow.n * BOW) r.bow = null; else continue; }
      if (r.moving || !r.q.length) continue;
      if (r.q.length > 6) { const l = r.q[r.q.length - 1]; r.q.length = 0; teleport(r, l[0], l[1], l[2]); continue; }
      const [x, y, d, run] = r.q.shift(), dist = Math.abs(x - r.tx) + Math.abs(y - r.ty);
      if (dist === 0) r.dir = d;
      else if (dist === 1) {
        r.nx = x; r.ny = y; r.dir = x > r.tx ? 'right' : x < r.tx ? 'left' : y > r.ty ? 'down' : 'up';
        r.moving = true; r.prog = 0; r.alt = !r.alt; r.dur = (run ? 0.12 : 0.2) * (r.q.length > 2 ? 0.6 : 1);
      } else teleport(r, x, y, d);
    }
  }
  const myPos = () => ({ tx: player.moving ? player.nx : player.tx, ty: player.moving ? player.ny : player.ty, dir: player.dir });
  function sendPos(force) {
    const p = myPos(), doing = modalKind && DOING[modalKind] ? modalKind : '';
    const sig = `${p.tx},${p.ty},${p.dir},${player.broom ? 1 : 0},${doing}`;
    if (!force && sig === lastSig) return;
    lastSig = sig; sendT = 0.08; beatT = 6;
    net.send('pos', { ...p, run: player.moving && player.dur < 0.15 ? 1 : 0, broom: player.broom ? 1 : 0, doing });
  }
  function netTick(dt) {
    if (!online) return;
    sendT -= dt; beatT -= dt; chatT -= dt;
    if (sendT <= 0) sendPos(beatT <= 0);
  }
  function showBubble(e, txt) { e.bubble = { txt, t: 0 }; }
  function speak(i, to) {
    if (!online || chatT > 0) { if (chatT > 0) toast('Từ từ thôi, nói chậm lại chút nhé.'); return; }
    chatT = 2;
    const target = to ? remotes.get(to) : null;
    showBubble(player, (target ? `@${target.name} ` : '') + PHRASES[i]);
    net.send('say', { p: i, to: to || '' });
  }
  async function openChat() {
    if (ui.busy() || !online) return;
    const c = await say('Nói gì với mọi người trong chùa?', { who: 'Nói nhanh', choices: [...PHRASES, 'Thôi'] });
    if (c !== null && c < PHRASES.length) speak(c);
  }
  on($('bChat'), 'click', () => { setActive(true); openChat(); });
  on($('hOn'), 'click', () => toast(`Đang ở chùa: ${$('hOn').title}`));
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
      if (e.type === 'pos' && okTile(e.tx, e.ty)) {
        r.q.push([e.tx, e.ty, okDir(e.dir), !!e.run]);
        r.broom = !!e.broom; r.doing = DOING[e.doing] ? e.doing : '';
        onlineHud();
      } else if (e.type === 'bow') {
        if (okTile(e.tx, e.ty)) { r.q.length = 0; teleport(r, e.tx, e.ty, 'up'); }
        r.dir = 'up'; r.bow = { t: 0, n: 3 };
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

  const smoke = [];
  const LABELS = [
    { t: 'Chánh điện', x: 23 * T, y: 3 * T - 22 }, { t: 'Lầu chuông', x: 12.5 * T, y: 5 * T - 16 }, { t: 'Lầu trống', x: 33.5 * T, y: 5 * T - 16 },
    { t: 'Bảo tháp', x: 38.5 * T, y: 3 * T - 26 }, { t: 'Nhà mõ', x: 8 * T, y: 10 * T - 8 }, { t: 'Hồ sen', x: 36.5 * T, y: 9 * T - 2 },
    { t: 'Sân luyện võ', x: 11 * T, y: 18 * T + 6 }, { t: 'Cây đa', x: 35 * T, y: 17 * T - 4 }, { t: 'Giá chổi', x: 40.5 * T, y: 26 * T - 2 },
    { t: 'Quầy nhang', x: 26.5 * T, y: 32 * T - 2 }, { t: 'Phà Game Island · Cầu sang Bảo tàng ↓', x: 23 * T, y: (H - 1) * T + 2 },
  ];
  const GLOWS = [[16 * T + 88, 3 * T + 52, 20], [16 * T + 136, 3 * T + 52, 20], [22 * T + 16, 13 * T - 12, 22], [20 * T + 29, (WB - 1) * T + 10, 16], [20 * T + 67, (WB - 1) * T + 10, 16],
    [25 * T + 24, 33 * T + 6, 26], [6 * T + 32, 10 * T + 40, 18], [11 * T + 24, 5 * T + 24, 18], [32 * T + 24, 5 * T + 24, 18], [38 * T + 8, 3 * T + 30, 16],
    ...[[19, 18], [26, 18], [19, 24], [26, 24]].map(([x, y]) => [x * T + 8, y * T, 18])];
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const LEAF_COLS = ['#e3b341', '#c98a2e', '#c9c24a', '#b9772e'];
  function spriteOf(e) {
    if (e.kind === 'cat') return catSprite(Math.floor(time * 1.5) % 2);
    const pal = e.pal || (e.kind === 'player' ? myPal : null), kind = e.palKey || e.kind;
    if (e.bow) return sprite(kind, 'up', 0, bowPose(e.bow.t), pal);
    if (e.kind === 'remote' && e.doing === 'vo') { const p = KATA[(Math.floor(time / 0.4) + e.off) % KATA.length]; return sprite(kind, 'down', 0, p, pal); }
    if (e.kind === 'trainee') { const p = KATA[(Math.floor(time / 0.45) + e.off) % KATA.length]; return sprite(kind, 'down', 0, p, pal); }
    if (e.incense) return sprite(kind, 'up', 0, 'join', pal);
    return sprite(kind, e.dir, e.f, null, pal);
  }

  function draw() {
    const vw = cv.width / s, vh = cv.height / s;
    camX = player.x + 8 - vw / 2; camY = player.y + 8 - vh / 2;
    camX = W * T <= vw ? (W * T - vw) / 2 : Math.max(0, Math.min(W * T - vw, camX));
    camY = H * T <= vh ? (H * T - vh) / 2 : Math.max(0, Math.min(H * T - vh, camY));
    camX = Math.round(camX * s) / s; camY = Math.round(camY * s) / s;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0e0d16'; ctx.fillRect(0, 0, cv.width, cv.height);
    const sx = (x) => Math.round((x - camX) * s), sy = (y) => Math.round((y - camY) * s);
    ctx.drawImage(stat, sx(0), sy(0), W * T * s, H * T * s);
    ctx.fillStyle = 'rgba(200,235,255,.75)';
    for (let y = 9; y <= 13; y++) for (let x = 33; x <= 39; x++) {
      const ph = (time * 1.2 + hash(x, y, 77) * 6) % 6; if (ph > 2.4) continue;
      const ox = 3 + Math.floor(hash(x, y, 78) * 8) + Math.floor(ph * 1.5), oy = 6 + Math.floor(hash(x, y, 79) * 6);
      ctx.fillRect(sx(x * T + ox), sy(y * T + oy), 3 * s, s);
    }
    // lá đa trên đất
    for (const [k, n] of leaves) {
      const x = k % W, y = (k - x) / W;
      for (let i = 0; i < n * 2 + 1; i++) {
        ctx.fillStyle = LEAF_COLS[Math.floor(hash(x, y, 200 + i) * 4)];
        const lx = x * T + 2 + Math.floor(hash(x, y, 210 + i) * 11), ly = y * T + 4 + Math.floor(hash(x, y, 220 + i) * 10);
        ctx.fillRect(sx(lx), sy(ly), 3 * s, 2 * s); ctx.fillRect(sx(lx + 1), sy(ly - 1), s, s);
      }
    }
    const all = [player, ...statics, ...visitors, ...remotes.values()].sort((a, b) => a.y - b.y);
    for (const e of all) {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx(e.x + 8), sy(e.y + 15), 5 * s, 2 * s, 0, 0, 7); ctx.fill();
      ctx.drawImage(spriteOf(e), sx(e.x), sy(e.y - 4), 16 * s, 20 * s);
      if (e.incense) { ctx.fillStyle = '#c23a2a'; ctx.fillRect(sx(e.x + 7), sy(e.y - 6), s, 6 * s); ctx.fillStyle = '#ff9a3a'; ctx.fillRect(sx(e.x + 7), sy(e.y - 7), s, s); }
      if (e.broom && !e.bow && e.doing !== 'vo') {
        const right = e.dir !== 'left', bx = e.x + (right ? 13 : 2), sw = e.moving ? (e.f === 1 ? -1 : e.f === 2 ? 1 : 0) : 0;
        ctx.fillStyle = '#241a26'; ctx.fillRect(sx(bx - 1), sy(e.y), 3 * s, 11 * s);
        ctx.fillStyle = '#c99a5e'; ctx.fillRect(sx(bx), sy(e.y + 1), s, 9 * s);
        ctx.fillStyle = '#241a26'; ctx.fillRect(sx(bx - 3 + sw), sy(e.y + 9), 7 * s, 5 * s);
        ctx.fillStyle = '#e6c36a'; ctx.fillRect(sx(bx - 2 + sw), sy(e.y + 10), 5 * s, 3 * s);
        ctx.fillStyle = '#c9a24a'; ctx.fillRect(sx(bx - 1 + sw), sy(e.y + 10), s, 3 * s); ctx.fillRect(sx(bx + 1 + sw), sy(e.y + 10), s, 3 * s);
      }
    }
    ctx.drawImage(over, sx(0), sy(0), W * T * s, H * T * s);
    for (const p of falling) {
      const k = p.t / p.dur, x = p.x + Math.sin(p.t * 4 + p.ph) * 5, y = p.y0 + (p.y1 - p.y0) * k;
      ctx.fillStyle = p.col; ctx.fillRect(sx(x), sy(y), 3 * s, 2 * s);
    }
    for (const p of dust) { ctx.fillStyle = `${p.col}${Math.max(0, 0.8 - p.t * 1.6)})`; ctx.fillRect(sx(p.x), sy(p.y), 2 * s, 2 * s); }
    for (const p of smoke) { ctx.fillStyle = `rgba(235,235,245,${p.a})`; ctx.fillRect(sx(p.x), sy(p.y), 2 * s, 2 * s); }
    const z = (time % 2) / 2; ctx.fillStyle = `rgba(255,255,255,${1 - z})`; ctx.font = `${6 * s}px VT323, monospace`; ctx.fillText('z', sx(cat.x + 13 + z * 3), sy(cat.y + 1 - z * 6));
    // tiếng hô của chú tiểu tập võ
    const ph = Math.floor(time / 0.45) % KATA.length;
    ctx.font = `${Math.round(6 * s)}px VT323, monospace`; ctx.textAlign = 'center';
    trainees.forEach((t) => { if ((ph + t.off) % KATA.length === 3) { ctx.fillStyle = '#fff4dc'; ctx.fillText('Hà!', sx(t.x + 8), sy(t.y - 8)); } });
    if (isNight()) {
      ctx.fillStyle = 'rgba(18,20,58,.38)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, r] of GLOWS) {
        const fl = 1 + Math.sin(time * 3 + x) * 0.06, gr = ctx.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r * s * fl);
        gr.addColorStop(0, 'rgba(255,190,90,.38)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = gr;
        ctx.fillRect(sx(x) - r * s * 1.2, sy(y) - r * s * 1.2, r * s * 2.4, r * s * 2.4);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.font = `${Math.round(6.5 * s)}px VT323, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const l of LABELS) {
      const w = ctx.measureText(l.t).width + 5 * s, h = 8 * s, x = sx(l.x), y = sy(l.y);
      if (x < -w || y < -h || x > cv.width + w || y > cv.height + h) continue;
      ctx.fillStyle = 'rgba(19,18,27,.82)'; roundRect(x - w / 2, y - h / 2, w, h, 3 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,210,122,.8)'; ctx.lineWidth = Math.max(1, s / 2.5); ctx.stroke();
      ctx.fillStyle = '#ffe9b8'; ctx.fillText(l.t, x, y + s * 0.4);
    }
    // v39: thẻ tên người chơi thật (chấm xanh = người thật, nhãn vàng GV = giảng viên) + bong bóng lời nói
    ctx.font = `${Math.round(6.5 * s)}px VT323, monospace`;
    for (const r of remotes.values()) {
      const label = r.name + (r.doing && r.doing !== 'vo' ? ` · ${DOING[r.doing]}` : r.doing === 'vo' ? ' · luyện võ' : '');
      const tw = ctx.measureText(label).width, gv = r.badge ? ctx.measureText('GV').width + 4 * s : 0;
      const w = tw + 11 * s + gv, h = 8 * s, x = sx(r.x + 8), y = sy(r.y - 9);
      ctx.fillStyle = 'rgba(14,40,28,.9)'; roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.fill();
      ctx.strokeStyle = '#6ee7a0'; ctx.lineWidth = Math.max(1, s / 2.5); ctx.stroke();
      ctx.fillStyle = '#6ee7a0'; ctx.beginPath(); ctx.arc(x - w / 2 + 4.5 * s, y, 1.8 * s, 0, 7); ctx.fill();
      let tx = x - w / 2 + 8 * s;
      if (gv) { ctx.fillStyle = '#ffd27a'; roundRect(tx, y - 3 * s, gv - s, 6 * s, 2 * s); ctx.fill(); ctx.fillStyle = '#2a1a06'; ctx.textAlign = 'left'; ctx.fillText('GV', tx + 1.5 * s, y + s * 0.4); tx += gv; }
      ctx.textAlign = 'left'; ctx.fillStyle = '#eafff2'; ctx.fillText(label, tx, y + s * 0.4);
      ctx.textAlign = 'center';
    }
    for (const e of [player, ...remotes.values()]) {
      if (!e.bubble) continue;
      const b = e.bubble, w = ctx.measureText(b.txt).width + 8 * s, h = 10 * s, x = sx(e.x + 8), y = sy(e.y - (e === player ? 14 : 22)) - h / 2;
      ctx.globalAlpha = Math.min(1, (4 - b.t) * 2);
      ctx.fillStyle = '#fffaf0'; roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 2 * s, y + h / 2 - s); ctx.lineTo(x, y + h / 2 + 3 * s); ctx.lineTo(x + 2 * s, y + h / 2 - s); ctx.fill();
      ctx.strokeStyle = '#241a26'; ctx.lineWidth = Math.max(1, s / 2.5); roundRect(x - w / 2, y - h / 2, w, h, 4 * s); ctx.stroke();
      ctx.fillStyle = '#241a26'; ctx.fillText(b.txt, x, y + s * 0.4);
      ctx.globalAlpha = 1;
    }
    ctx.font = `${Math.round(8 * s)}px VT323, monospace`;
    for (const f of fx) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      ctx.fillStyle = '#13121b'; ctx.fillText(f.txt, sx(f.x) + s, sy(f.y - f.t * 18) + s);
      ctx.fillStyle = f.col; ctx.fillText(f.txt, sx(f.x), sy(f.y - f.t * 18));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (!ui.busy() && !player.moving && !player.bow) {
      const [fx2, fy2] = facing(); const t = targetAt(fx2, fy2);
      if ((t && ACT[t]) || onMat()) {
        const bx = sx(player.x + 5), by = sy(player.y - 14 + Math.round(Math.sin(time * 6)));
        ctx.fillStyle = '#241a26'; ctx.fillRect(bx - s, by - s, 8 * s, 10 * s);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 6 * s, 8 * s);
        ctx.fillStyle = '#e23b2b'; ctx.fillRect(bx + 2 * s, by + s, 2 * s, 4 * s); ctx.fillRect(bx + 2 * s, by + 6 * s, 2 * s, s);
      }
    }
  }

  /* ---------- loop ---------- */
  let lastT = performance.now(), smokeT = 0, raf = 0, leafT = 1.5;
  function update(dt) {
    time += dt; ui.tick(dt); if (modalTick) modalTick(dt);
    if (stepEnt(player, dt)) onArrive();
    if (player.bow) {
      const b = player.bow; b.t += dt;
      const down = Math.floor((b.t - 0.6) / BOW) + 1; // số lần đã cúi sát đất
      if (down > b.done && b.done < b.n) {
        b.done++; st.bows++; const n = gain(2); b.got += n; sfx.bow();
        floatTxt(n ? `+${n}` : '🙏', player.x + 8, player.y - 6);
      }
      for (const r of remotes.values()) if (r.bow) b.mates.add(r.name);
      if (b.t >= b.n * BOW) {
        player.bow = null;
        const extra = b.mates.size ? gain(3) : 0;
        if (b.mates.size) toast(`Lạy cùng ${[...b.mates].slice(0, 3).join(', ')}: +${b.got + extra} công đức (thưởng lạy chung +${extra}).`);
        else toast(b.got ? `Lạy Phật 3 lạy: +${b.got} công đức.` : `Hôm nay đủ ${CAP_PER_DAY} công đức rồi — lạy vẫn được, tâm an là chính.`);
      }
    } else if (!player.moving && !ui.busy()) {
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
    stepEnt(monk, dt);
    if (!monk.moving && !ui.busy()) {
      monk.timer -= dt;
      if (monk.timer <= 0) {
        monk.timer = 1.2 + Math.random() * 2.2;
        const d = pickOne(['up', 'down', 'left', 'right']), [dx, dy] = DIRS[d], nx = monk.tx + dx, ny = monk.ty + dy;
        if (nx >= 14 && nx <= 31 && ny >= 10 && ny <= 20) startMove(monk, d, 0.32); else monk.dir = d;
      }
    }
    updVisitors(dt);
    updRemotes(dt); netTick(dt);
    for (const e of [player, ...remotes.values()]) if (e.bubble && (e.bubble.t += dt) > 4) e.bubble = null;
    // lá đa rơi
    leafT -= dt;
    if (leafT <= 0) {
      leafT = 1.4 + Math.random() * 1.8;
      if (leaves.size + falling.length < 30) {
        const [tx, ty] = pickOne(leafTiles);
        falling.push({ tx, ty, x: tx * T + 2 + Math.random() * 10, y0: 19 * T - 30 + Math.random() * 30, y1: ty * T + 6 + Math.random() * 6, t: 0, dur: 1.8 + Math.random() * 1.4, ph: Math.random() * 6, col: pickOne(LEAF_COLS) });
      }
    }
    for (const p of falling) p.t += dt;
    for (let i = falling.length - 1; i >= 0; i--) if (falling[i].t >= falling[i].dur) { const p = falling[i]; falling.splice(i, 1); addLeaf(p.tx, p.ty); }
    for (const p of dust) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; }
    while (dust.length && dust[0].t > 0.5) dust.shift();
    for (const f of fx) f.t += dt;
    while (fx.length && fx[0].t > 1.1) fx.shift();
    smokeT -= dt;
    if (smokeT <= 0) { smokeT = 0.12; smoke.push({ x: 22 * T + 10 + Math.random() * 12, y: 13 * T - 13, a: 0.55, vx: (Math.random() - 0.5) * 4, life: 0 }); }
    for (const p of smoke) { p.life += dt; p.y -= dt * 9; p.x += Math.sin(p.life * 3 + p.vx) * dt * 4; p.a = Math.max(0, 0.55 - p.life * 0.22); }
    while (smoke.length && smoke[0].a <= 0) smoke.shift();
  }
  function loop(now) {
    if (dead) return;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    update(dt); draw(); raf = requestAnimationFrame(loop);
  }

  resize(); hud();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    if (dead) return;
    raf = requestAnimationFrame(loop);
    if (opts.online) { try { net = opts.online(handlers) || net; } catch { /* chơi một mình */ } }
    const touch = root.classList.contains('touch');
    if (!st.seen) {
      st.seen = true; st.seen38 = true; save();
      say(['Chào mừng bạn đến Knoworld Temple!',
        'Tích công đức bằng cách lạy Phật trước Chánh điện, gõ mõ, luyện võ với Võ sư hoặc quét lá đa → mua nhang ở Quầy nhang ngoài cổng → xin xăm hoặc hỏi Thầy Phán.',
        touch ? 'Dùng phím ảo để đi, nút A để tương tác.' : 'Đi bằng phím mũi tên hoặc WASD, giữ Shift để chạy, bấm Space để tương tác.'], { who: 'Knoworld Temple' });
    } else if (!st.seen38) {
      st.seen38 = true; save();
      say(['Chùa vừa được mở rộng gấp đôi!',
        'Mới có: lạy Phật trên chiếu đỏ trước Chánh điện, Sân luyện võ (góc trái dưới), Sân cây đa để quét lá (góc phải dưới), lầu chuông, lầu trống và bảo tháp.',
        `Khách thập phương cũng ra vào đông hơn. Mỗi ngày giờ tích được tối đa ${CAP_PER_DAY} công đức.`], { who: 'Knoworld Temple' });
    }
  });

  return () => {
    dead = true; cancelAnimationFrame(raf);
    try { net.leave(); } catch { /* ignore */ }
    offs.forEach((f) => f()); timers.forEach((t) => clearTimeout(t)); clearTimeout(toastT);
    if (ro) ro.disconnect();
    if (opts.flush) opts.flush();
    try { AC && AC.close(); } catch { /* ignore */ }
    root.innerHTML = '';
  };
}
