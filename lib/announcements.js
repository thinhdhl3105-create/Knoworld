import { supabase, isSupabaseConfigured } from './supabaseClient';
import { CHANGELOG } from './changelog';

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

// Nhãn cho tin tự động về nội dung mới (không có trong form đăng tay).
const AUTO_TAGS = [
  { key: 'content', label: 'New content', color: '#7ef0ff' },
  { key: 'private', label: 'Island · private', color: '#ffd27a' },
];

export function tagMeta(key) {
  return [...NOTICE_TAGS, ...AUTO_TAGS].find((t) => t.key === key) || NOTICE_TAGS[1];
}

// v29: Bảng tự cập nhật — gộp 3 nguồn, admin không cần nhập:
//   1. CHANGELOG (lib/changelog.js) — mỗi phiên bản web mới.
//   2. Nội dung mới trên Supabase (video, case study, research, news, concept) trong FEED_DAYS ngày.
//   3. Tin admin đăng tay (bảng announcements) — vẫn dùng được để ghim / thông báo riêng.
const FEED_DAYS = 30;

const KIND_META = {
  video: { label: 'video case study', route: '/videos', icon: 'Cinema' },
  student: { label: 'student case study', route: '/students', icon: 'Gallery' },
  image: { label: 'image case study', route: '/images', icon: 'Gallery' },
  research: { label: 'research paper', route: '/research', icon: 'Research Archive' },
};

export const FALLBACK_NOTICES = CHANGELOG.map((c) => ({
  id: `log-${c.version}`,
  tag: c.tag,
  title: c.title,
  body: c.body,
  link: c.link,
  pinned: false,
  auto: true,
  created_at: c.date,
}));

const sortNotices = (rows) =>
  [...rows].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)));

const norm = (t) => String(t || '').trim().toLowerCase();
const dayKey = (iso) => String(iso || '').slice(0, 10);

// Nội dung mới đăng → thông báo tự động.
async function fetchContentFeed() {
  if (!isSupabaseConfigured) return [];
  const since = new Date(Date.now() - FEED_DAYS * 86400000).toISOString();
  const [c, n, k, gr] = await Promise.all([
    supabase.from('content').select('id, kind, title, created_at').eq('published', true)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(12),
    supabase.from('news_items').select('id, title, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(6),
    supabase.from('concepts').select('id, created_at').eq('published', true)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(300),
    supabase.from('game_rounds').select('id, kind, title, data, created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(4),
  ]);
  const out = [];

  // Nội dung: gom theo (loại, ngày) để 10 video đăng cùng lúc chỉ thành 1 tin.
  const groups = new Map();
  for (const r of c.data || []) {
    const meta = KIND_META[r.kind];
    if (!meta) continue;
    const key = `${r.kind}|${dayKey(r.created_at)}`;
    if (!groups.has(key)) groups.set(key, { meta, kind: r.kind, rows: [] });
    groups.get(key).rows.push(r);
  }
  for (const [key, g] of groups) {
    const first = g.rows[0];
    const many = g.rows.length > 1;
    out.push({
      id: `auto-${key}`,
      tag: 'content',
      title: many ? `${g.rows.length} new ${g.meta.label}s` : `New ${g.meta.label}: ${first.title}`,
      body: many ? g.rows.slice(0, 4).map((r) => r.title).join(' · ') + (g.rows.length > 4 ? ' …' : '') : `Now open in the ${g.meta.icon}.`,
      link: g.kind === 'student' && !many ? `/students/${first.id}` : g.meta.route,
      pinned: false,
      auto: true,
      created_at: first.created_at,
    });
  }

  // News: mỗi ngày 1 tin.
  const newsByDay = new Map();
  for (const r of n.data || []) {
    const d = dayKey(r.created_at);
    if (!newsByDay.has(d)) newsByDay.set(d, []);
    newsByDay.get(d).push(r);
  }
  for (const [d, rows] of newsByDay) {
    out.push({
      id: `auto-news-${d}`,
      tag: 'content',
      title: rows.length > 1 ? `${rows.length} new stories at the News Tower` : `On air: ${rows[0].title}`,
      body: rows.length > 1 ? rows.slice(0, 3).map((r) => r.title).join(' · ') : 'Fresh market news on the LED board.',
      link: '/news',
      pinned: false,
      auto: true,
      created_at: rows[0].created_at,
    });
  }

  // Concept: gom theo ngày (nhập hàng loạt từ slide).
  const conceptsByDay = new Map();
  for (const r of k.data || []) {
    const d = dayKey(r.created_at);
    if (!conceptsByDay.has(d)) conceptsByDay.set(d, []);
    conceptsByDay.get(d).push(r);
  }
  for (const [d, rows] of conceptsByDay) {
    out.push({
      id: `auto-concepts-${d}`,
      tag: 'content',
      title: rows.length > 1 ? `${rows.length} new concepts on the metro map` : 'A new concept on the metro map',
      body: 'New stations opened in the Knowledge Hub.',
      link: '/knowledge-hub',
      pinned: false,
      auto: true,
      created_at: rows[0].created_at,
    });
  }
  // Game Island: kết quả giảng viên công bố (bảng game_rounds, v31).
  for (const r of gr.data || []) {
    const race = r.kind === 'race';
    const list = race ? (r.data?.order || []) : (r.data?.groups || []).map((g) => `${g.group}: ${(g.brands || []).join(', ')}`);
    out.push({
      id: `auto-game-${r.id}`,
      tag: 'event',
      title: race ? `Harbour Cup result: ${r.title}` : 'Billboard Draw: brands are out',
      body: race ? `Presenting order: ${list.slice(0, 6).map((g, i) => `${i + 1}. ${g}`).join(' · ')}${list.length > 6 ? ' …' : ''}` : list.slice(0, 2).join(' · ') + (list.length > 2 ? ' …' : ''),
      link: '/games',
      pinned: false,
      auto: true,
      created_at: r.created_at,
    });
  }
  return out;
}

export async function fetchAnnouncements(limit = 20) {
  if (!isSupabaseConfigured) return { data: FALLBACK_NOTICES, source: 'sample' };
  const [manual, feed] = await Promise.all([
    supabase.from('announcements').select('*')
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit),
    fetchContentFeed().catch(() => []),
  ]);
  const manualRows = manual.error ? [] : manual.data || [];
  // Tin đăng tay trùng tiêu đề với changelog → giữ bản đăng tay (để admin ghim / xoá được).
  const taken = new Set(manualRows.map((r) => norm(r.title)));
  const merged = [
    ...manualRows,
    ...FALLBACK_NOTICES.filter((r) => !taken.has(norm(r.title))),
    ...feed,
  ];
  return {
    data: sortNotices(merged).slice(0, limit),
    source: manual.error ? 'sample' : 'supabase',
    error: manual.error?.message,
  };
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
