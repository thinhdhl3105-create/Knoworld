import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// v22: Thống kê lượt xem từng nội dung (ghi bởi trackContentView trong reviews.js).
// days = 7 | 30 | null (toàn bộ). Trả về map { [content_id]: { views, viewers, last_viewed } }
// ---------------------------------------------------------------------------
export async function fetchViewStats(days = null) {
  if (!isSupabaseConfigured) return { data: {}, error: null };
  const { data, error } = await supabase.rpc('content_view_stats', { p_days: days });
  if (error) return { data: {}, error: error.message };
  const map = {};
  (data || []).forEach((r) => {
    map[r.content_id] = { views: r.views || 0, viewers: r.viewers || 0, last_viewed: r.last_viewed };
  });
  return { data: map, error: null };
}
