import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// v27: City Notice Board — thông báo cập nhật hiển thị trên thành phố (trang chủ).
// Ai cũng đọc; chỉ admin đăng / ghim / xoá (RLS trên Supabase kiểm soát quyền ghi).
// Chưa chạy migration_v27 thì bảng dùng danh sách mặc định bên dưới.
// ---------------------------------------------------------------------------

export const NOTICE_TAGS = [
  { key: 'new', label: 'Feature', color: '#5ee0a0' },
  { key: 'update', label: 'Update', color: '#c6bfff' },
  { key: 'event', label: 'Event', color: '#ffd27a' },
  { key: 'notice', label: 'Notice', color: '#ff9bd2' },
];

export function tagMeta(key) {
  return NOTICE_TAGS.find((t) => t.key === key) || NOTICE_TAGS[1];
}

// Hiện khi bảng announcements chưa có trên Supabase.
export const FALLBACK_NOTICES = [
  {
    id: 'v27',
    tag: 'new',
    title: 'The city got a new look',
    body: 'A new menu in city style, your streak and the number of explorers on the top bar, and this notice board for every Knoworld update.',
    link: null,
    pinned: false,
    created_at: '2026-11-10T08:00:00+07:00',
  },
  {
    id: 'v26',
    tag: 'update',
    title: 'Welcome to Knoworld City',
    body: 'Every building is a part of Knoworld. Click one to walk in, switch the land and the weather, or watch the city turn from day to night on Vietnam time.',
    link: null,
    pinned: false,
    created_at: '2026-11-10T04:00:00+07:00',
  },
];

const sortNotices = (rows) =>
  [...rows].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)));

export async function fetchAnnouncements(limit = 20) {
  if (!isSupabaseConfigured) return { data: FALLBACK_NOTICES, source: 'sample' };
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: FALLBACK_NOTICES, source: 'sample', error: error.message };
  return { data: sortNotices(data || []), source: 'supabase' };
}

function normalizeUrl(raw) {
  const u = (raw || '').trim();
  if (!u) return null;
  if (u.startsWith('/') || /^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

export async function addAnnouncement({ title, body, tag, link, pinned, user }) {
  const t = (title || '').trim();
  if (!t) return { ok: false, error: 'Please enter a title.' };
  if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured.' };
  const payload = {
    title: t,
    body: (body || '').trim() || null,
    tag: NOTICE_TAGS.some((x) => x.key === tag) ? tag : 'update',
    link: normalizeUrl(link),
    pinned: !!pinned,
    created_by: user?.email || null,
  };
  const { data, error } = await supabase.from('announcements').insert(payload).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, item: data };
}

export async function setAnnouncementPinned(id, pinned) {
  if (!isSupabaseConfigured) return { ok: false };
  const { error } = await supabase.from('announcements').update({ pinned }).eq('id', id);
  return { ok: !error, error: error?.message };
}

export async function deleteAnnouncement(id) {
  if (!isSupabaseConfigured) return { ok: false };
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  return { ok: !error, error: error?.message };
}

// ---- Đã đọc tới đâu (theo trình duyệt) ------------------------------------
const SEEN_KEY = 'kw_board_seen';

export function getBoardSeen() {
  try { return localStorage.getItem(SEEN_KEY) || ''; } catch { return ''; }
}

export function setBoardSeen(iso) {
  try { if (iso) localStorage.setItem(SEEN_KEY, iso); } catch { /* ignore */ }
}
