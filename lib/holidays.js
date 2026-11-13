// v48: Ngày lễ Việt Nam — mỗi ngày lễ có một giao diện chúc mừng riêng.
// Tết Nguyên đán tính theo âm lịch Việt Nam (múi giờ +7, thuật toán Hồ Ngọc Đức).
// Lời chúc mặc định ở đây; admin có thể sửa trên web (lưu ở site_content key 'holidays').

// ---------------- Âm lịch ----------------
const INT = Math.floor;
function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  return jd;
}
function jdToDate(jd) {
  let b, c;
  if (jd > 2299160) { const a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); } else { b = 0; c = jd + 32082; }
  const d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
  return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
}
function newMoonDay(k, tz) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return INT(Jd1 + C1 - deltat + 0.5 + tz / 24);
}
function sunLongitude(jdn, tz) {
  const T = (jdn - 2451545.5 - tz / 24) / 36525, T2 = T * T, dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr; L -= Math.PI * 2 * INT(L / (Math.PI * 2));
  return INT((L / Math.PI) * 6);
}
function lunarMonth11(yy, tz) {
  const off = jdFromDate(31, 12, yy) - 2415021, k = INT(off / 29.530588853);
  let nm = newMoonDay(k, tz);
  if (sunLongitude(nm, tz) >= 9) nm = newMoonDay(k - 1, tz);
  return nm;
}
function leapMonthOffset(a11, tz) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last, i = 1, arc = sunLongitude(newMoonDay(k + i, tz), tz);
  do { last = arc; i++; arc = sunLongitude(newMoonDay(k + i, tz), tz); } while (arc !== last && i < 14);
  return i - 1;
}
// Ngày dương lịch của ngày âm lịch dd/mm (không nhuận) năm yy -> [d, m, y]
export function lunarToSolar(dd, mm, yy, tz = 7) {
  let a11, b11;
  if (mm < 11) { a11 = lunarMonth11(yy - 1, tz); b11 = lunarMonth11(yy, tz); } else { a11 = lunarMonth11(yy, tz); b11 = lunarMonth11(yy + 1, tz); }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = mm - 11; if (off < 0) off += 12;
  if (b11 - a11 > 365) { const lo = leapMonthOffset(a11, tz); if (off >= lo) off += 1; }
  return jdToDate(newMoonDay(k + off, tz) + dd - 1);
}
const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const canChi = (y) => `${CAN[(y + 6) % 10]} ${CHI[(y + 8) % 12]}`;

