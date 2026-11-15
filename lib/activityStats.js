import { supabase, isSupabaseConfigured } from './supabaseClient';

// ---------------------------------------------------------------------------
// v55: Số liệu "Activity over time" cho Dashboard (chỉ admin).
// Gọi RPC admin_activity_stats (migration_v55). Trả về { data, error }.
// data = { today, days: [...], periods: { 1|7|30|90: {cur, prev} }, growth, hours }
// ---------------------------------------------------------------------------
export async function fetchActivityStats(days = 180) {
  if (!isSupabaseConfigured) return { data: null, error: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('admin_activity_stats', { p_days: days });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
