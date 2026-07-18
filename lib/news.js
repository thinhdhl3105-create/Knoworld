import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// News — cập nhật thông tin thị trường (crisis, market update, trend…).
// Ai cũng đọc; chỉ admin thêm/xoá (RLS trên Supabase kiểm soát quyền ghi).
// Admin thêm bằng: link bài báo + tiêu đề + năm + nhãn phân loại.
// ---------------------------------------------------------------------------

// Danh sách nhãn — dùng chung cho form (admin) và bộ lọc (người xem).
export const NEWS_CATEGORIES = [
  { key: 'crisis',     label: 'Crisis',        icon: 'crisis_alert', color: '#ef5350' },
  { key: 'market',     label: 'Market Update', icon: 'trending_up',  color: '#a78bfa' },
  { key: 'trend',      label: 'Trend',         icon: 'insights',     color: '#f6bd56' },
  { key: 'regulation', label: 'Regulation',    icon: 'gavel',        color: '#4fc3f7' },
  { key: 'general',    label: 'General',       icon: 'article',      color: '#c8c4d7' },
];

export function categoryMeta(key) {
  return NEWS_CATEGORIES.find((c) => c.key === key) || NEWS_CATEGORIES[4];
}

// Chuẩn hoá URL: thêm https:// nếu người dùng quên gõ scheme.
function normalizeUrl(raw) {
  const u = (raw || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

// Lấy hostname gọn để hiển thị nguồn (vd "vnexpress.net").
export function sourceHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Danh sách tin, mới nhất trước.
export async function fetchNews() {
  if (!isSupabaseConfigured) return { data: [], source: 'sample' };
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: data || [], source: 'supabase' };
}

// Admin thêm tin.
export async function addNews({ title, url, year, category, summary, user }) {
  const t = (title || '').trim();
  const u = normalizeUrl(url);
  if (!t) return { ok: false, error: 'Please enter a title.' };
  if (!u) return { ok: false, error: 'Please enter the article link.' };
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured.' };

  const yr = parseInt(year, 10);
  const cat = NEWS_CATEGORIES.some((c) => c.key === category) ? category : 'general';

  const payload = {
    title: t,
    url: u,
    year: Number.isFinite(yr) ? yr : null,
    category: cat,
    summary: (summary || '').trim() || null,
    created_by: user?.email || null,
  };

  const { data, error } = await supabase.from('news_items').insert(payload).select().single();
  if (error) {
    if (error.code === 'PGRST116' || /select/i.test(error.message || '')) return { ok: true };
    return { ok: false, error: error.message };
  }
  return { ok: true, item: data };
}

// Admin xoá tin.
export async function deleteNews(id) {
  if (!isSupabaseConfigured) return { ok: false };
  const { error } = await supabase.from('news_items').delete().eq('id', id);
  return { ok: !error, error: error?.message };
}
