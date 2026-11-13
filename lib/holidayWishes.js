// v48: tường lời chúc ngày lễ (bảng holiday_wishes) + lời chúc tuỳ chỉnh (site_content 'holidays').
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadSiteContent, saveSiteContent } from './siteContent';
import { getAnonId } from './reviews';

export async function fetchWishes(key, limit = 60) {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('holiday_wishes')
    .select('id, name, message, created_at').eq('holiday_key', key)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) { console.warn('[holidays] wishes:', error.message); return []; }
  return data || [];
}

export async function addWish(key, name, message) {
  if (!isSupabaseConfigured) return { error: 'Supabase chưa được cấu hình.' };
  const row = { holiday_key: key, name: (name || '').trim().slice(0, 40) || 'Cư dân Knoworld', message: (message || '').trim().slice(0, 220) };
  try { row.anon_id = getAnonId(); } catch { /* ignore */ }
  const { data, error } = await supabase.from('holiday_wishes').insert(row).select('id, name, message, created_at').single();
  if (error) return { error: /row-level/i.test(error.message) ? 'Bạn đã gửi đủ 5 lời chúc cho dịp này rồi 💌' : error.message };
  return { data };
}

export async function deleteWish(id) {
  if (!isSupabaseConfigured) return { error: 'no supabase' };
  const { error } = await supabase.from('holiday_wishes').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export function subscribeWishes(key, onRow) {
  if (!isSupabaseConfigured) return () => {};
  const ch = supabase.channel('wishes-' + key)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'holiday_wishes', filter: `holiday_key=eq.${key}` }, (p) => onRow(p.new))
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
}

export const loadHolidaySettings = () => loadSiteContent('holidays');
export const saveHolidaySettings = (data) => saveSiteContent('holidays', data);
