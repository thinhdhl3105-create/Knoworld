// ---------------------------------------------------------------------------
// v40: KNOWORLD MUSEUM — dữ liệu (Supabase). Chạy supabase/migration_v40_museum.sql trước.
//   • Ảnh các phòng: bảng museum_photos (khách đọc mọi phòng trừ 'love').
//   • Phòng Riêng: RPC museum_love_photos(pass) — đúng mật khẩu mới trả ảnh.
//   • Sổ lưu bút: museum_guestbook + RPC museum_sign_guestbook.
//   • Điểm khám phá: site_visitors.museum qua RPC get/set_visitor_museum + museum_leaderboard.
//   • Admin: tải ảnh lên bucket 'museum', sửa / xếp thứ tự / xoá, đổi mật khẩu Phòng Riêng.
// Chưa chạy SQL -> mọi hàm trả rỗng, bảo tàng vẫn mở với ảnh minh họa.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

export const MUSEUM_ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
export const MUSEUM_BUCKET = 'museum';

// Số khung treo trên tường / vách / bệ của mỗi phòng (khớp với bản đồ trong lib/museumGame.js).
// Ảnh vượt quá số khung vẫn xem được trong Album của phòng.
export const MUSEUM_ROOMS = [
  { id: 'class', name: 'Phòng Lớp Học', sub: 'Những lớp tôi đã dạy', color: '#a99cff', slots: 10 },
  { id: 'event', name: 'Phòng Sự Kiện', sub: 'Các chương trình cùng sinh viên', color: '#5ee0a0', slots: 10 },
  { id: 'award', name: 'Sảnh Thành Tích', sub: 'Những cột mốc đáng nhớ', color: '#ffd27a', slots: 9 },
  { id: 'lens', name: 'Phòng Ống Kính', sub: 'Ảnh tôi tự chụp', color: '#7ee8ff', slots: 7 },
  { id: 'love', name: 'Phòng Riêng', sub: 'Chỉ dành cho hai chúng mình', color: '#ff8fb1', slots: 7, private: true },
];

const ok = () => isSupabaseConfigured && !!supabase;
const clean = (r) => ({
  id: r.id, room: r.room, url: r.url, path: r.path || '', title: r.title || '', caption: r.caption || '',
  taken: r.taken || '', place: r.place || '', tag: r.tag || '', sort: r.sort || 0, created_at: r.created_at,
});

// Ảnh công khai (mọi phòng trừ Phòng Riêng). Admin đăng nhập sẽ nhận cả ảnh 'love' (RLS) -> lọc bỏ ở đây.
export async function loadMuseumPhotos() {
  if (!ok()) return [];
  try {
    const { data, error } = await supabase.from('museum_photos').select('*').neq('room', 'love')
      .order('sort', { ascending: true }).order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map(clean);
  } catch { return []; }
}

// -> { ok: true, photos } | { ok: false, locked?: true, offline?: true }
export async function unlockLoveRoom(pass) {
  if (!ok()) return { ok: false, offline: true };
  try {
    const { data, error } = await supabase.rpc('museum_love_photos', { p_pass: String(pass || ''), p_anon_id: getAnonId() });
    if (error) return { ok: false, offline: true };
    if (!data || !data.ok) return { ok: false, locked: !!(data && data.locked) };
    return { ok: true, photos: (data.photos || []).map(clean) };
  } catch { return { ok: false, offline: true }; }
}

/* ---------------- sổ lưu bút ---------------- */
export async function loadGuestbook(limit = 40) {
  if (!ok()) return [];
  try {
    const { data, error } = await supabase.from('museum_guestbook').select('id,name,message,created_at')
      .order('created_at', { ascending: false }).limit(limit);
    return error ? [] : data || [];
  } catch { return []; }
}
export async function signGuestbook(name, message) {
  if (!ok()) return false;
  try {
    const { data, error } = await supabase.rpc('museum_sign_guestbook', { p_anon_id: getAnonId(), p_name: name, p_message: message });
    return !error && data === true;
  } catch { return false; }
}
export async function deleteGuestbook(id) {
  if (!ok()) return false;
  const { error } = await supabase.from('museum_guestbook').delete().eq('id', id);
  return !error;
}

