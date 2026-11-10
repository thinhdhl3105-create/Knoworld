// ---------------------------------------------------------------------------
// v36: Lưu tiến trình Knoworld Temple (công đức, đồ cúng…) lên Supabase.
// Cột site_visitors.temple (jsonb) — đọc/ghi qua RPC get_visitor_temple / set_visitor_temple
// theo anon_id của trình duyệt (giống nhân vật cư dân v33). Chưa chạy SQL thì chỉ lưu localStorage.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

export async function loadTempleRemote() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('get_visitor_temple', { p_anon_id: getAnonId() });
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

let timer = null;
let pending = null;
async function push() {
  const s = pending; pending = null; timer = null;
  if (!s || !isSupabaseConfigured) return;
  try {
    await supabase.rpc('set_visitor_temple', { p_anon_id: getAnonId(), p_state: s });
  } catch { /* chỉ lưu local */ }
}
// Gom nhiều lần gõ mõ thành 1 lần ghi (sau 1.5 giây yên lặng).
export function saveTempleRemote(state) {
  if (!isSupabaseConfigured) return;
  pending = JSON.parse(JSON.stringify(state));
  clearTimeout(timer);
  timer = setTimeout(push, 1500);
}
export function flushTempleRemote() {
  if (!pending) return;
  clearTimeout(timer);
  push();
}
