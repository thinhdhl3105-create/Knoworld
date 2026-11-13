// ---------------------------------------------------------------------------
// v51: MY HOME — dữ liệu (Supabase). Chạy supabase/migration_v51_home.sql trước.
//   • home_state (1 dòng): chế độ cửa chính + bố cục nhà (bản đầy đủ & bản chỉ có sân trước).
//   • RPC home_load(anon_id, code): trả bố cục đầy đủ nếu được vào nhà, không thì chỉ sân trước.
//   • home_guests: khách mời (mỗi người một mã mời) · home_knocks: gõ cửa (RPC home_knock).
//   • Ảnh: bucket 'home' (đường dẫn ngẫu nhiên, không liệt kê được, chỉ admin tải lên).
//   • Tìm 10 em vịt: lưu tiến trình qua RPC get/set_visitor_museum (giữ từ v40).
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';
import { getVisitor } from './visitor';

export const HOME_ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';
export const HOME_BUCKET = 'home';
const OLD_MUSEUM_BUCKET = 'museum';
const ok = () => isSupabaseConfigured && !!supabase;

/* ---------------- mã mời (lưu trên trình duyệt khách) ---------------- */
const CODE_KEY = 'kw_home_code';
export function getHomeCode() { try { return localStorage.getItem(CODE_KEY) || ''; } catch { return ''; } }
export function setHomeCode(code) { try { if (code) localStorage.setItem(CODE_KEY, String(code).trim().toUpperCase().slice(0, 12)); else localStorage.removeItem(CODE_KEY); } catch { /* ignore */ } }

/* ---------------- tải nhà ---------------- */
// -> { ok, owner, mode, member, guest, knock, code_bad, layout } | { offline: true, ... }
export async function loadHome(isAdmin) {
  if (!ok()) return { offline: true, ok: true, owner: !!isAdmin, mode: 'public', layout: null };
  try {
    const { data, error } = await supabase.rpc('home_load', { p_anon_id: getAnonId(), p_code: getHomeCode() || null });
    if (error || !data) return { offline: true, ok: !!isAdmin, owner: !!isAdmin, mode: isAdmin ? 'invited' : 'setup', layout: null };
    if (data.code_bad) setHomeCode('');
    return data;
  } catch {
    return { offline: true, ok: !!isAdmin, owner: !!isAdmin, mode: isAdmin ? 'invited' : 'setup', layout: null };
  }
}

