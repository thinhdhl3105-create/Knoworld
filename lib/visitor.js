import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

// ---------------------------------------------------------------------------
// Visitor gate — cổng đăng ký trước khi vào web.
// Khách phải điền: họ tên, email, năm sinh, lĩnh vực muốn tìm hiểu.
// Lưu vào Supabase (site_visitors) + localStorage để lần sau không hỏi lại.
// ---------------------------------------------------------------------------

const KEY_VISITOR = 'kw_visitor'; // JSON: { id, full_name, email, birth_year, field }
const KEY_BLOCKED = 'kw_blocked';       // '1' nếu admin đã tắt quyền truy cập
const KEY_VISIT_COUNT = 'kw_visits';    // số lần truy cập (theo server)
const KEY_VISIT_SESSION = 'kw_visit_session'; // đã tính lần truy cập cho phiên này chưa

// Số lần truy cập thì bắt buộc phải đánh giá (chặn cứng).
export const MANDATORY_REVIEW_VISIT = 3;

// Suggested fields of interest ("Other" lets the visitor type their own).
export const FIELDS = [
  'IMC',
  'Creative',
  'Branding',
  'Strategy / Planning',
  'Media',
  'Content',
  'Digital / Performance',
  'PR / Communications',
  'Other',
];

const hasWindow = () => typeof window !== 'undefined';