// ---------------- Danh sách ngày lễ ----------------
// window: [số ngày trước, số ngày sau] ngày lễ mà giao diện còn hiện.
// fx: hiệu ứng hạt — petals | snow | fireworks | confetti | blossom
export const HOLIDAYS = [
  { id: 'tet', short: 'Tết', name: 'Tết Nguyên đán', lunar: true, window: [2, 5], fx: 'blossom', deco: 'tet',
    colors: { bg: '#8f0d14', bg2: '#c4161c', ink: '#fff4d6', accent: '#ffd25e', soft: '#ffb3a8' },
    emoji: '🧧',
    title: 'Chúc Mừng Năm Mới',
    message: 'Chúc thầy cô, các bạn sinh viên và mọi cư dân Knoworld một năm mới an khang thịnh vượng, vạn sự như ý, học hành tấn tới!' },
  { id: 'newyear', short: '1/1', name: 'Tết Dương lịch', date: [1, 1], window: [1, 0], fx: 'fireworks', deco: 'newyear',
    colors: { bg: '#0b1030', bg2: '#1d2470', ink: '#f4f1ff', accent: '#ffd27a', soft: '#9be7ff' },
    emoji: '🎆',
    title: 'Happy New Year',
    message: 'Một năm mới với thật nhiều tri thức mới, dự án mới và những chuyến khám phá mới trong thành phố Knoworld. Chúc mừng năm mới!' },
  { id: 'women83', short: '8/3', name: 'Quốc tế Phụ nữ', date: [8, 3], window: [0, 0], fx: 'petals', deco: 'flowers',
    colors: { bg: '#5c1236', bg2: '#b8326f', ink: '#fff0f6', accent: '#ffc2dc', soft: '#ff8fbd' },
    emoji: '💐',
    title: 'Chúc mừng Ngày Quốc tế Phụ nữ 8/3',
    message: 'Gửi những bông hoa tươi thắm nhất đến các cô, các bạn nữ và tất cả phụ nữ trong thành phố Knoworld — luôn rạng rỡ, tự tin và hạnh phúc!' },
  { id: 'reunification', short: '30/4', name: 'Giải phóng miền Nam, thống nhất đất nước', date: [30, 4], window: [0, 0], fx: 'fireworks', deco: 'flag',
    colors: { bg: '#7d0a0a', bg2: '#da251d', ink: '#fff6d8', accent: '#ffde00', soft: '#ffb08a' },
    emoji: '🇻🇳',
    title: 'Mừng Ngày Giải phóng miền Nam',
    message: 'Kỷ niệm {years} năm Ngày Giải phóng miền Nam, thống nhất đất nước (30/4/1975 – 30/4/{year}). Non sông liền một dải, niềm vui trọn vẹn!' },
  { id: 'labour', short: '1/5', name: 'Quốc tế Lao động', date: [1, 5], window: [0, 0], fx: 'confetti', deco: 'labour',
    colors: { bg: '#0f2a4a', bg2: '#1f5fa8', ink: '#eef6ff', accent: '#ff5a4e', soft: '#ffd27a' },
    emoji: '🛠️',
    title: 'Chúc mừng Ngày Quốc tế Lao động 1/5',
    message: 'Tri ân mọi người lao động — những người đã xây nên từng con đường, từng toà nhà của thành phố. Nghỉ lễ thật vui và nạp đầy năng lượng nhé!' },
  { id: 'women2010', short: '20/10', name: 'Ngày Phụ nữ Việt Nam', date: [20, 10], window: [0, 0], fx: 'petals', deco: 'flowers',
    colors: { bg: '#3d1050', bg2: '#8a2c8f', ink: '#fbefff', accent: '#ffb3e1', soft: '#d79bff' },
    emoji: '🌹',
    title: 'Chúc mừng Ngày Phụ nữ Việt Nam 20/10',
    message: 'Chúc những người phụ nữ Việt Nam — mẹ, cô giáo, bạn bè — luôn xinh đẹp, mạnh mẽ và được yêu thương mỗi ngày.' },
  { id: 'teachers', short: '20/11', name: 'Ngày Nhà giáo Việt Nam', date: [20, 11], window: [0, 0], fx: 'petals', deco: 'teachers',
    colors: { bg: '#123526', bg2: '#1f5a3e', ink: '#f2fbe9', accent: '#ffd25e', soft: '#b7f07e' },
    emoji: '📚',
    title: 'Tri ân Ngày Nhà giáo Việt Nam 20/11',
    message: 'Kính chúc quý thầy cô luôn mạnh khoẻ, hạnh phúc và tràn đầy cảm hứng trên từng trang giáo án. Cảm ơn thầy cô đã thắp sáng thành phố tri thức này!' },
  { id: 'christmas', short: '24/12', name: 'Giáng sinh', date: [24, 12], window: [0, 1], fx: 'snow', deco: 'christmas',
    colors: { bg: '#0e3324', bg2: '#16583a', ink: '#f6fff8', accent: '#ff4d4d', soft: '#ffe9a8' },
    emoji: '🎄',
    title: 'Merry Christmas',
    message: 'Giáng sinh an lành! Chúc thành phố Knoworld một mùa lễ ấm áp, nhiều niềm vui và thật nhiều món quà tri thức.' },
];
export const HOLIDAY_IDS = HOLIDAYS.map((h) => h.id);
export const holidayById = (id) => HOLIDAYS.find((h) => h.id === id) || null;

// Ngày hiện tại theo giờ Việt Nam -> { d, m, y }
export function vnToday(now = new Date()) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(now)) p[x.type] = x.value;
  return { d: +p.day, m: +p.month, y: +p.year };
}
const dayNum = (d, m, y) => jdFromDate(d, m, y);

// Ngày lễ (dương lịch) của holiday h trong năm y -> [d, m, y]
export function holidayDate(h, y) { return h.lunar ? lunarToSolar(1, 1, y) : [h.date[0], h.date[1], y]; }

// Trả về ngày lễ đang diễn ra (kèm năm, khoá dùng cho lời chúc) hoặc null.
export function activeHoliday(today = vnToday()) {
  const t = dayNum(today.d, today.m, today.y);
  for (const h of HOLIDAYS) for (const y of [today.y - 1, today.y, today.y + 1]) {
    const [d, m, yy] = holidayDate(h, y), j = dayNum(d, m, yy);
    if (t >= j - h.window[0] && t <= j + h.window[1]) return decorate(h, y);
  }
  return null;
}
// Ngày lễ sắp tới (dùng cho ô "sắp đến" trong bảng admin)
export function nextHoliday(today = vnToday()) {
  const t = dayNum(today.d, today.m, today.y);
  let best = null;
  for (const h of HOLIDAYS) for (const y of [today.y, today.y + 1]) {
    const [d, m, yy] = holidayDate(h, y), j = dayNum(d, m, yy);
    if (j >= t && (!best || j < best.j)) best = { ...decorate(h, y), j, days: j - t };
  }
  return best;
}
// Gắn năm, can chi, ngày cụ thể, khoá
export function decorate(h, y) {
  const [d, m, yy] = holidayDate(h, y);
  return { ...h, year: y, when: `${d}/${m}/${yy}`, key: `${h.id}-${y}`, canchi: h.lunar ? canChi(y) : null };
}
// Thay {year}, {years}, {canchi}
export function fill(text, h) {
  return String(text || '')
    .replace(/\{year\}/g, h.year).replace(/\{years\}/g, h.year - 1975).replace(/\{canchi\}/g, h.canchi || '');
}
