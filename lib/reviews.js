import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// Review (đánh giá website) — dành cho khách KHÔNG đăng nhập.
// Theo dõi hành vi bằng localStorage để biết khi nào nên mời đánh giá.
// ---------------------------------------------------------------------------

const KEY_ANON = 'kw_anon_id';      // id ẩn danh của trình duyệt
const KEY_VIEWS = 'kw_view_count';  // số nội dung đã xem
const KEY_DONE = 'kw_review_done';  // đã đánh giá rồi
const KEY_SNOOZE = 'kw_review_snooze'; // timestamp tới khi nào tạm ẩn lời mời

export const VIEW_THRESHOLD = 3;            // xem 3 nội dung thì mời đánh giá
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 3;  // tắt toast → ẩn 3 ngày rồi mời lại

const hasWindow = () => typeof window !== 'undefined';

function uuid() {
  if (hasWindow() && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getAnonId() {
  if (!hasWindow()) return null;
  let id = localStorage.getItem(KEY_ANON);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY_ANON, id);
  }
  return id;
}

export function hasReviewed() {
  return hasWindow() && localStorage.getItem(KEY_DONE) === '1';
}

export function markReviewed() {
  if (hasWindow()) localStorage.setItem(KEY_DONE, '1');
}

export function snoozeReview() {
  if (hasWindow()) localStorage.setItem(KEY_SNOOZE, String(Date.now() + SNOOZE_MS));
}

function isSnoozed() {
  if (!hasWindow()) return false;
  const t = parseInt(localStorage.getItem(KEY_SNOOZE) || '0', 10);
  return t > Date.now();
}

export function getViewCount() {
  if (!hasWindow()) return 0;
  return parseInt(localStorage.getItem(KEY_VIEWS) || '0', 10) || 0;
}

// Gọi mỗi khi khách mở/xem một nội dung (clip, case study…).
// Phát sự kiện 'kw-content-view' để ReviewWidget biết mà cân nhắc hiện toast.
export function trackContentView() {
  if (!hasWindow()) return 0;
  getAnonId();
  const n = getViewCount() + 1;
  localStorage.setItem(KEY_VIEWS, String(n));
  window.dispatchEvent(new CustomEvent('kw-content-view', { detail: { count: n } }));
  return n;
}

// Có nên tự bật lời mời đánh giá không?
export function shouldPromptReview() {
  if (!hasWindow()) return false;
  if (hasReviewed()) return false;
  if (isSnoozed()) return false;
  return getViewCount() >= VIEW_THRESHOLD;
}

// Gửi đánh giá lên Supabase.
export async function submitReview({ convenience, content, overall, comment }) {
  if (!isSupabaseConfigured) {
    // Không có Supabase (môi trường demo): coi như đã đánh giá để không hỏi lại.
    markReviewed();
    return { ok: true, source: 'local' };
  }
  const payload = {
    anon_id: getAnonId(),
    rating_convenience: convenience,
    rating_content: content,
    rating_overall: overall,
    comment: (comment || '').trim() || null,
    page_path: hasWindow() ? window.location.pathname : null,
    user_agent: hasWindow() ? navigator.userAgent.slice(0, 300) : null,
  };
  const { error } = await supabase.from('site_reviews').insert(payload);
  if (error) return { ok: false, error: error.message };
  markReviewed();
  return { ok: true, source: 'supabase' };
}

// Admin: lấy toàn bộ đánh giá (RLS chỉ cho admin đọc).
export async function fetchReviews() {
  if (!isSupabaseConfigured) return { data: [], source: 'sample' };
  const { data, error } = await supabase
    .from('site_reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data || [], source: 'supabase' };
}

// Tính điểm trung bình từ danh sách đánh giá.
export function reviewStats(rows = []) {
  const n = rows.length;
  const avg = (k) => (n ? rows.reduce((s, r) => s + (r[k] || 0), 0) / n : 0);
  return {
    count: n,
    convenience: avg('rating_convenience'),
    content: avg('rating_content'),
    overall: avg('rating_overall'),
  };
}