// Tạo UUID phía client để không phải đọc lại dòng vừa insert
// (khách anon không có quyền SELECT bảng site_visitors).
function uuid() {
  if (hasWindow() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Đã đăng ký cổng chưa?
export function getVisitor() {
  if (!hasWindow()) return null;
  try {
    const raw = localStorage.getItem(KEY_VISITOR);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasRegistered() {
  return !!getVisitor();
}

function saveVisitorLocal(v) {
  if (hasWindow()) localStorage.setItem(KEY_VISITOR, JSON.stringify(v));
}

// Mảng 24 phần tử đếm giờ, đánh dấu giờ hiện tại = 1 (dùng lúc đăng ký).
function currentHourArray() {
  const arr = Array(24).fill(0);
  if (hasWindow()) arr[new Date().getHours()] = 1;
  return arr;
}

// Gửi thông tin đăng ký lên Supabase và lưu cục bộ.
// info: { fullName, email, birthYear, field }
export async function registerVisitor({ fullName, email, birthYear, field }) {
  const clean = {
    full_name: (fullName || '').trim(),
    email: (email || '').trim(),
    birth_year: birthYear ? parseInt(birthYear, 10) : null,
    field: (field || '').trim() || null,
  };

  if (!clean.full_name || !clean.email) {
    return { ok: false, error: 'Please enter your full name and email.' };
  }

  // Không có Supabase (demo): vẫn cho vào, chỉ lưu cục bộ.
  if (!isSupabaseConfigured) {
    const local = { id: null, ...clean };
    saveVisitorLocal(local);
    return { ok: true, source: 'local', visitor: local };
  }

  // Tự sinh id ở client và chèn kèm -> không cần .select() đọc lại
  // (tránh lỗi RLS vì anon không được SELECT bảng này).
  const id = uuid();
  const payload = {
    id,
    anon_id: getAnonId(),
    ...clean,
    visit_count: 1,                    // lượt đăng ký tính là lần truy cập đầu tiên
    hour_histogram: currentHourArray(),
    page_path: hasWindow() ? window.location.pathname : null,
    user_agent: hasWindow() ? navigator.userAgent.slice(0, 300) : null,
  };

  const { error } = await supabase.from('site_visitors').insert(payload);

  if (error) return { ok: false, error: error.message };

  const local = { id, ...clean };
  saveVisitorLocal(local);
  // Đăng ký đã tính là lần truy cập 1 -> không đếm lại trong phiên này.
  if (hasWindow()) {
    sessionStorage.setItem(KEY_VISIT_SESSION, '1');
    localStorage.setItem(KEY_VISIT_COUNT, '1');
    localStorage.removeItem(KEY_BLOCKED);
  }
  return { ok: true, source: 'supabase', visitor: local };
}

// ---------------------------------------------------------------------------
// Theo dõi lần truy cập + thời lượng + trạng thái bị chặn.
// ---------------------------------------------------------------------------

export function isBlocked() {
  return hasWindow() && localStorage.getItem(KEY_BLOCKED) === '1';
}

export function getServerVisitCount() {
  if (!hasWindow()) return 0;
  return parseInt(localStorage.getItem(KEY_VISIT_COUNT) || '0', 10) || 0;
}

// Ghi 1 lần truy cập cho phiên hiện tại (chỉ 1 lần / phiên trình duyệt).
// Trả về { visitCount, blocked } để component quyết định chặn / ép đánh giá.
export async function recordVisit() {
  if (!hasWindow()) return { visitCount: 0, blocked: false };

  const visitor = getVisitor();
  if (!visitor || !isSupabaseConfigured) {
    return { visitCount: getServerVisitCount(), blocked: isBlocked() };
  }

  // Mỗi phiên (tab) chỉ đếm 1 lần.
  if (sessionStorage.getItem(KEY_VISIT_SESSION) === '1') {
    return { visitCount: getServerVisitCount(), blocked: isBlocked() };
  }
  sessionStorage.setItem(KEY_VISIT_SESSION, '1');

  const { data, error } = await supabase.rpc('record_visit', {
    p_anon_id: getAnonId(),
    p_local_hour: new Date().getHours(),
  });

  if (error) {
    return { visitCount: getServerVisitCount(), blocked: isBlocked() };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const visitCount = row?.visit_count ?? getServerVisitCount();
  const blocked = !!row?.blocked;

  localStorage.setItem(KEY_VISIT_COUNT, String(visitCount));
  if (blocked) localStorage.setItem(KEY_BLOCKED, '1');
  else localStorage.removeItem(KEY_BLOCKED);

  return { visitCount, blocked };
}

// Cộng dồn thời lượng ở web (gọi định kỳ trong lúc xem).
export async function flushSessionDuration(seconds) {
  const s = Math.round(seconds);
  if (!hasWindow() || !isSupabaseConfigured || !getVisitor() || s <= 0) return;
  try {
    await supabase.rpc('record_session_duration', {
      p_anon_id: getAnonId(),
      p_seconds: s,
    });
  } catch {
    /* im lặng — số liệu thời lượng không quan trọng bằng trải nghiệm */
  }
}

// Số người đã đăng ký (công khai) — cho trang chủ.
export async function publicVisitorCount() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('public_visitor_count');
  if (error) return null;
  return typeof data === 'number' ? data : Number(data) || 0;
}

// Admin: lấy toàn bộ người ra vào (RLS chỉ cho admin đọc).
export async function fetchVisitors() {
  if (!isSupabaseConfigured) return { data: [], source: 'sample' };
  const { data, error } = await supabase
    .from('site_visitors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data || [], source: 'supabase' };
}

// Admin: bật/tắt quyền truy cập của một người (email không hợp lệ...).
export async function setVisitorBlocked(id, blocked) {
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase
    .from('site_visitors')
    .update({ blocked })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Khung giờ hay vào nhất từ mảng đếm 24 giờ. Trả về "20:00–21:00" hoặc null.
export function peakHour(histogram) {
  if (!Array.isArray(histogram) || histogram.length === 0) return null;
  let best = -1;
  let bestIdx = -1;
  histogram.forEach((c, i) => {
    if ((c || 0) > best) {
      best = c || 0;
      bestIdx = i;
    }
  });
  if (bestIdx < 0 || best <= 0) return null;
  const h = String(bestIdx).padStart(2, '0');
  const h2 = String((bestIdx + 1) % 24).padStart(2, '0');
  return `${h}:00–${h2}:00`;
}

// Thời lượng trung bình mỗi lần truy cập -> "3m 20s" / "45s".
export function avgDuration(totalSeconds, visits) {
  const n = Math.max(1, visits || 1);
  const s = Math.round((totalSeconds || 0) / n);
  if (s <= 0) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