export async function saveHomeLayout(full, pub) {
  if (!ok()) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase.from('home_state').upsert({ id: 1, layout_full: full, layout_public: pub, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

/* ---------------- gõ cửa ---------------- */
// -> 'ok' | 'dup' | 'wait' | 'noname' | 'closed' | 'error'
export async function knockHome() {
  if (!ok()) return 'error';
  const v = getVisitor();
  const full = String(v?.full_name || v?.fullName || '').trim();
  if (!full) return 'noname';
  try {
    const { data, error } = await supabase.rpc('home_knock', { p_anon_id: getAnonId(), p_name: full });
    return error ? 'error' : (data || 'error');
  } catch { return 'error'; }
}

/* ---------------- admin: cửa chính, khách mời, gõ cửa ---------------- */
export async function loadHomeAccess() {
  const [st, g, k] = await Promise.all([
    supabase.from('home_state').select('house_mode').eq('id', 1).maybeSingle(),
    supabase.from('home_guests').select('id,name,code,anon_id,created_at').order('created_at', { ascending: true }),
    supabase.from('home_knocks').select('id,name,anon_id,status,created_at').order('created_at', { ascending: false }).limit(60),
  ]);
  if (g.error) throw g.error;
  return { mode: st.data?.house_mode || 'invited', guests: g.data || [], knocks: k.data || [] };
}
export async function setHouseMode(mode) {
  const { error } = await supabase.from('home_state').upsert({ id: 1, house_mode: mode, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  const a = new Uint32Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a); else for (let i = 0; i < 6; i++) a[i] = Math.floor(Math.random() * 1e9);
  return [...a].map((n) => ALPHA[n % ALPHA.length]).join('');
}
export async function addHomeGuest(name, anonId = null) {
  for (let tries = 0; tries < 4; tries++) {
    const { data, error } = await supabase.from('home_guests').insert({ name: String(name).trim().slice(0, 40), code: newCode(), anon_id: anonId }).select('*').single();
    if (!error) return data;
    if (!/duplicate|unique/i.test(error.message || '')) throw error;
  }
  throw new Error('Không tạo được mã mời, thử lại.');
}
export async function removeHomeGuest(id) {
  const { error } = await supabase.from('home_guests').delete().eq('id', id);
  if (error) throw error;
}
export async function answerHomeKnock(k, allow) {
  const { error } = await supabase.from('home_knocks').update({ status: allow ? 'ok' : 'no', answered_at: new Date().toISOString() }).eq('id', k.id);
  if (error) throw error;
  if (allow) {
    const { data } = await supabase.from('home_guests').select('id').eq('anon_id', k.anon_id).limit(1);
    if (!data || !data.length) await addHomeGuest(k.name, k.anon_id);
  }
}

/* ---------------- ảnh ---------------- */
// Thu nhỏ ảnh trước khi tải (cạnh dài tối đa 1800px, JPEG 0.85). Metro Ad Wall cũng dùng hàm này.
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
export async function uploadHomePhoto(file) {
  if (!ok()) throw new Error('Supabase chưa được cấu hình.');
  const small = await shrinkImage(file, 1600, 0.85);
  const ext = (small.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `photos/${rid()}.${ext}`;
  const { error } = await supabase.storage.from(HOME_BUCKET).upload(path, small, { upsert: false, contentType: small.type || 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return { path, url: supabase.storage.from(HOME_BUCKET).getPublicUrl(path).data.publicUrl };
}
export async function removeHomeFiles(paths) {
  const list = (paths || []).filter((p) => typeof p === 'string' && p.startsWith('photos/'));
  if (!list.length || !ok()) return;
  await supabase.storage.from(HOME_BUCKET).remove(list);
}

// Xoá hẳn ảnh cũ của Knoworld Museum (các thư mục phòng trong bucket 'museum'; KHÔNG đụng metro-ads/).
let cleaned = false;
export async function cleanupOldMuseumPhotos() {
  if (cleaned || !ok()) return 0;
  cleaned = true;
  let n = 0;
  for (const folder of ['class', 'event', 'award', 'lens', 'love', 'lobby']) {
    try {
      const { data, error } = await supabase.storage.from(OLD_MUSEUM_BUCKET).list(folder, { limit: 1000 });
      if (error || !data || !data.length) continue;
      const paths = data.filter((f) => f && f.name && f.id).map((f) => `${folder}/${f.name}`);
      if (!paths.length) continue;
      const { error: e2 } = await supabase.storage.from(OLD_MUSEUM_BUCKET).remove(paths);
      if (!e2) n += paths.length;
    } catch { /* bỏ qua */ }
  }
  return n;
}

/* ---------------- tìm 10 em vịt ---------------- */
export async function loadDuckProgress() {
  if (!ok()) return null;
  try { const { data, error } = await supabase.rpc('get_visitor_museum', { p_anon_id: getAnonId() }); return error ? null : data || null; } catch { return null; }
}
let timer = null, pending = null;
export function saveDuckProgress(state) {
  if (!ok()) return;
  pending = { duckDay: state.duckDay, ducks: state.ducks, duckEver: state.duckEver, ts: state.ts };
  clearTimeout(timer);
  timer = setTimeout(async () => { const s = pending; pending = null; try { await supabase.rpc('set_visitor_museum', { p_anon_id: getAnonId(), p_state: s }); } catch { /* chỉ lưu local */ } }, 1500);
}
