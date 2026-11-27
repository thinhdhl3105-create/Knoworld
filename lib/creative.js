// ---------------------------------------------------------------------------
// v64: CREATIVE CITY — thành phố riêng cho buổi dạy thử với học sinh cấp 3.
// Học sinh không cần tài khoản: vào bằng mã phòng + biệt danh, nhận một "vé" (token)
// lưu trên máy. Mọi thao tác của khách đi qua RPC cc_* (SECURITY DEFINER).
// Màn chiếu (/creative/host) dùng tài khoản admin, đọc/sửa trực tiếp các bảng cc_*.
// Đồng bộ: điện thoại hỏi trạng thái mỗi ~2 giây + nhận "ping" tức thì qua Realtime Broadcast.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { shrinkImage } from './home';

export const CC_BUCKET = 'creative';
export const CC_COLORS = ['#ffd27a', '#ff8fb1', '#5ee0a0', '#7ee8ff', '#c6bfff', '#ffb876'];
export const CC_STATIONS = [
  { id: 'gate', name: 'Cổng', full: 'Cổng thành phố', color: '#ffd27a', icon: 'door_open' },
  { id: 'guess', name: 'Ảnh Lạ', full: 'Phòng Ảnh Lạ', color: '#7ee8ff', icon: 'photo_camera' },
  { id: 'draw', name: 'Xưởng Vẽ', full: 'Xưởng Vẽ Thương Hiệu', color: '#ff8fb1', icon: 'brush' },
  { id: 'wall', name: 'Phòng Tranh', full: 'Phòng Tranh', color: '#5ee0a0', icon: 'collections' },
  { id: 'plaza', name: 'Quảng trường', full: 'Quảng trường', color: '#c6bfff', icon: 'cloud' },
];
export const CC_ADMIN_EMAIL = 'thinh.dhl3105@gmail.com';

const ERRORS = {
  room_not_found: 'Không tìm thấy lớp này. Kiểm tra lại mã PIN nhé.',
  name_required: 'Nhập biệt danh để vào thành phố.',
  room_full: 'Phòng đã đủ người.',
  not_joined: 'Phiên của em đã hết. Vào lại phòng nhé.',
  not_running: 'Câu hỏi đã đóng.',
  time_up: 'Hết giờ rồi.',
  too_many: 'Em đã dùng hết lượt.',
  bad_path: 'Ảnh tải lên không hợp lệ.',
  no_brands: 'Chưa có danh sách sản phẩm.',
};
export function ccError(e) {
  const m = String(e?.message || e || '');
  const key = Object.keys(ERRORS).find((k) => m.includes(k));
  return key ? ERRORS[key] : (m || 'Có lỗi, thử lại nhé.');
}