/* ---------------- điểm khám phá ---------------- */
export async function loadMuseumProgress() {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase.rpc('get_visitor_museum', { p_anon_id: getAnonId() });
    return error ? null : data || null;
  } catch { return null; }
}
let timer = null, pending = null;
async function push() {
  const s = pending; pending = null; timer = null;
  if (!s || !ok()) return;
  try { await supabase.rpc('set_visitor_museum', { p_anon_id: getAnonId(), p_state: s }); } catch { /* chỉ lưu local */ }
}
export function saveMuseumProgress(state) {
  if (!ok()) return;
  pending = JSON.parse(JSON.stringify(state));
  clearTimeout(timer); timer = setTimeout(push, 1500);
}
export function flushMuseumProgress() { if (pending) { clearTimeout(timer); push(); } }
export async function loadLeaderboard(limit = 10) {
  if (!ok()) return [];
  try {
    const { data, error } = await supabase.rpc('museum_leaderboard', { p_limit: limit });
    return error ? [] : data || [];
  } catch { return []; }
}

/* ---------------- admin ---------------- */
export async function loadRoomPhotosAdmin(room) {
  if (!ok()) return [];
  const { data, error } = await supabase.from('museum_photos').select('*').eq('room', room)
    .order('sort', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(clean);
}
export async function countPhotosAdmin() {
  if (!ok()) return {};
  const { data, error } = await supabase.from('museum_photos').select('room');
  if (error) return {};
  const out = {}; for (const r of data || []) out[r.room] = (out[r.room] || 0) + 1; return out;
}

// Thu nhỏ ảnh trước khi tải (cạnh dài tối đa 1800px, JPEG 0.85) cho nhẹ, tải nhanh trong game.
export async function shrinkImage(file, max = 1800, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    if (k === 1 && file.size < 900 * 1024) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; } finally { URL.revokeObjectURL(url); }
}

const rid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export async function uploadMuseumPhoto(room, file, meta = {}, sort = 0) {
  if (!ok()) throw new Error('Supabase chưa được cấu hình.');
  const small = await shrinkImage(file);
  const ext = (small.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${room}/${rid()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(MUSEUM_BUCKET).upload(path, small, { upsert: false, contentType: small.type || 'image/jpeg', cacheControl: '31536000' });
  if (upErr) throw upErr;
  const url = supabase.storage.from(MUSEUM_BUCKET).getPublicUrl(path).data.publicUrl;
  const row = {
    room, url, path, sort,
    title: String(meta.title || '').slice(0, 120), caption: String(meta.caption || '').slice(0, 1000),
    taken: String(meta.taken || '').slice(0, 60), place: String(meta.place || '').slice(0, 120), tag: String(meta.tag || '').slice(0, 40),
  };
  const { data, error } = await supabase.from('museum_photos').insert(row).select('*').single();
  if (error) { await supabase.storage.from(MUSEUM_BUCKET).remove([path]); throw error; }
  return clean(data);
}
export async function updateMuseumPhoto(id, patch) {
  const allowed = {};
  for (const k of ['title', 'caption', 'taken', 'place', 'tag', 'sort', 'room']) if (patch[k] !== undefined) allowed[k] = patch[k];
  const { error } = await supabase.from('museum_photos').update(allowed).eq('id', id);
  if (error) throw error;
}
export async function deleteMuseumPhoto(p) {
  const { error } = await supabase.from('museum_photos').delete().eq('id', p.id);
  if (error) throw error;
  if (p.path) await supabase.storage.from(MUSEUM_BUCKET).remove([p.path]);
}
export async function setLovePassword(pass) {
  const { data, error } = await supabase.rpc('museum_set_love_pass', { p_pass: pass });
  if (error) throw error;
  return data === true;
}
