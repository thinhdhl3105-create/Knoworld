import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getAnonId } from './reviews';

// ---------------------------------------------------------------------------
// Hearts — thả tim cho video / student case study / câu hỏi / câu trả lời.
// Mỗi trình duyệt (anon_id) chỉ tim 1 lần cho mỗi mục; bấm lại để bỏ tim.
// target_type: 'content' | 'question' | 'answer'
// ---------------------------------------------------------------------------

// Lấy số tim + trạng thái đã tim cho một loạt id (gọi 1 lần cho cả trang).
// Trả về map: { [id]: { count, hearted } }
export async function fetchHeartMap(targetType, ids = []) {
  const map = {};
  if (!isSupabaseConfigured || !ids.length) return map;
  const { data, error } = await supabase.rpc('get_hearts', {
    p_target_type: targetType,
    p_target_ids: ids,
    p_anon_id: getAnonId(),
  });
  if (error || !data) return map;
  data.forEach((r) => {
    map[r.target_id] = { count: r.heart_count || 0, hearted: !!r.hearted };
  });
  return map;
}

// Bật/tắt tim. Trả về { count, hearted } sau khi đổi (hoặc null nếu lỗi).
export async function toggleHeart(targetType, id) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('toggle_heart', {
    p_target_type: targetType,
    p_target_id: id,
    p_anon_id: getAnonId(),
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { count: row.heart_count || 0, hearted: !!row.hearted };
}