const need = () => { if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình.'); };
async function rpc(fn, args) {
  need();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const normRoom = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');
export function publicUrl(path) {
  if (!path || !supabase) return '';
  return supabase.storage.from(CC_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ---------------- vé trên máy ---------------- */
const tokKey = (room) => `cc_token_${room}`;
export function savedToken(room) { try { return localStorage.getItem(tokKey(room)) || null; } catch { return null; } }
export function saveToken(room, t) { try { localStorage.setItem(tokKey(room), t); localStorage.setItem('cc_last_room', room); } catch { /* ignore */ } }
export function forgetToken(room) { try { localStorage.removeItem(tokKey(room)); } catch { /* ignore */ } }
export function lastRoom() { try { return localStorage.getItem('cc_last_room') || ''; } catch { return ''; } }

/* ---------------- khách ---------------- */
export async function ccJoin(room, name, color, token = null) {
  const d = await rpc('cc_join', { p_room: room, p_name: name, p_color: color, p_token: token });
  saveToken(d.room, d.token);
  return d;
}
export const ccState = (room, token) => rpc('cc_state', { p_room: room, p_token: token || null });
export const ccAnswer = (room, token, choice) => rpc('cc_answer', { p_room: room, p_token: token, p_choice: choice });
export const ccDrawBrand = (room, token) => rpc('cc_draw_brand', { p_room: room, p_token: token });
export const ccWall = (room, token) => rpc('cc_wall', { p_room: room, p_token: token || null });
export const ccHeart = (room, token, artId) => rpc('cc_heart', { p_room: room, p_token: token, p_art: artId });
export const ccWord = (room, token, word) => rpc('cc_word', { p_room: room, p_token: token, p_word: word });

const rid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
function dataUrlToFile(dataUrl, name) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
// src: File (ảnh chụp tranh giấy) hoặc dataURL (tranh vẽ trên điện thoại)
export async function ccSubmitArt(room, token, src, { title, caption, brand }) {
  need();
  let file = typeof src === 'string' ? dataUrlToFile(src, 'drawing.png') : src;
  file = await shrinkImage(file, 1400, 0.82);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `art/${room}/${rid()}.${ext}`;
  const { error } = await supabase.storage.from(CC_BUCKET).upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  return rpc('cc_submit_art', { p_room: room, p_token: token, p_path: path, p_title: title || '', p_caption: caption || '', p_brand: brand || '' });
}

/* ---------------- realtime ping ---------------- */
// Trả về { ping(), close() }. Điện thoại nghe "sync" để hỏi lại trạng thái ngay.
export function ccChannel(room, onSync) {
  if (!isSupabaseConfigured || !supabase || typeof supabase.channel !== 'function') return { ping() {}, close() {} };
  let ch = null; let ready = false;
  try {
    ch = supabase.channel(`cc-${room}`, { config: { broadcast: { self: false, ack: false } } });
    ch.on('broadcast', { event: 'sync' }, (m) => { if (onSync) onSync(m?.payload || {}); });
    ch.subscribe((s) => { ready = s === 'SUBSCRIBED'; });
  } catch { return { ping() {}, close() {} }; }
  return {
    ping(payload = {}) { if (ready) ch.send({ type: 'broadcast', event: 'sync', payload }).catch(() => {}); },
    close() { try { supabase.removeChannel(ch); } catch { /* ignore */ } },
  };
}

/* ---------------- admin (màn chiếu) ---------------- */
async function q(p) { need(); const { data, error } = await p; if (error) throw error; return data; }
export const adminRooms = () => q(supabase.from('cc_rooms').select('*').order('created_at', { ascending: false }));
export const adminCreateRoom = (code, title) => q(supabase.from('cc_rooms').insert({ code: normRoom(code), title: title || 'Creative City' }).select().single());
export const adminUpdateRoom = (code, patch) => q(supabase.from('cc_rooms').update(patch).eq('code', code).select().single());
export const adminResetRoom = (code) => q(supabase.rpc('cc_admin_reset', { p_room: code }));
export const adminPlayers = (code) => q(supabase.from('cc_players').select('id,name,color,score,brand,joined_at,last_seen').eq('room', code).order('joined_at', { ascending: false }));
export const adminQuestions = () => q(supabase.from('cc_questions').select('*').order('sort').order('created_at'));
export const adminSaveQuestion = (row) => (row.id
  ? q(supabase.from('cc_questions').update({ question: row.question, opts: row.opts, ok: row.ok, sort: row.sort, active: row.active, image_path: row.image_path, builtin: row.builtin }).eq('id', row.id).select().single())
  : q(supabase.from('cc_questions').insert({ question: row.question, opts: row.opts, ok: row.ok, sort: row.sort, active: row.active, image_path: row.image_path || null, builtin: row.builtin || null }).select().single()));
export const adminDeleteQuestion = (id) => q(supabase.from('cc_questions').delete().eq('id', id));
export async function adminUploadQuizImage(file) {
  need();
  const small = await shrinkImage(file, 1600, 0.86);
  const ext = small.type === 'image/png' ? 'png' : small.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `quiz/${rid()}.${ext}`;
  const { error } = await supabase.storage.from(CC_BUCKET).upload(path, small, { upsert: false, contentType: small.type, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}
export const adminArt = (code) => q(supabase.from('cc_art').select('*').eq('room', code).order('created_at', { ascending: false }).limit(400));
export const adminSetArt = (id, status) => q(supabase.from('cc_art').update({ status }).eq('id', id));
export const adminBrands = () => q(supabase.from('cc_brands').select('*').order('sort'));
export const adminSaveBrand = (row, oldName) => (oldName
  ? q(supabase.from('cc_brands').update({ name: row.name, item: row.item, sort: row.sort, active: row.active }).eq('name', oldName))
  : q(supabase.from('cc_brands').insert({ name: row.name, item: row.item, sort: row.sort ?? 99, active: true })));
export const adminDeleteBrand = (name) => q(supabase.from('cc_brands').delete().eq('name', name));
export const adminClearWords = (code) => q(supabase.from('cc_words').delete().eq('room', code));
// Bắt đầu / lộ đáp án / bảng điểm theo giờ máy chủ (để điểm tính đúng dù đồng hồ máy chiếu lệch).
export const adminQuiz = (code, phase, index = null) => q(supabase.rpc('cc_admin_quiz', { p_room: code, p_phase: phase, p_index: index }));
// minutes = null -> tắt đồng hồ vẽ
export const adminDraw = (code, minutes) => q(supabase.rpc('cc_admin_draw', { p_room: code, p_minutes: minutes }));
